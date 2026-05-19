import { createClient } from '@/utils/supabase/server';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusSelector } from './StatusSelector';
import { Brain, Star, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { ManualReviewForm } from './ManualReviewForm';

export default async function SubmissionDetailPage(
  props: { params: Promise<{ id: string; submissionId: string }> }
) {
  const { id: formId, submissionId } = await props.params;
  const supabase = await createClient();

  // Buscar a submissão com participante
  const { data: submission } = await supabase
    .from('form_submissions')
    .select('*, participants(*)')
    .eq('id', submissionId)
    .single();

  if (!submission) return notFound();

  // Buscar avaliação da IA
  const { data: aiEvaluation } = await supabase
    .from('ai_evaluations')
    .select('*')
    .eq('submission_id', submissionId)
    .maybeSingle();

  // Buscar avaliação manual da liderança
  const { data: manualReview } = await supabase
    .from('manual_reviews')
    .select('*')
    .eq('submission_id', submissionId)
    .maybeSingle();

  // Buscar critérios do formulário
  const { data: form } = await supabase
    .from('forms')
    .select('review_criteria')
    .eq('id', formId)
    .single();

  const reviewCriteria = form?.review_criteria || [];

  // Buscar as respostas com as perguntas
  const { data: answers } = await supabase
    .from('form_answers')
    .select('*, form_questions(label, type, section_id)')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true });

  // Buscar seções para agrupar
  const { data: sections } = await supabase
    .from('form_sections')
    .select('*')
    .eq('form_id', formId)
    .order('order_index', { ascending: true });

  // Agrupar respostas por seção
  const answersBySection = sections?.map(section => ({
    ...section,
    answers: answers?.filter(a => a.form_questions?.section_id === section.id) ?? [],
  })) ?? [];

  const participant = submission.participants as any;

  const statusLabels: Record<string, string> = {
    submitted: 'Nova Inscrição',
    under_review: 'Em Análise',
    approved: 'Aprovada',
    rejected: 'Reprovada',
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-background relative">
      <div className="absolute top-0 right-0 w-[30%] h-[30%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/admin" className="hover:text-primary transition-colors">Painel</Link>
        <span>/</span>
        <Link href={`/admin/forms/${formId}`} className="hover:text-primary transition-colors">Inscrições</Link>
        <span>/</span>
        <span className="text-gray-300">{participant?.name ?? 'Candidato'}</span>
      </div>

      {/* Header com info do candidato */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">{participant?.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-2">
            {participant?.email && (
              <a href={`mailto:${participant.email}`} className="hover:text-primary transition-colors">
                ✉ {participant.email}
              </a>
            )}
            {participant?.phone && (
              <a href={`https://wa.me/55${participant.phone.replace(/\D/g, '')}`} target="_blank" className="hover:text-emerald-400 transition-colors">
                📱 {participant.phone}
              </a>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              {submission.protocol_code ?? '—'}
            </span>
            <span className="text-xs text-gray-500">
              Enviado em {new Date(submission.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Status Selector */}
        <StatusSelector submissionId={submissionId} currentStatus={submission.status} />
      </div>

      {/* Grid Layout: Respostas à esquerda, Avaliação por IA à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Coluna da Esquerda: Respostas do Candidato */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-gray-300 mb-2 flex items-center gap-2">
            <span>📝</span> Respostas da Inscrição
          </h3>

          {answersBySection.map(section => {
            if (section.answers.length === 0) return null;
            return (
              <Card key={section.id} className="p-0 overflow-hidden border border-white/5 bg-black/20">
                <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
                  <h2 className="font-semibold text-gray-200">{section.title}</h2>
                </div>
                <div className="divide-y divide-white/5">
                  {section.answers.map((answer: any) => (
                    <div key={answer.id} className="px-6 py-4">
                      <p className="text-xs text-muted uppercase tracking-wider mb-1">
                        {answer.form_questions?.label}
                      </p>
                      <div className="text-gray-200 text-sm leading-relaxed">
                        {answer.answer_text && (answer.answer_text.startsWith('http://') || answer.answer_text.startsWith('https://')) ? (() => {
                          let videoUrl = answer.answer_text;
                          const isCloudinary = videoUrl.includes('res.cloudinary.com');
                          if (isCloudinary) {
                            videoUrl = videoUrl.replace(/\.[a-zA-Z0-9]+$/, '.mp4');
                            if (!videoUrl.includes('/f_auto')) {
                              videoUrl = videoUrl.replace('/video/upload/', '/video/upload/f_auto,q_auto/');
                            }
                          }
                          const isVideo = videoUrl.toLowerCase().includes('.mp4') || 
                                          videoUrl.toLowerCase().includes('.mov') || 
                                          videoUrl.toLowerCase().includes('.webm') || 
                                          videoUrl.includes('/storage/v1/object/public/videos/') ||
                                          isCloudinary;
                          return (
                            <span className="flex flex-col gap-2 mt-1">
                              <a 
                                href={videoUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline font-medium text-sm"
                              >
                                <span>🔗 Abrir Link / Ver Vídeo</span>
                              </a>
                              {isVideo && (
                                <video 
                                  src={videoUrl} 
                                  controls 
                                  preload="metadata"
                                  className="max-w-md w-full rounded-lg border border-white/10 bg-black/40 mt-1 max-h-[300px]"
                                />
                              )}
                            </span>
                          );
                        })() : (
                          <p>{answer.answer_text ?? (
                            answer.answer_json ? JSON.stringify(answer.answer_json, null, 2) : (
                              <span className="text-gray-600 italic">Sem resposta</span>
                            )
                          )}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}

          {answers?.length === 0 && (
            <Card className="p-8 text-center text-muted border border-white/5">
              <p>Nenhuma resposta registrada para esta inscrição.</p>
            </Card>
          )}
        </div>

        {/* Coluna da Direita: Avaliação por IA */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-gray-300 mb-2 flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            <span>Avaliação por IA</span>
          </h3>

          {aiEvaluation ? (() => {
            const raw = aiEvaluation.raw_result || {};
            const scores = raw.scores || {};
            const rec = aiEvaluation.recommendation || 'avaliacao_manual_necessaria';

            const recDetails: Record<string, { label: string; color: string; bg: string; icon: any }> = {
              apto_para_avaliacao_manual: {
                label: 'Apto para Audição',
                color: 'text-emerald-400 border-emerald-500/30',
                bg: 'bg-emerald-500/5',
                icon: CheckCircle
              },
              precisa_conversa_pastoral: {
                label: 'Requer Conversa Pastoral',
                color: 'text-amber-400 border-amber-500/30',
                bg: 'bg-amber-500/5',
                icon: AlertTriangle
              },
              nao_recommended_no_momento: {
                label: 'Não Recomendado',
                color: 'text-red-400 border-red-500/30',
                bg: 'bg-red-500/5',
                icon: AlertTriangle
              },
              avaliacao_manual_necessaria: {
                label: 'Avaliação Necessária',
                color: 'text-blue-400 border-blue-500/30',
                bg: 'bg-blue-500/5',
                icon: HelpCircle
              }
            };

            const recInfo = recDetails[rec] || recDetails.avaliacao_manual_necessaria;
            const RecIcon = recInfo.icon;

            return (
              <Card glow className="border-blue-500/20 bg-blue-950/5 p-6 flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-xl rounded-full pointer-events-none" />

                {/* Score & Recommendation */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Pontuação Geral</span>
                    <span className="text-4xl font-extrabold text-blue-400 font-mono mt-1">
                      {aiEvaluation.total_score}
                      <span className="text-sm text-gray-500 font-normal">/100</span>
                    </span>
                  </div>
                  <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-full text-xs font-semibold ${recInfo.bg} ${recInfo.color}`}>
                    <RecIcon className="w-4 h-4 shrink-0" />
                    <span>{recInfo.label}</span>
                  </div>
                </div>

                {/* Resumo */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Análise da IA</span>
                  <p className="text-sm text-gray-300 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                    {aiEvaluation.summary}
                  </p>
                </div>

                {/* Fortes e Pontos de Atenção */}
                <div className="grid grid-cols-1 gap-4">
                  {aiEvaluation.strengths && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg flex flex-col gap-1">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Pontos Fortes
                      </span>
                      <p className="text-xs text-gray-300 leading-relaxed">{aiEvaluation.strengths}</p>
                    </div>
                  )}
                  {aiEvaluation.concerns && (
                    <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-lg flex flex-col gap-1">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        Pontos de Atenção
                      </span>
                      <p className="text-xs text-gray-300 leading-relaxed">{aiEvaluation.concerns}</p>
                    </div>
                  )}
                </div>

                {/* Criteria breakdown progress bars */}
                {Object.keys(scores).length > 0 && (
                  <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Critérios Individuais</span>
                    <div className="flex flex-col gap-2.5">
                      {Object.entries(scores).map(([name, score]: any) => (
                        <div key={name} className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-300">{name}</span>
                            <span className="text-blue-400 font-mono font-bold">{score} pts</span>
                          </div>
                          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className="bg-blue-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, (score / 20) * 100))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })() : (
            <Card className="p-6 text-center text-muted border border-white/5">
              <Brain className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">A avaliação automática por IA está sendo processada ou não há critérios ativos configurados.</p>
            </Card>
          )}

          {/* Form de Avaliação Manual */}
          <ManualReviewForm 
            submissionId={submissionId} 
            initialReview={manualReview} 
            reviewCriteria={reviewCriteria}
          />
        </div>

      </div>
    </div>
  );
}
