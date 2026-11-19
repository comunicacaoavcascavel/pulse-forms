import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { evaluateFormAnswers } from '@/lib/evaluateFormAnswers';
import { createAdminClient } from '@/utils/supabase/admin';

const tenantSlug = 'in-pulse-college';
const uuidPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;

async function authorized(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ') || authorization.length > 512) return false;
  const secret = process.env.PULSE_COLLEGE_INTEGRATION_SECRET
    || (await createAdminClient().rpc('college_forms_integration_secret')).data;
  if (typeof secret !== 'string' || secret.length < 32) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(authorization), digest('Bearer ' + secret));
}

async function collegeTenant(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase.from('tenants').select('id')
    .eq('slug', tenantSlug).eq('status', 'active').maybeSingle();
  if (error) throw error;
  return data?.id;
}

export async function GET(request: Request) {
  if (!(await authorized(request).catch(() => false))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
  try {
    const supabase = createAdminClient();
    const tenantId = await collegeTenant(supabase);
    if (!tenantId) return NextResponse.json({ error: 'College indisponível.' }, { status: 404 });
    const { data, error } = await supabase.from('forms')
      .select('id, title, slug, form_rules(id), form_sections(id, title, description, order_index, form_questions(id, label, description, type, options, is_required, order_index))')
      .eq('tenant_id', tenantId).eq('status', 'published').order('title');
    if (error) throw error;
    const catalog = data.map(form => ({
      id: form.id,
      title: form.title,
      slug: form.slug,
      hasRules: form.form_rules.length > 0,
      sections: form.form_sections.sort((a, b) => a.order_index - b.order_index).map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        questions: section.form_questions.sort((a, b) => a.order_index - b.order_index).map(question => ({
          id: question.id,
          label: question.label,
          description: question.description,
          type: question.type,
          required: question.is_required,
          options: optionsArray(question.options),
        })),
      })),
    }));
    return NextResponse.json({ catalog });
  } catch {
    return NextResponse.json({ error: 'Não foi possível consultar o Forms.' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!(await authorized(request).catch(() => false))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
  const input = await request.json().catch(() => null);
  if (!isAssessmentRequest(input)) {
    return NextResponse.json({ error: 'Entrevista inválida.' }, { status: 400 });
  }
  try {
    const supabase = createAdminClient();
    const tenantId = await collegeTenant(supabase);
    if (!tenantId) return NextResponse.json({ error: 'College indisponível.' }, { status: 404 });
    const { data: form, error } = await supabase.from('forms').select('id')
      .eq('tenant_id', tenantId).eq('id', input.formId).maybeSingle();
    if (error) throw error;
    if (!form) return NextResponse.json({ error: 'Questionário indisponível.' }, { status: 404 });
    const result = await evaluateFormAnswers(tenantId, form.id, JSON.stringify(input.answers), true);
    if (!('assessment' in result)) {
      return NextResponse.json({ error: result.error || result.message || 'Avaliação indisponível.' }, { status: 422 });
    }
    return NextResponse.json({ assessment: result.assessment });
  } catch {
    return NextResponse.json({ error: 'Não foi possível concluir a avaliação.' }, { status: 502 });
  }
}

function optionsArray(value: unknown): string[] | undefined {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) && parsed.every(option => typeof option === 'string') ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isAssessmentRequest(value: unknown): value is {
  formId: string; answers: Array<{ question: string; answer: string }>;
} {
  if (!value || typeof value !== 'object' || !('formId' in value) || !('answers' in value)) return false;
  return typeof value.formId === 'string' && uuidPattern.test(value.formId)
    && Array.isArray(value.answers) && value.answers.length > 0 && value.answers.length <= 150
    && value.answers.every(item => item && typeof item.question === 'string' && item.question.length <= 500
      && typeof item.answer === 'string' && item.answer.length <= 8000)
    && JSON.stringify(value.answers).length <= 180000;
}
