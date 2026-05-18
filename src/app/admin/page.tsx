import { createClient } from '@/utils/supabase/server';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CopyButton } from './CopyButton';
import { LogoutButton } from './LogoutButton';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  // Buscar formulários com contagem de inscrições cada um
  const { data: forms } = await supabase
    .from('forms')
    .select('*, form_submissions(count)')
    .order('created_at', { ascending: false });

  // Métricas globais
  const { count: totalSubmissions } = await supabase
    .from('form_submissions')
    .select('*', { count: 'exact', head: true });

  const { count: todaySubmissions } = await supabase
    .from('form_submissions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  return (
    <div className="min-h-screen p-6 md:p-10 bg-background relative">
      <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_var(--primary)] animate-pulse" />
            <span className="text-xs text-primary uppercase tracking-widest font-semibold">Painel de Controle</span>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-primary">
            Pulse Forms Admin
          </h1>
          <p className="text-muted mt-1 text-sm">Logado como <span className="text-gray-300">{user.email}</span></p>
        </div>
        <LogoutButton />
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total de Formulários', value: forms?.length ?? 0, color: 'text-emerald-400' },
          { label: 'Inscrições Totais', value: totalSubmissions ?? 0, color: 'text-blue-400' },
          { label: 'Inscrições Hoje', value: todaySubmissions ?? 0, color: 'text-yellow-400' },
          { label: 'Status', value: 'Ativo', color: 'text-emerald-400' },
        ].map((metric) => (
          <Card key={metric.label} className="p-4 text-center border border-white/5 bg-white/[0.02]">
            <p className={`text-3xl font-bold ${metric.color}`}>{metric.value}</p>
            <p className="text-xs text-muted mt-1">{metric.label}</p>
          </Card>
        ))}
      </div>

      {/* Formulários */}
      <h2 className="text-lg font-semibold mb-5 text-gray-300">Seus Formulários</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {forms?.map((form: any) => {
          const count = form.form_submissions?.[0]?.count ?? 0;
          return (
            <Card key={form.id} glow className="flex flex-col gap-0 p-0 overflow-hidden">
              {/* Top accent */}
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-400 w-full" />
              <div className="p-6 flex flex-col gap-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-white leading-tight">{form.title}</h3>
                  <span className="text-xs shrink-0 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 font-medium">
                    ATIVO
                  </span>
                </div>

                {form.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{form.description}</p>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <div className="flex-1 bg-black/30 rounded-lg p-3 text-center border border-white/5">
                    <p className="text-2xl font-bold text-blue-400">{count}</p>
                    <p className="text-xs text-muted">inscrições</p>
                  </div>
                  <div className="flex-1 bg-black/30 rounded-lg p-3 text-center border border-white/5">
                    <p className="text-sm font-mono text-gray-400 truncate">{form.slug}</p>
                    <p className="text-xs text-muted">slug</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-white/5">
                  <Link href={`/admin/forms/${form.id}`}>
                    <Button variant="primary" className="w-full text-sm py-2.5">Ver Inscrições</Button>
                  </Link>
                  <CopyButton slug={form.slug} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
