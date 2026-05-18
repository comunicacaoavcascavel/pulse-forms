'use server';

import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export async function submitFormAction(formId: string, payload: Record<string, any>) {
  const supabase = await createClient();

  // 1. Descobrir quais campos são Nome, Email e Telefone
  const { data: questions } = await supabase.from('form_questions').select('*').eq('form_id', formId);
  
  let name = 'Sem Nome';
  let email = 'sem@email.com';
  let phone = null;

  if (questions) {
     for (const q of questions) {
       const answer = payload[q.id];
       if (answer) {
         const label = q.label.toLowerCase();
         if (label.includes('nome')) name = answer;
         else if (label.includes('e-mail') || q.type === 'email') email = answer;
         else if (label.includes('whatsapp') || q.type === 'phone') phone = answer;
       }
     }
  }

  // 2. Criar ou Buscar Participante (Vamos apenas inserir para o MVP)
  const { data: participant, error: pErr } = await supabase.from('participants').insert({
     name,
     email,
     phone
  }).select().single();

  if (pErr || !participant) {
     console.error('Erro ao criar participante', pErr);
     throw new Error('Falha ao registrar participante');
  }

  // 3. Criar Submissão Oficial
  const submissionNumber = `PULSE-${Math.floor(100000 + Math.random() * 900000)}`;
  const { data: submission, error: sErr } = await supabase.from('form_submissions').insert({
     form_id: formId,
     participant_id: participant.id,
     status: 'submitted',
     protocol_code: submissionNumber
  }).select().single();

  if (sErr || !submission) {
     console.error('Erro ao criar submission', sErr);
     throw new Error('Falha ao salvar inscrição');
  }

  // 4. Salvar todas as Respostas
  const answersToInsert = Object.keys(payload).map(questionId => {
     const answerValue = payload[questionId];
     return {
        submission_id: submission.id,
        question_id: questionId,
        answer_text: typeof answerValue === 'string' ? answerValue : null,
        answer_json: typeof answerValue !== 'string' ? answerValue : null
     }
  });

  if (answersToInsert.length > 0) {
      await supabase.from('form_answers').insert(answersToInsert);
  }

  return { success: true, protocolNumber: submissionNumber };
}
