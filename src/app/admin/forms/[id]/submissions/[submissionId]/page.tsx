import { createClient } from '@/utils/supabase/server';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusSelector } from './StatusSelector';

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

      {/* Respostas agrupadas por seção */}
      <div className="space-y-6">
        {answersBySection.map(section => {
          if (section.answers.length === 0) return null;
          return (
            <Card key={section.id} className="p-0 overflow-hidden border border-white/5">
              <div className="px-6 py-4 bg-white/[0.03] border-b border-white/5">
                <h2 className="font-semibold text-gray-200">{section.title}</h2>
              </div>
              <div className="divide-y divide-white/5">
                {section.answers.map((answer: any) => (
                  <div key={answer.id} className="px-6 py-4">
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">
                      {answer.form_questions?.label}
                    </p>
                    <p className="text-gray-200 text-sm leading-relaxed">
                      {answer.answer_text ?? (
                        answer.answer_json ? JSON.stringify(answer.answer_json, null, 2) : (
                          <span className="text-gray-600 italic">Sem resposta</span>
                        )
                      )}
                    </p>
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
    </div>
  );
}
