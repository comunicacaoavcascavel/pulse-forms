'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteFormAction(formId: string) {
  const supabase = await createClient();
  
  const { data: submissions } = await supabase.from('form_submissions').select('id').eq('form_id', formId);
  
  if (submissions && submissions.length > 0) {
    const subIds = submissions.map((s: any) => s.id);
    await supabase.from('form_answers').delete().in('submission_id', subIds);
    await supabase.from('form_submissions').delete().eq('form_id', formId);
  }

  await supabase.from('form_questions').delete().eq('form_id', formId);
  await supabase.from('form_sections').delete().eq('form_id', formId);
  await supabase.from('form_rules').delete().eq('form_id', formId);

  const { error } = await supabase.from('forms').delete().eq('id', formId);

  if (error) {
    console.error('Error deleting form:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function createFormAction(payload: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Insert form
  const { data: form, error: formError } = await supabase.from('forms').insert({
    title: payload.title,
    description: payload.description,
    slug: payload.slug,
    welcome_title: payload.welcome_title,
    welcome_text: payload.welcome_text,
    theme: payload.theme,
    folder_id: payload.folder_id,
    created_by: user.id,
  }).select().single();

  if (formError || !form) {
    return { success: false, error: formError?.message || 'Erro ao criar formulário' };
  }

  // Insert sections and questions
  if (payload.sections && payload.sections.length > 0) {
    for (const [sIndex, section] of payload.sections.entries()) {
      const { data: secData, error: secErr } = await supabase.from('form_sections').insert({
        form_id: form.id,
        title: section.title,
        description: section.description,
        order_index: sIndex + 1,
      }).select().single();

      if (secData && section.questions && section.questions.length > 0) {
        const questionsToInsert = section.questions.map((q: any, qIndex: number) => ({
          form_id: form.id,
          section_id: secData.id,
          label: q.label,
          type: q.type,
          options: q.options ? JSON.stringify(q.options) : null,
          is_required: q.required,
          order_index: qIndex + 1,
        }));

        // Insert and get back IDs isn't straightforward without a loop if we need mapping.
        // Wait, rules reference question_id! But question_id in the payload is a temp string `q-12345`.
        // To properly map rules to questions, we need the real DB IDs.
        const { data: insertedQuestions } = await supabase.from('form_questions').insert(questionsToInsert).select();
        
        // Map temp IDs to real IDs
        if (payload.rules && insertedQuestions) {
          payload.rules.forEach((rule: any) => {
            // find which question label matches? The frontend temp ID isn't sent to DB.
            // Let's match by index/label for now, or just save the rule using the new ID.
            // A simple way: find the index of the rule's question_id in section.questions.
            const qIdx = section.questions.findIndex((sq: any) => sq.id === rule.question_id);
            if (qIdx !== -1 && insertedQuestions[qIdx]) {
              rule.real_question_id = insertedQuestions[qIdx].id;
              rule.real_section_id = secData.id;
            }
          });
        }
      }
    }
  }

  // Insert rules
  if (payload.rules && payload.rules.length > 0) {
    const rulesToInsert = payload.rules.filter((r: any) => r.real_question_id).map((r: any) => ({
      form_id: form.id,
      section_id: r.real_section_id,
      question_id: r.real_question_id,
      rule_type: r.type,
      condition: { value: r.condition_value },
      action: { block: true },
      message: r.message
    }));
    if (rulesToInsert.length > 0) {
      await supabase.from('form_rules').insert(rulesToInsert);
    }
  }

  // Insert AI evaluation rules
  if (payload.aiRules && payload.aiRules.length > 0) {
    const aiRulesToInsert = payload.aiRules.map((ar: any) => ({
      form_id: form.id,
      name: ar.name,
      description: ar.description,
      criteria: ar.criteria || [],
      max_score: ar.max_score || 20,
      active: ar.active !== false,
      created_by: user.id
    }));
    await supabase.from('ai_evaluation_rules').insert(aiRulesToInsert);
  }

  revalidatePath('/admin');
  return { success: true, formId: form.id };
}

export async function createFolderAction(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  const { data, error } = await supabase.from('form_folders').insert({
    name,
    created_by: user.id
  }).select().single();

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/admin');
  return { success: true, folder: data };
}

export async function updateFormAction(formId: string, payload: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Update form basics
  const { error: formError } = await supabase.from('forms').update({
    title: payload.title,
    description: payload.description,
    slug: payload.slug,
    folder_id: payload.folder_id,
    welcome_title: payload.welcome_title,
    welcome_text: payload.welcome_text,
    theme: payload.theme,
    updated_at: new Date().toISOString()
  }).eq('id', formId);

  if (formError) return { success: false, error: formError.message };

  // Delete old rules, questions, sections
  await supabase.from('form_rules').delete().eq('form_id', formId);
  await supabase.from('ai_evaluation_rules').delete().eq('form_id', formId);
  await supabase.from('form_questions').delete().eq('form_id', formId);
  await supabase.from('form_sections').delete().eq('form_id', formId);

  // Insert new sections and questions (same logic as createFormAction)
  if (payload.sections && payload.sections.length > 0) {
    for (const [sIndex, section] of payload.sections.entries()) {
      const { data: secData } = await supabase.from('form_sections').insert({
        form_id: formId,
        title: section.title,
        description: section.description,
        order_index: sIndex + 1,
      }).select().single();

      if (secData && section.questions && section.questions.length > 0) {
        const questionsToInsert = section.questions.map((q: any, qIndex: number) => ({
          form_id: formId,
          section_id: secData.id,
          label: q.label,
          type: q.type,
          options: q.options ? JSON.stringify(q.options) : null,
          is_required: q.required,
          order_index: qIndex + 1,
        }));

        const { data: insertedQuestions } = await supabase.from('form_questions').insert(questionsToInsert).select();
        
        if (payload.rules && insertedQuestions) {
          payload.rules.forEach((rule: any) => {
            const qIdx = section.questions.findIndex((sq: any) => sq.id === rule.question_id);
            if (qIdx !== -1 && insertedQuestions[qIdx]) {
              rule.real_question_id = insertedQuestions[qIdx].id;
              rule.real_section_id = secData.id;
            }
          });
        }
      }
    }
  }

  // Insert rules
  if (payload.rules && payload.rules.length > 0) {
    const rulesToInsert = payload.rules.filter((r: any) => r.real_question_id).map((r: any) => ({
      form_id: formId,
      section_id: r.real_section_id,
      question_id: r.real_question_id,
      rule_type: r.type,
      condition: { value: r.condition_value },
      action: { block: true },
      message: r.message
    }));
    if (rulesToInsert.length > 0) {
      await supabase.from('form_rules').insert(rulesToInsert);
    }
  }

  // Insert AI evaluation rules
  if (payload.aiRules && payload.aiRules.length > 0) {
    const aiRulesToInsert = payload.aiRules.map((ar: any) => ({
      form_id: formId,
      name: ar.name,
      description: ar.description,
      criteria: ar.criteria || [],
      max_score: ar.max_score || 20,
      active: ar.active !== false,
      created_by: user.id
    }));
    await supabase.from('ai_evaluation_rules').insert(aiRulesToInsert);
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function deleteFolderAction(folderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: forms } = await supabase.from('forms').select('id').eq('folder_id', folderId);
  
  if (forms && forms.length > 0) {
    for (const form of forms) {
      await deleteFormAction(form.id);
    }
  }

  const { error } = await supabase.from('form_folders').delete().eq('id', folderId);
  if (error) return { success: false, error: error.message };
  
  revalidatePath('/admin');
  return { success: true };
}

export async function moveFormAction(formId: string, folderId: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { error } = await supabase.from('forms').update({ folder_id: folderId }).eq('id', formId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  return { success: true };
}

export async function saveManualReviewAction(submissionId: string, comments: string, recommendation: string, scores: any = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Fetch the submission to get form_id for path revalidation
  const { data: submission } = await supabase
    .from('form_submissions')
    .select('form_id')
    .eq('id', submissionId)
    .single();

  if (!submission) return { success: false, error: 'Submissão não encontrada' };

  // Check if manual review already exists
  const { data: existing } = await supabase
    .from('manual_reviews')
    .select('id')
    .eq('submission_id', submissionId)
    .maybeSingle();

  let reviewError = null;

  if (existing) {
    const { error } = await supabase
      .from('manual_reviews')
      .update({
        comments,
        recommendation,
        scores,
        reviewer_id: user.id
      })
      .eq('id', existing.id);
    reviewError = error;
  } else {
    const { error } = await supabase
      .from('manual_reviews')
      .insert({
        submission_id: submissionId,
        comments,
        recommendation,
        scores,
        reviewer_id: user.id
      });
    reviewError = error;
  }

  if (reviewError) {
    console.error('Error saving manual review:', reviewError);
    return { success: false, error: reviewError.message };
  }

  // Update submission status based on manual review recommendation
  let newStatus = 'under_review';
  if (recommendation === 'approved') newStatus = 'approved';
  else if (recommendation === 'rejected') newStatus = 'rejected';

  const { error: subUpdateErr } = await supabase
    .from('form_submissions')
    .update({ status: newStatus })
    .eq('id', submissionId);

  if (subUpdateErr) {
    console.error('Error updating submission status:', subUpdateErr);
  }

  revalidatePath(`/admin/forms/${submission.form_id}/submissions/${submissionId}`);
  return { success: true };
}

export async function createUserAction(email: string, name: string, role: string) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, error: 'Unauthorized' };

  // Check if current user is super_admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (currentProfile?.role !== 'super_admin') {
    return { success: false, error: 'Apenas Super Admins podem gerenciar usuários.' };
  }

  // Create user in Supabase Auth
  // We can sign them up with a default password. They can reset it or log in with it.
  const tempPassword = 'PulseForms2026!';
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: tempPassword,
    options: {
      data: {
        role,
        name
      }
    }
  });

  if (authError) {
    console.error('Error signing up user:', authError);
    return { success: false, error: authError.message };
  }

  const newAuthUser = authData.user;
  if (!newAuthUser) {
    return { success: false, error: 'Erro ao registrar usuário na autenticação.' };
  }

  // Insert profile row
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: newAuthUser.id,
      email,
      name,
      role
    });

  if (profileError) {
    console.error('Error inserting user profile:', profileError);
    return { success: false, error: profileError.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

export async function updateUserRoleAction(userId: string, role: string) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, error: 'Unauthorized' };

  // Check if current user is super_admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (currentProfile?.role !== 'super_admin') {
    return { success: false, error: 'Apenas Super Admins podem gerenciar usuários.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/users');
  return { success: true };
}

export async function deleteUserAction(userId: string) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, error: 'Unauthorized' };

  // Check if current user is super_admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (currentProfile?.role !== 'super_admin') {
    return { success: false, error: 'Apenas Super Admins podem gerenciar usuários.' };
  }

  if (userId === currentUser.id) {
    return { success: false, error: 'Você não pode excluir seu próprio usuário.' };
  }

  // Deleting the profile row. (auth.users row can be deleted from the Supabase panel or handled by CASCADE if configured,
  // but deleting the profile row revokes their custom role access and removes them from listing).
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/users');
  return { success: true };
}
