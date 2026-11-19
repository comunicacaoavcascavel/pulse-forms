import { createClient } from '@/utils/supabase/server';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTenantContext, tenantAdminPath } from '@/lib/tenancy';

const statusConfig: Record<string, { label: string; color: string }> = {
  submitted: { label: 'NOVA', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  under_review: { label: 'EM ANÁLISE', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  approved: { label: 'APROVADA', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'REPROVADA', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export default async function TenantSubmissionsPage(props: { params: Promise<{ tenantSlug: string; id: string }> }) {
  const { tenantSlug, id } = await props.params;
  const context = await getTenantContext(tenantSlug);
  const supabase = await createClient();

  const { data: form } = await supabase
    .from('forms')
    .select('*')
    .eq('tenant_id', context.tenant.id)
    .eq('id', id)
    .single();
  if (!form) return notFound();

  const { data: submissions } = await supabase
    .from('form_submissions')
    .select('*, participants(name, email, phone)')
    .eq('tenant_id', context.tenant.id)
    .eq('form_id', id)
    .order('created_at', { ascending: false });

  const counts = {
    total: submissions?.length ?? 0,
    new: submissions?.filter((submission: any) => submission.status === 'submitted').length ?? 0,
    approved: submissions?.filter((submission: any) => submission.status === 'approved').length ?? 0,
    rejected: submissions?.filter((submission: any) => submission.status === 'rejected').length ?? 0,
  };

  return (
    <div className="zalen-page min-h-screen p-6 md:p-10 relative">
      <header className="mb-8">
        <Link href={tenantAdminPath(tenantSlug)} className="text-emerald-500 hover:text-emerald-400 transition-colors mb-3 inline-flex items-center gap-1 text-sm">
          ← Voltar ao Painel
        </Link>
        <h1 className="zalen-title-gradient text-3xl font-bold">
          {form.title}
        </h1>
        <p className="text-muted mt-1 text-sm">Gerenciamento de respostas recebidas</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: counts.total, color: 'text-white' },
          { label: 'Novas', value: counts.new, color: 'text-blue-400' },
          { label: 'Aprovadas', value: counts.approved, color: 'text-emerald-400' },
          { label: 'Reprovadas', value: counts.rejected, color: 'text-red-400' },
        ].map((metric) => (
          <Card key={metric.label} className="p-4 text-center border border-white/5 bg-white/[0.02]">
            <p className={`text-3xl font-bold ${metric.color}`}>{metric.value}</p>
            <p className="text-xs text-muted mt-1">{metric.label}</p>
          </Card>
        ))}
      </div>

      <Card glow className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-muted uppercase text-xs tracking-wider bg-black/40">
                <th className="p-4 font-semibold">Protocolo</th>
                <th className="p-4 font-semibold">Data</th>
                <th className="p-4 font-semibold">Pessoa</th>
                <th className="p-4 font-semibold">E-mail / WhatsApp</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {submissions?.map((submission: any) => {
                const status = statusConfig[submission.status] ?? statusConfig.submitted;
                return (
                  <tr key={submission.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="p-4 font-mono text-emerald-400 text-sm">{submission.protocol_code ?? '-'}</td>
                    <td className="p-4 text-gray-400 text-sm whitespace-nowrap">
                      {new Date(submission.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      <span className="block text-xs text-gray-600">
                        {new Date(submission.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-100">{submission.participants?.name ?? '-'}</td>
                    <td className="p-4 text-sm">
                      <p className="text-gray-400">{submission.participants?.email ?? '-'}</p>
                      {submission.participants?.phone && (
                        <p className="text-gray-600 text-xs mt-0.5">{submission.participants.phone}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link href={`${tenantAdminPath(tenantSlug)}/forms/${id}/submissions/${submission.id}`}>
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
                    Nenhuma resposta recebida ainda.
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
