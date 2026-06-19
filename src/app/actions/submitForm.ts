'use server';

import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { parseStorageValue } from '@/lib/storage';
import { runAiEvaluation } from './aiEvaluation';

const DEFAULT_PARTICIPANT_NAME = 'Sem Nome';
const DEFAULT_PARTICIPANT_EMAIL = 'sem@email.com';

type FormQuestion = {
  id: string;
  label: string | null;
  type: string;
};

type TenantInfo = {
  slug?: string | null;
  name?: string | null;
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function answerToText(value: any) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.filter(Boolean).join(', ').trim();
  if (value && typeof value === 'object') return JSON.stringify(value);
  return '';
}

function isStorageAnswer(value: string) {
  return value.startsWith('storage://');
}

function isEmailValue(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function looksLikeName(value: string) {
  if (!value || isStorageAnswer(value) || isEmailValue(value) || /^https?:\/\//i.test(value)) return false;
  if (looksLikePhone(value)) return false;
  return value.length >= 2 && value.length <= 140;
}

function isNameQuestion(question: FormQuestion) {
  const label = normalizeText(question.label || '');
  return (
    label.includes('nome completo')
    || label === 'nome'
    || label.includes('seu nome')
    || label.includes('name')
    || label.includes('candidato')
    || label.includes('participante')
    || label.includes('inscrito')
  );
}

function isEmailQuestion(question: FormQuestion) {
  const label = normalizeText(question.label || '');
  return question.type === 'email'
    || label.includes('email')
    || label.includes('e-mail')
    || label.includes('mail');
}

function isPhoneQuestion(question: FormQuestion) {
  const label = normalizeText(question.label || '');
  return question.type === 'phone'
    || label.includes('whatsapp')
    || label.includes('telefone')
    || label.includes('celular')
    || label.includes('phone');
}

function getTenantFromForm(form: any): TenantInfo {
  if (Array.isArray(form.tenants)) return form.tenants[0] || {};
  return form.tenants || {};
}

function tenantProtocolPrefix(tenant: TenantInfo) {
  const source = tenant.slug || tenant.name || 'zalen';
  const words = normalizeText(source)
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  const ignoredWords = new Set(['IN', 'PULSE', 'FORMS', 'FORM', 'ZALEN', 'IGREJA', 'CHURCH']);
  const preferredWord = [...words].reverse().find((word) => word.length >= 3 && !ignoredWords.has(word))
    || words.find((word) => word.length >= 3)
    || 'ZALEN';

  return preferredWord.slice(0, 12);
}

function extractParticipantData(questions: FormQuestion[] = [], payload: Record<string, any>) {
  let name = '';
  let email = '';
  let phone: string | null = null;
  let firstTextAnswer = '';

  for (const question of questions) {
    const answer = answerToText(payload[question.id]);
    if (!answer) continue;

    if (!firstTextAnswer && looksLikeName(answer)) firstTextAnswer = answer;

    if (!name && isNameQuestion(question) && looksLikeName(answer)) {
      name = answer;
      continue;
    }

    if (!email && isEmailQuestion(question) && isEmailValue(answer)) {
      email = answer;
      continue;
    }

    if (!phone && isPhoneQuestion(question) && looksLikePhone(answer)) {
      phone = answer;
    }
  }

  for (const rawAnswer of Object.values(payload)) {
    const answer = answerToText(rawAnswer);
    if (!answer) continue;

    if (!email && isEmailValue(answer)) email = answer;
    if (!phone && looksLikePhone(answer)) phone = answer;
    if (!name && looksLikeName(answer)) name = answer;
  }

  return {
    name: name || firstTextAnswer || DEFAULT_PARTICIPANT_NAME,
    email: email || DEFAULT_PARTICIPANT_EMAIL,
    phone,
  };
}

export async function submitFormAction(formId: string, payload: Record<string, any>) {
  const supabase = createAdminClient();

  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('id, tenant_id, status, tenants(slug, name)')
    .eq('id', formId)
    .eq('status', 'published')
    .single();

  if (formError || !form) {
    throw new Error('Formulário indisponível para envio.');
  }

  const { data: questions } = await supabase
    .from('form_questions')
    .select('id, label, type')
    .eq('tenant_id', form.tenant_id)
    .eq('form_id', formId)
    .order('order_index', { ascending: true });

  const { name, email, phone } = extractParticipantData(questions || [], payload);

  const { data: participant, error: participantError } = await supabase.from('participants').insert({
    tenant_id: form.tenant_id,
    name,
    email,
    phone,
  }).select().single();

  if (participantError || !participant) {
    console.error('Erro ao criar participante', participantError);
    throw new Error('Falha ao registrar participante');
  }

  const protocolPrefix = tenantProtocolPrefix(getTenantFromForm(form));
  const submissionNumber = `${protocolPrefix}-${crypto.randomInt(100000, 999999)}`;
  const { data: submission, error: submissionError } = await supabase.from('form_submissions').insert({
    tenant_id: form.tenant_id,
    form_id: formId,
    participant_id: participant.id,
    status: 'submitted',
    protocol_code: submissionNumber,
  }).select().single();

  if (submissionError || !submission) {
    console.error('Erro ao criar submission', submissionError);
    throw new Error('Falha ao salvar inscrição');
  }

  const answersToInsert = Object.keys(payload).map((questionId) => {
    const answerValue = payload[questionId];
    return {
      tenant_id: form.tenant_id,
      submission_id: submission.id,
      question_id: questionId,
      answer_text: typeof answerValue === 'string' ? answerValue : null,
      answer_json: typeof answerValue !== 'string' ? answerValue : null,
    };
  });

  if (answersToInsert.length > 0) {
    await supabase.from('form_answers').insert(answersToInsert);
  }

  type SubmissionFileInsert = {
    tenant_id: string;
    submission_id: string;
    question_id: string;
    file_type: string;
    storage_path: string;
    mime_type: string;
  };

  const filesToInsert: SubmissionFileInsert[] = Object.keys(payload)
    .flatMap((questionId) => {
      const answerValue = payload[questionId];
      const storage = typeof answerValue === 'string' ? parseStorageValue(answerValue) : null;
      if (!storage) return [];

      return [{
        tenant_id: form.tenant_id,
        submission_id: submission.id,
        question_id: questionId,
        file_type: 'video',
        storage_path: storage.path,
        mime_type: 'video/*',
      }];
    });

  if (filesToInsert.length > 0) {
    await supabase.from('submission_files').insert(filesToInsert);
  }

  try {
    await runAiEvaluation(submission.id);
  } catch (aiError) {
    console.error('Erro ao executar avaliação por IA:', aiError);
  }

  return { success: true, protocolNumber: submissionNumber };
}
