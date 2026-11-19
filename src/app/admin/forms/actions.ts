'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient, hasServiceRoleKey } from '@/utils/supabase/admin';
import { ensureProfile, isPlatformOwner, tenantAdminPath } from '@/lib/tenancy';
import type { TenantRole } from '@/types/tenant';
import { revalidatePath } from 'next/cache';
import nodeCrypto from 'crypto';

const EDIT_ROLES: TenantRole[] = ['owner', 'admin', 'editor'];
const MANAGE_ROLES: TenantRole[] = ['owner', 'admin'];
const REVIEW_ROLES: TenantRole[] = ['owner', 'admin', 'reviewer'];
const VALID_ROLES: TenantRole[] = ['owner', 'admin', 'editor', 'reviewer'];

type ActionAuth = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  isPlatformOwner: boolean;
  membershipRole: TenantRole | null;
};

async function requireTenantRoleAction(tenantId: string, allowedRoles: TenantRole[]): Promise<ActionAuth | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const profile = await ensureProfile(supabase, user);
  const platformOwner = isPlatformOwner(profile, user);

  const { data: membership } = await supabase
    .from('tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle();

  const membershipRole = membership?.role as TenantRole | null;

  if (!platformOwner && (!membershipRole || !allowedRoles.includes(membershipRole))) {
    return { error: 'Sem permissão para executar esta ação.' };
  }

  return {
    supabase,
    userId: user.id,
    isPlatformOwner: platformOwner,
    membershipRole,
  };
}

function revalidateTenantAdmin(tenantSlug?: string) {
  revalidatePath('/admin');
  revalidatePath('/tenants');
  if (tenantSlug) {
    revalidatePath(tenantAdminPath(tenantSlug));
  }
}

export async function deleteFormAction(formId: string, tenantId: string, tenantSlug?: string) {
  const auth = await requireTenantRoleAction(tenantId, EDIT_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const { supabase } = auth;
  const { data: submissions } = await supabase
    .from('form_submissions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('form_id', formId);

  if (submissions && submissions.length > 0) {
    const subIds = submissions.map((submission: { id: string }) => submission.id);
    await supabase.from('submission_files').delete().in('submission_id', subIds).eq('tenant_id', tenantId);
    await supabase.from('manual_reviews').delete().in('submission_id', subIds).eq('tenant_id', tenantId);
    await supabase.from('ai_evaluations').delete().in('submission_id', subIds).eq('tenant_id', tenantId);
    await supabase.from('form_answers').delete().in('submission_id', subIds).eq('tenant_id', tenantId);
    await supabase.from('form_submissions').delete().eq('tenant_id', tenantId).eq('form_id', formId);
  }

  await supabase.from('ai_evaluation_rules').delete().eq('tenant_id', tenantId).eq('form_id', formId);
  await supabase.from('form_rules').delete().eq('tenant_id', tenantId).eq('form_id', formId);
  await supabase.from('form_questions').delete().eq('tenant_id', tenantId).eq('form_id', formId);
  await supabase.from('form_sections').delete().eq('tenant_id', tenantId).eq('form_id', formId);

  const { error } = await supabase
    .from('forms')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', formId);

  if (error) {
    console.error('Error deleting form:', error);
    return { success: false, error: error.message };
  }

  revalidateTenantAdmin(tenantSlug);
  return { success: true };
}

export async function createFormAction(payload: any, tenantId: string, tenantSlug?: string) {
  const auth = await requireTenantRoleAction(tenantId, EDIT_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const { supabase, userId } = auth;
  const { data: form, error: formError } = await supabase.from('forms').insert({
    tenant_id: tenantId,
    title: payload.title,
    description: payload.description,
    slug: payload.slug,
    status: payload.status,
    welcome_title: payload.welcome_title,
    welcome_text: payload.welcome_text,
    theme: payload.theme,
    folder_id: payload.folder_id,
    review_criteria: payload.review_criteria,
    created_by: userId,
  }).select().single();

  if (formError || !form) {
    return { success: false, error: formError?.message || 'Erro ao criar formulário' };
  }

  if (payload.sections?.length > 0) {
    for (const [sectionIndex, section] of payload.sections.entries()) {
      const { data: secData } = await supabase.from('form_sections').insert({
        tenant_id: tenantId,
        form_id: form.id,
        title: section.title,
        description: section.description,
        order_index: sectionIndex + 1,
      }).select().single();

      if (secData && section.questions?.length > 0) {
        const questionsToInsert = section.questions.map((question: any, questionIndex: number) => ({
          tenant_id: tenantId,
          form_id: form.id,
          section_id: secData.id,
          label: question.label,
          type: question.type,
          options: question.options ? JSON.stringify(question.options) : null,
          is_required: question.required,
          order_index: questionIndex + 1,
        }));

        const { data: insertedQuestions } = await supabase
          .from('form_questions')
          .insert(questionsToInsert)
          .select();

        if (payload.rules && insertedQuestions) {
          payload.rules.forEach((rule: any) => {
            const questionIndex = section.questions.findIndex((sectionQuestion: any) => sectionQuestion.id === rule.question_id);
            if (questionIndex !== -1 && insertedQuestions[questionIndex]) {
              rule.real_question_id = insertedQuestions[questionIndex].id;
              rule.real_section_id = secData.id;
            }
          });
        }
      }
    }
  }

  if (payload.rules?.length > 0) {
    const rulesToInsert = payload.rules.filter((rule: any) => rule.real_question_id).map((rule: any) => ({
      tenant_id: tenantId,
      form_id: form.id,
      section_id: rule.real_section_id,
      question_id: rule.real_question_id,
      rule_type: rule.type,
      condition: { value: rule.condition_value },
      action: { block: true },
      message: rule.message,
    }));

    if (rulesToInsert.length > 0) {
      await supabase.from('form_rules').insert(rulesToInsert);
    }
  }

  if (payload.aiRules?.length > 0) {
    const aiRulesToInsert = payload.aiRules.map((rule: any) => ({
      tenant_id: tenantId,
      form_id: form.id,
      name: rule.name,
      description: rule.description,
      criteria: rule.criteria || [],
      max_score: rule.max_score || 20,
      active: rule.active !== false,
      created_by: userId,
    }));
    await supabase.from('ai_evaluation_rules').insert(aiRulesToInsert);
  }

  revalidateTenantAdmin(tenantSlug);
  return { success: true, formId: form.id };
}

export async function createFolderAction(name: string, tenantId: string, tenantSlug?: string) {
  const auth = await requireTenantRoleAction(tenantId, EDIT_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase.from('form_folders').insert({
    tenant_id: tenantId,
    name,
    created_by: auth.userId,
  }).select().single();

  if (error) return { success: false, error: error.message };

  revalidateTenantAdmin(tenantSlug);
  return { success: true, folder: data };
}

export async function updateFormAction(formId: string, payload: any, tenantId: string, tenantSlug?: string) {
  const auth = await requireTenantRoleAction(tenantId, EDIT_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const { supabase, userId } = auth;
  const { error: formError } = await supabase.from('forms').update({
    title: payload.title,
    description: payload.description,
    slug: payload.slug,
    status: payload.status,
    folder_id: payload.folder_id,
    welcome_title: payload.welcome_title,
    welcome_text: payload.welcome_text,
    theme: payload.theme,
    review_criteria: payload.review_criteria,
    updated_at: new Date().toISOString(),
  }).eq('tenant_id', tenantId).eq('id', formId);

  if (formError) return { success: false, error: formError.message };

  await supabase.from('form_rules').delete().eq('tenant_id', tenantId).eq('form_id', formId);
  await supabase.from('ai_evaluation_rules').delete().eq('tenant_id', tenantId).eq('form_id', formId);
  await supabase.from('form_questions').delete().eq('tenant_id', tenantId).eq('form_id', formId);
  await supabase.from('form_sections').delete().eq('tenant_id', tenantId).eq('form_id', formId);

  if (payload.sections?.length > 0) {
    for (const [sectionIndex, section] of payload.sections.entries()) {
      const { data: secData } = await supabase.from('form_sections').insert({
        tenant_id: tenantId,
        form_id: formId,
        title: section.title,
        description: section.description,
        order_index: sectionIndex + 1,
      }).select().single();

      if (secData && section.questions?.length > 0) {
        const questionsToInsert = section.questions.map((question: any, questionIndex: number) => ({
          tenant_id: tenantId,
          form_id: formId,
          section_id: secData.id,
          label: question.label,
          type: question.type,
          options: question.options ? JSON.stringify(question.options) : null,
          is_required: question.required,
          order_index: questionIndex + 1,
        }));

        const { data: insertedQuestions } = await supabase
          .from('form_questions')
          .insert(questionsToInsert)
          .select();

        if (payload.rules && insertedQuestions) {
          payload.rules.forEach((rule: any) => {
            const questionIndex = section.questions.findIndex((sectionQuestion: any) => sectionQuestion.id === rule.question_id);
            if (questionIndex !== -1 && insertedQuestions[questionIndex]) {
              rule.real_question_id = insertedQuestions[questionIndex].id;
              rule.real_section_id = secData.id;
            }
          });
        }
      }
    }
  }

  if (payload.rules?.length > 0) {
    const rulesToInsert = payload.rules.filter((rule: any) => rule.real_question_id).map((rule: any) => ({
      tenant_id: tenantId,
      form_id: formId,
      section_id: rule.real_section_id,
      question_id: rule.real_question_id,
      rule_type: rule.type,
      condition: { value: rule.condition_value },
      action: { block: true },
      message: rule.message,
    }));

    if (rulesToInsert.length > 0) {
      await supabase.from('form_rules').insert(rulesToInsert);
    }
  }

  if (payload.aiRules?.length > 0) {
    const aiRulesToInsert = payload.aiRules.map((rule: any) => ({
      tenant_id: tenantId,
      form_id: formId,
      name: rule.name,
      description: rule.description,
      criteria: rule.criteria || [],
      max_score: rule.max_score || 20,
      active: rule.active !== false,
      created_by: userId,
    }));
    await supabase.from('ai_evaluation_rules').insert(aiRulesToInsert);
  }

  revalidateTenantAdmin(tenantSlug);
  return { success: true };
}

export async function deleteFolderAction(folderId: string, tenantId: string, tenantSlug?: string) {
  const auth = await requireTenantRoleAction(tenantId, EDIT_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const { data: forms } = await auth.supabase
    .from('forms')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('folder_id', folderId);

  if (forms && forms.length > 0) {
    for (const form of forms) {
      await deleteFormAction(form.id, tenantId, tenantSlug);
    }
  }

  const { error } = await auth.supabase
    .from('form_folders')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', folderId);

  if (error) return { success: false, error: error.message };

  revalidateTenantAdmin(tenantSlug);
  return { success: true };
}

export async function moveFormAction(formId: string, folderId: string | null, tenantId: string, tenantSlug?: string) {
  const auth = await requireTenantRoleAction(tenantId, EDIT_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from('forms')
    .update({ folder_id: folderId })
    .eq('tenant_id', tenantId)
    .eq('id', formId);

  if (error) return { success: false, error: error.message };

  revalidateTenantAdmin(tenantSlug);
  return { success: true };
}

export async function updateSubmissionStatusAction(submissionId: string, status: string, tenantId: string, tenantSlug?: string) {
  const auth = await requireTenantRoleAction(tenantId, REVIEW_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .from('form_submissions')
    .update({ status })
    .eq('tenant_id', tenantId)
    .eq('id', submissionId);

  if (error) return { success: false, error: error.message };

  revalidateTenantAdmin(tenantSlug);
  return { success: true };
}

export async function saveManualReviewAction(
  submissionId: string,
  comments: string,
  recommendation: string,
  scores: any = {},
  tenantId: string,
  tenantSlug?: string,
) {
  const auth = await requireTenantRoleAction(tenantId, REVIEW_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const { supabase, userId } = auth;
  const { data: submission } = await supabase
    .from('form_submissions')
    .select('id, form_id')
    .eq('tenant_id', tenantId)
    .eq('id', submissionId)
    .single();

  if (!submission) return { success: false, error: 'Submissão não encontrada' };

  const { data: existing } = await supabase
    .from('manual_reviews')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('submission_id', submissionId)
    .maybeSingle();

  const payload = {
    tenant_id: tenantId,
    submission_id: submissionId,
    comments,
    recommendation,
    scores,
    reviewer_id: userId,
  };

  const { error: reviewError } = existing
    ? await supabase.from('manual_reviews').update(payload).eq('tenant_id', tenantId).eq('id', existing.id)
    : await supabase.from('manual_reviews').insert(payload);

  if (reviewError) {
    console.error('Error saving manual review:', reviewError);
    return { success: false, error: reviewError.message };
  }

  let newStatus = 'under_review';
  if (recommendation === 'approved') newStatus = 'approved';
  else if (recommendation === 'rejected') newStatus = 'rejected';

  await supabase
    .from('form_submissions')
    .update({ status: newStatus })
    .eq('tenant_id', tenantId)
    .eq('id', submissionId);

  if (tenantSlug) {
    revalidatePath(`${tenantAdminPath(tenantSlug)}/forms/${submission.form_id}/submissions/${submissionId}`);
  }
  return { success: true };
}

export async function createUserAction(
  tenantId: string,
  email: string,
  name: string,
  role: TenantRole,
  password?: string,
  tenantSlug?: string,
) {
  const auth = await requireTenantRoleAction(tenantId, MANAGE_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };
  if (!VALID_ROLES.includes(role)) return { success: false, error: 'Papel inválido.' };
  if (!hasServiceRoleKey()) return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' };

  const admin = createAdminClient();
  const finalPassword = password || cryptoRandomPassword();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true,
    user_metadata: { name },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || 'Erro ao criar usuário.' };
  }

  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: authData.user.id,
      email,
      name,
      role,
      platform_role: 'member',
    });

  if (profileError) return { success: false, error: profileError.message };

  const { error: membershipError } = await admin
    .from('tenant_memberships')
    .upsert({
      tenant_id: tenantId,
      user_id: authData.user.id,
      role,
    }, { onConflict: 'tenant_id,user_id' });

  if (membershipError) return { success: false, error: membershipError.message };

  if (tenantSlug) revalidatePath(`${tenantAdminPath(tenantSlug)}/users`);
  return { success: true, temporaryPassword: finalPassword };
}

export async function updateUserRoleAction(tenantId: string, userId: string, role: TenantRole, tenantSlug?: string) {
  const auth = await requireTenantRoleAction(tenantId, MANAGE_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };
  if (!VALID_ROLES.includes(role)) return { success: false, error: 'Papel inválido.' };
  if (!hasServiceRoleKey()) return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('tenant_memberships')
    .update({ role })
    .eq('tenant_id', tenantId)
    .eq('user_id', userId);

  if (error) return { success: false, error: error.message };

  await admin.from('profiles').update({ role }).eq('id', userId);
  if (tenantSlug) revalidatePath(`${tenantAdminPath(tenantSlug)}/users`);
  return { success: true };
}

export async function deleteUserAction(tenantId: string, userId: string, tenantSlug?: string) {
  const auth = await requireTenantRoleAction(tenantId, MANAGE_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  if (userId === auth.userId) {
    return { success: false, error: 'Você não pode remover a si mesmo deste tenant.' };
  }

  if (!hasServiceRoleKey()) return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' };

  const { error } = await createAdminClient()
    .from('tenant_memberships')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', userId);

  if (error) return { success: false, error: error.message };

  if (tenantSlug) revalidatePath(`${tenantAdminPath(tenantSlug)}/users`);
  return { success: true };
}

function cryptoRandomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = nodeCrypto.randomBytes(14);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
