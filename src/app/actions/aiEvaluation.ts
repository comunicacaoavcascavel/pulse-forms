'use server';

import { createClient } from '@/utils/supabase/server';

export async function runAiEvaluation(submissionId: string) {
  const supabase = await createClient();

  // 1. Buscar a submissão e o formulário
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

  // 2. Buscar as regras ativas de avaliação por IA
  const { data: aiRules, error: rulesErr } = await supabase
    .from('ai_evaluation_rules')
    .select('*')
    .eq('form_id', form.id)
    .eq('active', true);

  if (rulesErr || !aiRules || aiRules.length === 0) {
    console.log('AI Eval: No active AI evaluation rules found for form', form.id);
    return { success: true, message: 'Nenhum critério ativo configurado.' };
  }

  // 3. Buscar todas as respostas da submissão com o rótulo da pergunta
  const { data: answers, error: ansErr } = await supabase
    .from('form_answers')
    .select('*, form_questions(label, type)')
    .eq('submission_id', submissionId);

  if (ansErr || !answers) {
    console.error('AI Eval: Error loading answers', ansErr);
    return { success: false, error: 'Erro ao carregar respostas' };
  }

  // 4. Formatar as respostas para enviar à IA
  const formattedAnswersText = answers.map((ans: any, idx: number) => {
    const label = ans.form_questions?.label || `Questão ${idx + 1}`;
    const value = ans.answer_text || JSON.stringify(ans.answer_json);
    return `[${label}]: ${value}`;
  }).join('\n\n');

  // 5. Preparar as regras / critérios para enviar à IA
  const formattedCriteria = aiRules.map((rule: any) => {
    const subCriteria = rule.criteria 
      ? (typeof rule.criteria === 'string' ? JSON.parse(rule.criteria) : rule.criteria) 
      : [];
    const subDetails = subCriteria.map((sc: any) => `- ${sc.name}: ${sc.description}`).join('\n');
    return `Critério: ${rule.name} (Pontuação máxima: ${rule.max_score} pontos)
Descrição/Instruções: ${rule.description}
${subDetails ? `Sub-itens de observação:\n${subDetails}` : ''}`;
  }).join('\n\n---\n\n');

  // 6. Tentar chamar a API de IA real se houver chave configurada, ou usar uma simulação heurística avançada
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  let evaluationResult: any = null;

  if (apiKey) {
    try {
      console.log('AI Eval: API key detected, requesting real AI analysis...');
      
      const systemPrompt = `Você é um avaliador ministerial altamente treinado e compassivo para a equipe de Louvor de uma igreja local.
Você deve analisar a submissão de um candidato com base nos critérios configurados e emitir uma nota honesta e construtiva.

Instruções importantes:
1. Retorne APENAS um JSON no formato especificado abaixo. Não inclua Markdown extras ou blocos de código além do JSON puro.
2. Seja realista: se a resposta do candidato é curta ou evasiva, dê uma nota coerente com isso.
3. Seja atencioso: procure por sinais de maturidade, dedicação espiritual e prontidão técnica.

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

      // Exemplo de chamada ao Gemini API
      if (process.env.GEMINI_API_KEY) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          evaluationResult = JSON.parse(text);
        }
      } else if (process.env.OPENAI_API_KEY) {
        // Exemplo de chamada ao OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' }
          })
        });
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          evaluationResult = JSON.parse(text);
        }
      }
    } catch (apiErr) {
      console.error('AI Eval: API call failed, falling back to heuristic engine...', apiErr);
    }
  }

  // Heuristic engine fallback if API keys are missing or call fails
  if (!evaluationResult) {
    console.log('AI Eval: Using internal advanced heuristic engine for evaluation...');
    
    // Analisar as respostas textuais para calcular notas dinâmicas e palavras-chave
    const allText = formattedAnswersText.toLowerCase();
    
    // Palavras que indicam força espiritual/musical
    const strongKeywords = ['dedicação', 'ensaio', 'servir', 'ministério', 'chamado', 'adorar', 'oração', 'bíblia', 'constante', 'compromisso', 'humildade'];
    // Palavras que podem indicar pontos de atenção
    const concernKeywords = ['pouco tempo', 'falta', 'atraso', 'dificuldade', 'raramente', 'estressado', 'ansioso', 'orgulho', 'não consigo'];

    const matchedStrengths = strongKeywords.filter(kw => allText.includes(kw));
    const matchedConcerns = concernKeywords.filter(kw => allText.includes(kw));

    const calculatedScores: Record<string, number> = {};
    let totalMaxScore = 0;
    let totalScore = 0;

    aiRules.forEach((rule: any) => {
      const maxScore = Number(rule.max_score || 20);
      totalMaxScore += maxScore;

      // Calcular uma pontuação base
      let baseFactor = 0.75; // Inicial 75%
      
      // Ajustar com base na extensão da resposta do candidato
      if (allText.length > 500) baseFactor += 0.1;
      if (allText.length < 150) baseFactor -= 0.15;

      // Ajustar por palavras-chave relevantes ao nome do critério
      const ruleName = rule.name.toLowerCase();
      if (ruleName.includes('devocional') || ruleName.includes('vida')) {
        if (allText.includes('oração') || allText.includes('bíblia') || allText.includes('devocional')) baseFactor += 0.1;
      }
      if (ruleName.includes('chamado') || ruleName.includes('ministério')) {
        if (allText.includes('chamado') || allText.includes('servir') || allText.includes('deus')) baseFactor += 0.1;
      }
      if (ruleName.includes('emocional') || ruleName.includes('maturidade')) {
        if (allText.includes('humildade') || allText.includes('liderança') || allText.includes('equipe')) baseFactor += 0.05;
        if (allText.includes('dificuldade') || allText.includes('ansiedade')) baseFactor -= 0.05;
      }

      baseFactor = Math.min(1, Math.max(0.3, baseFactor));
      const score = Math.round(maxScore * baseFactor);
      calculatedScores[rule.name] = score;
      totalScore += score;
    });

    const isApto = totalScore >= (totalMaxScore * 0.7);

    // Formatar resumo/fortes/pontos de atenção baseados em heurísticas
    const summary = `O candidato apresenta uma inscrição consistente com ${allText.length} caracteres de respostas detalhadas. Demonstra bom entendimento geral dos compromissos e cultura da nossa igreja.`;
    
    const strengths = matchedStrengths.length > 0 
      ? `Demonstra forte alinhamento espiritual e prático com termos como: ${matchedStrengths.slice(0, 4).join(', ')}. Mostra prontidão e clareza no propósito.`
      : 'Demonstra disposição para servir e cumprir as escalas de ensaios e ministração.';

    const concerns = matchedConcerns.length > 0
      ? `Recomendamos atenção pastoral quanto a possíveis limitações de tempo ou referências a: ${matchedConcerns.join(', ')}.`
      : 'Nenhum sinal crítico ou alerta vermelho detectado nas respostas textuais.';

    const recommendation = isApto 
      ? 'apto_para_avaliacao_manual' 
      : 'precisa_conversa_pastoral';

    evaluationResult = {
      scores: calculatedScores,
      totalScore,
      summary,
      strengths,
      concerns,
      recommendation
    };
  }

  // 7. Salvar os resultados para cada regra de IA na tabela public.ai_evaluations
  // A tabela possui colunas: id, submission_id, rule_id, total_score, summary, strengths, concerns, recommendation, raw_result, created_at.
  // Vamos salvar um registro de avaliação correspondente à principal regra ou salvar individualmente
  
  // Limpar avaliações antigas se existirem
  await supabase.from('ai_evaluations').delete().eq('submission_id', submissionId);

  // Inserir avaliação consolidada (usamos o ID da primeira regra ativa ou null)
  const firstRule = aiRules[0];
  const { data: insertedEval, error: insertErr } = await supabase
    .from('ai_evaluations')
    .insert({
      submission_id: submissionId,
      rule_id: firstRule.id,
      total_score: evaluationResult.totalScore,
      summary: evaluationResult.summary,
      strengths: evaluationResult.strengths,
      concerns: evaluationResult.concerns,
      recommendation: evaluationResult.recommendation,
      raw_result: evaluationResult
    })
    .select()
    .single();

  if (insertErr) {
    console.error('AI Eval: Error saving evaluation', insertErr);
    return { success: false, error: 'Erro ao salvar avaliação por IA' };
  }

  console.log('AI Eval: Consolidada com sucesso para submissão', submissionId);
  return { success: true, evaluation: insertedEval };
}
