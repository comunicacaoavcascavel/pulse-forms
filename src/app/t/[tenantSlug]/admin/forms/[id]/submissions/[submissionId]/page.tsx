import { createClient } from '@/utils/supabase/server';
import { createAdminClient, hasServiceRoleKey } from '@/utils/supabase/admin';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Brain, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { StatusSelector } from '@/app/admin/forms/[id]/submissions/[submissionId]/StatusSelector';
import { ManualReviewForm } from '@/app/admin/forms/[id]/submissions/[submissionId]/ManualReviewForm';
import { getTenantContext, tenantAdminPath } from '@/lib/tenancy';
import { parseStorageValue } from '@/lib/storage';

export default async function TenantSubmissionDetailPage(
  props: { params: Promise<{ tenantSlug: string; id: string; submissionId: string }> },
) {
  const { tenantSlug, id: formId, submissionId } = await props.params;
  const context = await getTenantContext(tenantSlug);
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from('form_submissions')
    .select('*, participants(*)')
    .eq('tenant_id', context.tenant.id)
    .eq('id', submissionId)
    .single();

  if (!submission) return notFound();

  const { data: aiEvaluation } = await supabase
    .from('ai_evaluations')
    .select('*')
    .eq('tenant_id', context.tenant.id)
    .eq('submission_id', submissionId)
    .maybeSingle();

  const { data: manualReview } = await supabase
    .from('manual_reviews')
    .select('*')
    .eq('tenant_id', context.tenant.id)
    .eq('submission_id', submissionId)
    .maybeSingle();

  const { data: form } = await supabase
    .from('forms')
    .select('review_criteria')
    .eq('tenant_id', context.tenant.id)
    .eq('id', formId)
    .single();

  const { data: answers } = await supabase
    .from('form_answers')
    .select('*, form_questions(label, type, section_id)')
    .eq('tenant_id', context.tenant.id)
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true });

  const { data: sections } = await supabase
    .from('form_sections')
    .select('*')
    .eq('tenant_id', context.tenant.id)
    .eq('form_id', formId)
    .order('order_index', { ascending: true });

  const signedUrls: Record<string, string> = {};
  if (hasServiceRoleKey() && answers) {
    const admin = createAdminClient();
    await Promise.all(answers.map(async (answer: any) => {
      const storage = parseStorageValue(answer.answer_text);
      if (!storage) return;
      const { data } = await admin.storage.from(storage.bucket).createSignedUrl(storage.path, 60 * 60);
      if (data?.signedUrl) signedUrls[answer.id] = data.signedUrl;
    }));
  }

  const answersBySection = sections?.map((section) => ({
    ...section,
    answers: answers?.filter((answer: any) => answer.form_questions?.section_id === section.id) ?? [],
  })) ?? [];

  const participant = submission.participants as any;
  const reviewCriteria = form?.review_criteria || [];

  const recDetails: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    apto_para_avaliacao_manual: {
      label: 'Apto para avaliação',
      color: 'text-emerald-400 border-emerald-500/30',
      bg: 'bg-emerald-500/5',
      icon: CheckCircle,
    },
    precisa_conversa_pastoral: {
      label: 'Requer conversa',
      color: 'text-amber-400 border-amber-500/30',
      bg: 'bg-amber-500/5',
      icon: AlertTriangle,
    },
    nao_recommended_no_momento: {
      label: 'Não recomendado',
      color: 'text-red-400 border-red-500/30',
      bg: 'bg-red-500/5',
      icon: AlertTriangle,
    },
    avaliacao_manual_necessaria: {
      label: 'Avaliação necessária',
      color: 'text-blue-400 border-blue-500/30',
      bg: 'bg-blue-500/5',
      icon: HelpCircle,
    },
  };

  const recommendation = aiEvaluation?.recommendation || 'avaliacao_manual_necessaria';
  const recInfo = recDetails[recommendation] || recDetails.avaliacao_manual_necessaria;
  const RecIcon = recInfo.icon;

  return (
    <div className="zalen-page min-h-screen p-6 md:p-10 relative">
      <div className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href={tenantAdminPath(tenantSlug)} className="hover:text-primary transition-colors">Painel</Link>
        <span>/</span>
        <Link href={`${tenantAdminPath(tenantSlug)}/forms/${formId}`} className="hover:text-primary transition-colors">Respostas</Link>
        <span>/</span>
        <span className="text-gray-300">{participant?.name ?? 'Pessoa'}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">{participant?.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-2">
            {participant?.email && <a href={`mailto:${participant.email}`} className="hover:text-primary transition-colors">✉ {participant.email}</a>}
            {participant?.phone && <a href={`https://wa.me/55${participant.phone.replace(/\D/g, '')}`} target="_blank" className="hover:text-emerald-400 transition-colors">📱 {participant.phone}</a>}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              {submission.protocol_code ?? '-'}
            </span>
            <span className="text-xs text-gray-500">
              Enviado em {new Date(submission.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        <StatusSelector
          submissionId={submissionId}
          currentStatus={submission.status}
          tenantId={context.tenant.id}
          tenantSlug={tenantSlug}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-gray-300 mb-2">Respostas</h3>

          {answersBySection.map((section) => {
            if (section.answers.length === 0) return null;
            return (
              <Card key={section.id} className="p-0 overflow-hidden border border-white/5 bg-black/20">
                <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
                  <h2 className="font-semibold text-gray-200">{section.title}</h2>
                </div>
                <div className="divide-y divide-white/5">
                  {section.answers.map((answer: any) => {
                    const signedUrl = signedUrls[answer.id];
                    return (
                      <div key={answer.id} className="px-6 py-4">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">
                          {answer.form_questions?.label}
                        </p>
                        <div className="text-gray-200 text-sm leading-relaxed">
                          {signedUrl ? (
                            <span className="flex flex-col gap-2 mt-1">
                              <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline font-medium text-sm">
                                Abrir vídeo
                              </a>
                              <video src={signedUrl} controls preload="metadata" className="max-w-md w-full rounded-lg border border-white/10 bg-black/40 mt-1 max-h-[300px]" />
                            </span>
                          ) : (
                            <p>{answer.answer_text?.startsWith('storage://') ? 'Arquivo privado disponível com service role configurada.' : (answer.answer_text ?? (answer.answer_json ? JSON.stringify(answer.answer_json, null, 2) : <span className="text-gray-600 italic">Sem resposta</span>))}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-gray-300 mb-2 flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            <span>Avaliação por IA</span>
          </h3>

          {aiEvaluation ? (
            <Card glow className="border-blue-500/20 bg-blue-950/5 p-6 flex flex-col gap-6 relative overflow-hidden">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Pontuação Geral</span>
                  <span className="text-4xl font-extrabold text-blue-400 font-mono mt-1">
                    {aiEvaluation.total_score}<span className="text-sm text-gray-500 font-normal">/100</span>
                  </span>
                </div>
                <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-full text-xs font-semibold ${recInfo.bg} ${recInfo.color}`}>
                  <RecIcon className="w-4 h-4 shrink-0" />
                  <span>{recInfo.label}</span>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                {aiEvaluation.summary}
              </p>
            </Card>
          ) : (
            <Card className="p-6 text-center text-muted border border-white/5">
              <Brain className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">Sem avaliação por IA para esta submissão.</p>
            </Card>
          )}

          <ManualReviewForm
            submissionId={submissionId}
            tenantId={context.tenant.id}
            tenantSlug={tenantSlug}
            initialReview={manualReview}
            reviewCriteria={reviewCriteria}
          />
        </div>
      </div>
    </div>
  );
}
