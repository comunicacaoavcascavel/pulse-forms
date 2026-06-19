'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { decryptSecret } from '@/lib/secretCrypto';

type AiProvider = 'gemini' | 'openai';

type AiSettings = {
  provider: AiProvider;
  model: string | null;
  encrypted_api_key: string | null;
  enabled: boolean | null;
};

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

  const { data: aiSettings } = await supabase
    .from('tenant_ai_settings')
    .select('provider, model, encrypted_api_key, enabled')
    .eq('tenant_id', submission.tenant_id)
    .maybeSingle<AiSettings>();

  if (!aiSettings?.enabled || !aiSettings.encrypted_api_key) {
    return { success: true, message: 'IA não configurada para este tenant.' };
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(aiSettings.encrypted_api_key);
  } catch (error) {
    console.error('AI Eval: Failed to decrypt tenant AI key', error);
    return { success: false, error: 'Chave de IA inválida.' };
  }

  const { data: aiRules, error: rulesErr } = await supabase
    .from('ai_evaluation_rules')
    .select('*')
    .eq('tenant_id', submission.tenant_id)
    .eq('form_id', form.id)
    .eq('active', true);

  if (rulesErr || !aiRules || aiRules.length === 0) {
    return { success: true, message: 'Nenhum critério ativo configurado.' };
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

  const formattedCriteria = aiRules.map((rule: any) => {
    const subCriteria = rule.criteria
      ? (typeof rule.criteria === 'string' ? JSON.parse(rule.criteria) : rule.criteria)
      : [];
    const subDetails = subCriteria.map((criterion: any) => `- ${criterion.name}: ${criterion.description}`).join('\n');
    return `Critério: ${rule.name} (Pontuação máxima: ${rule.max_score} pontos)
Descrição/Instruções: ${rule.description}
${subDetails ? `Sub-itens de observação:\n${subDetails}` : ''}`;
  }).join('\n\n---\n\n');

  const systemPrompt = `Você é um avaliador criterioso e compassivo para processos internos de seleção.
Você deve analisar a submissão de um candidato com base nos critérios configurados e emitir uma nota honesta e construtiva.

Instruções importantes:
1. Retorne APENAS um JSON no formato especificado abaixo.
2. Seja realista: se a resposta do candidato é curta ou evasiva, dê uma nota coerente com isso.
3. Seja cuidadoso: não invente fatos que não aparecem nas respostas.

Formato do JSON de resposta esperado:
{
  "scores": {
    "NOME_DO_CRITERIO_1": NOTA_NUMERICA,
    "NOME_DO_CRITERIO_2": NOTA_NUMERICA
  },
  "totalScore": NOTA_TOTAL_NUMERICA,
  "summary": "Resumo geral da análise...",
  "strengths": "Pontos fortes encontrados...",
  "concerns": "Pontos de atenção ou preocupações observadas...",
  "recommendation": "apto_para_avaliacao_manual" | "precisa_conversa_pastoral" | "nao_recommended_no_momento" | "avaliacao_manual_necessaria"
}`;

  const userPrompt = `Abaixo estão os Critérios de Avaliação que você deve seguir:
${formattedCriteria}

Aqui está a Inscrição Completa do Candidato:
${formattedAnswersText}

Faça a análise completa e responda apenas o JSON.`;

  let evaluationResult: any = null;

  try {
    if (aiSettings.provider === 'gemini') {
      const model = aiSettings.model || 'gemini-1.5-flash';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        },
      );
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) evaluationResult = JSON.parse(text);
    } else {
      const model = aiSettings.model || 'gpt-4o-mini';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) evaluationResult = JSON.parse(text);
    }
  } catch (error) {
    console.error('AI Eval: API call failed', error);
    return { success: false, error: 'Falha ao executar avaliação por IA.' };
  }

  if (!evaluationResult) {
    return { success: false, error: 'A IA não retornou uma avaliação válida.' };
  }

  await supabase
    .from('ai_evaluations')
    .delete()
    .eq('tenant_id', submission.tenant_id)
    .eq('submission_id', submissionId);

  const firstRule = aiRules[0];
  const { data: insertedEval, error: insertErr } = await supabase
    .from('ai_evaluations')
    .insert({
      tenant_id: submission.tenant_id,
      submission_id: submissionId,
      rule_id: firstRule.id,
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
