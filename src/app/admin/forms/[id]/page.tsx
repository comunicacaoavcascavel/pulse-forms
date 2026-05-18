import { createClient } from '@/utils/supabase/server';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const statusConfig: Record<string, { label: string; color: string }> = {
  submitted: { label: 'NOVA', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  under_review: { label: 'EM ANÁLISE', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  approved: { label: 'APROVADA', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'REPROVADA', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export default async function SubmissionsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: form } = await supabase.from('forms').select('*').eq('id', id).single();
  if (!form) return notFound();

  const { data: submissions } = await supabase
    .from('form_submissions')
    .select('*, participants(name, email, phone)')
    .eq('form_id', id)
    .order('created_at', { ascending: false });

  // Contadores por status
  const counts = {
    total: submissions?.length ?? 0,
    new: submissions?.filter(s => s.status === 'submitted').length ?? 0,
    approved: submissions?.filter(s => s.status === 'approved').length ?? 0,
    rejected: submissions?.filter(s => s.status === 'rejected').length ?? 0,
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-background relative">
      <div className="absolute top-0 right-0 w-[30%] h-[30%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="mb-8">
        <Link href="/admin" className="text-emerald-500 hover:text-emerald-400 transition-colors mb-3 inline-flex items-center gap-1 text-sm">
          ← Voltar ao Painel
        </Link>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-primary">
          {form.title}
        </h1>
        <p className="text-muted mt-1 text-sm">Gerenciamento de inscrições recebidas</p>
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: counts.total, color: 'text-white' },
          { label: 'Novas', value: counts.new, color: 'text-blue-400' },
          { label: 'Aprovadas', value: counts.approved, color: 'text-emerald-400' },
          { label: 'Reprovadas', value: counts.rejected, color: 'text-red-400' },
        ].map(m => (
          <Card key={m.label} className="p-4 text-center border border-white/5 bg-white/[0.02]">
            <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-muted mt-1">{m.label}</p>
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <Card glow className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-muted uppercase text-xs tracking-wider bg-black/40">
                <th className="p-4 font-semibold">Protocolo</th>
                <th className="p-4 font-semibold">Data</th>
                <th className="p-4 font-semibold">Candidato</th>
                <th className="p-4 font-semibold">E-mail / WhatsApp</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {submissions?.map((sub: any) => {
                const status = statusConfig[sub.status] ?? statusConfig.submitted;
                return (
                  <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="p-4 font-mono text-emerald-400 text-sm">{sub.protocol_code ?? '—'}</td>
                    <td className="p-4 text-gray-400 text-sm whitespace-nowrap">
                      {new Date(sub.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      <span className="block text-xs text-gray-600">
                        {new Date(sub.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-100">{sub.participants?.name ?? '—'}</td>
                    <td className="p-4 text-sm">
                      <p className="text-gray-400">{sub.participants?.email ?? '—'}</p>
                      {sub.participants?.phone && (
                        <p className="text-gray-600 text-xs mt-0.5">{sub.participants.phone}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link href={`/admin/forms/${id}/submissions/${sub.id}`}>
                        <span className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:border-primary/50 hover:text-primary transition-all cursor-pointer">
                          Ver Detalhes
                        </span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(!submissions || submissions.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">📋</span>
                      <p>Nenhuma inscrição recebida ainda.</p>
                      <p className="text-xs">Copie o link no painel e divulgue para os membros!</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
