import { FormBuilder } from '@/components/admin/FormBuilder';
import { createClient } from '@/utils/supabase/server';
import { requireTenantEditor, tenantAdminPath } from '@/lib/tenancy';
import { redirect } from 'next/navigation';

export default async function EditTenantFormPage(props: { params: Promise<{ tenantSlug: string; id: string }> }) {
  const { tenantSlug, id } = await props.params;
  const context = await requireTenantEditor(tenantSlug);
  const supabase = await createClient();

  const { data: folders } = await supabase
    .from('form_folders')
    .select('*')
    .eq('tenant_id', context.tenant.id)
    .order('name');

  const { data: form, error } = await supabase
    .from('forms')
    .select(`
      *,
      sections:form_sections(
        *,
        questions:form_questions(*)
      ),
      rules:form_rules(*),
      ai_evaluation_rules(*)
    `)
    .eq('tenant_id', context.tenant.id)
    .eq('id', id)
    .single();

  if (error || !form) {
    redirect(tenantAdminPath(tenantSlug));
  }

  const formattedSections = form.sections
    ?.sort((a: any, b: any) => a.order_index - b.order_index)
    .map((section: any) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      questions: section.questions
        ?.sort((a: any, b: any) => a.order_index - b.order_index)
        .map((question: any) => ({
          id: question.id,
          label: question.label,
          type: question.type,
          options: question.options ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options) : [],
          required: question.is_required,
        })),
    })) || [];

  const formattedRules = form.rules?.map((rule: any) => ({
    id: rule.id,
    type: rule.rule_type,
    question_id: rule.question_id,
    condition_value: rule.condition?.value || '',
    message: rule.message,
  })) || [];

  const formattedAiRules = form.ai_evaluation_rules?.map((rule: any) => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    criteria: rule.criteria || [],
    max_score: rule.max_score,
    active: rule.active,
  })) || [];

  const initialData = {
    id: form.id,
    title: form.title,
    description: form.description,
    slug: form.slug,
    status: form.status,
    folder_id: form.folder_id,
    welcome_title: form.welcome_title,
    welcome_text: form.welcome_text,
    theme: form.theme,
    review_criteria: form.review_criteria,
    sections: formattedSections,
    rules: formattedRules,
    aiRules: formattedAiRules,
  };

  return (
    <div className="zalen-page min-h-screen p-6 md:p-10 relative pt-24 md:pt-10">
      <header className="mb-10 max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Editar Formulário</h1>
          <p className="text-muted mt-2 text-sm">Altere as informações, seções e regras deste formulário.</p>
        </div>
      </header>

      <FormBuilder
        folders={folders || []}
        initialData={initialData}
        tenantId={context.tenant.id}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}
