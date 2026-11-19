import 'server-only';

import { createAdminClient } from '@/utils/supabase/admin';
import { evaluateFormAnswers } from '@/lib/evaluateFormAnswers';

export async function runAiEvaluation(submissionId: string) {
  const supabase = createAdminClient();

  const { data: submission, error: subErr } = await supabase
    .from('form_submissions')
    .select('*, forms(*)')
    .eq('id', submissionId)
    .single();

  if (subErr || !submission) {
    console.error('AI Eval: Submission not found', subErr);
    return { success: false, error: 'Submissão não encontrada' };
  }

  const form = submission.forms;
  if (!form) {
    return { success: false, error: 'Formulário não associado' };
  }

  const { data: answers, error: ansErr } = await supabase
    .from('form_answers')
    .select('*, form_questions(label, type)')
    .eq('tenant_id', submission.tenant_id)
    .eq('submission_id', submissionId);

  if (ansErr || !answers) {
    console.error('AI Eval: Error loading answers', ansErr);
    return { success: false, error: 'Erro ao carregar respostas' };
  }

  const formattedAnswersText = answers.map((answer: any, index: number) => {
    const label = answer.form_questions?.label || `Questão ${index + 1}`;
    const value = answer.answer_text || JSON.stringify(answer.answer_json);
    return `[${label}]: ${value}`;
  }).join('\n\n');

  const result = await evaluateFormAnswers(submission.tenant_id, form.id, formattedAnswersText);
  if (!('evaluationResult' in result)) return result;
  const { evaluationResult, ruleId } = result;

  await supabase
    .from('ai_evaluations')
    .delete()
    .eq('tenant_id', submission.tenant_id)
    .eq('submission_id', submissionId);

  const { data: insertedEval, error: insertErr } = await supabase
    .from('ai_evaluations')
    .insert({
      tenant_id: submission.tenant_id,
      submission_id: submissionId,
      rule_id: ruleId,
      total_score: evaluationResult.totalScore,
      summary: evaluationResult.summary,
      strengths: evaluationResult.strengths,
      concerns: evaluationResult.concerns,
      recommendation: evaluationResult.recommendation,
      raw_result: evaluationResult,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('AI Eval: Error saving evaluation', insertErr);
    return { success: false, error: 'Erro ao salvar avaliação por IA' };
  }

  return { success: true, evaluation: insertedEval };
}
