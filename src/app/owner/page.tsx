import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  KeyRound,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LogoutButton } from '@/app/admin/LogoutButton';
import { ZalenLogo } from '@/components/ui/ZalenLogo';
import { createAdminClient, hasServiceRoleKey } from '@/utils/supabase/admin';
import { requirePlatformOwner } from '@/lib/tenancy';
import type { Tenant, TenantStatus } from '@/types/tenant';
import { createTenantAction, updateTenantStatusAction } from './actions';

type FormRecord = {
  id: string;
  tenant_id: string;
  slug: string;
  status: string | null;
};

type SubmissionRecord = {
  id: string;
  tenant_id: string;
  status: string | null;
  created_at: string | null;
};

type MembershipRecord = {
  tenant_id: string;
  user_id: string;
  role: string;
};

type AiSettingRecord = {
  tenant_id: string;
  provider: string;
  enabled: boolean | null;
  updated_at: string | null;
};

type TenantRow = Tenant & {
  formsCount: number;
  publishedFormsCount: number;
  submissionsCount: number;
  submittedCount: number;
  membersCount: number;
  aiProvider: string | null;
  aiEnabled: boolean;
  firstPublishedFormSlug: string | null;
};

const statusLabels: Record<TenantStatus, string> = {
  active: 'Ativo',
  suspended: 'Pausado',
  archived: 'Arquivado',
};

const statusClasses: Record<TenantStatus, string> = {
  active: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  suspended: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  archived: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300',
};

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function isFromLastSevenDays(value?: string | null) {
  if (!value) return false;
  const createdAt = new Date(value).getTime();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return createdAt >= sevenDaysAgo;
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'emerald',
}: {
  icon: typeof Building2;
  label: string;
  value: number | string;
  detail: string;
  tone?: 'emerald' | 'blue' | 'amber' | 'violet';
}) {
  const tones = {
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    violet: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
  };

  return (
    <Card className="p-5 border border-white/5 bg-white/[0.02]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-4">{detail}</p>
    </Card>
  );
}

function StatusPill({ status }: { status: TenantStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function ConfigurationRequired({ ownerEmail }: { ownerEmail: string }) {
  const serviceRoleValue = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const looksPublishable = serviceRoleValue.startsWith('sb_publishable_');

  return (
    <div className="zalen-page min-h-screen text-gray-200 p-6 md:p-10">
      <main className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <ZalenLogo size="md" showText={false} />
            <div>
              <p className="text-xs text-primary uppercase tracking-[0.3em]">Forms Zalen</p>
              <h1 className="text-2xl font-bold text-white">Admin geral</h1>
            </div>
          </div>
          <LogoutButton />
        </header>

        <Card className="p-8 border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-10 h-10 text-amber-300 mb-5" />
          <h2 className="text-2xl font-bold text-white mb-3">Configuração server-only pendente</h2>
          <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
            Você está logado como {ownerEmail}, mas o painel do proprietário precisa da service role real do Supabase para listar e administrar todos os tenants.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Status detectado</p>
              <p className="text-sm text-amber-200">
                {looksPublishable
                  ? 'A chave atual parece ser publishable/anon, não service_role.'
                  : 'SUPABASE_SERVICE_ROLE_KEY está ausente ou inválida.'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Onde pegar</p>
              <p className="text-sm text-gray-300">Supabase → Project Settings → API Keys → service_role/secret key.</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

export default async function OwnerPage() {
  const { user } = await requirePlatformOwner();
  const ownerEmail = user.email || 'owner';

  if (!hasServiceRoleKey()) {
    return <ConfigurationRequired ownerEmail={ownerEmail} />;
  }

  const admin = createAdminClient();
  const [
    tenantsResponse,
    formsResponse,
    submissionsResponse,
    membershipsResponse,
    aiSettingsResponse,
  ] = await Promise.all([
    admin.from('tenants').select('id, name, slug, status, created_at, updated_at').order('created_at', { ascending: false }),
    admin.from('forms').select('id, tenant_id, slug, status'),
    admin.from('form_submissions').select('id, tenant_id, status, created_at'),
    admin.from('tenant_memberships').select('tenant_id, user_id, role'),
    admin.from('tenant_ai_settings').select('tenant_id, provider, enabled, updated_at'),
  ]);

  const loadError = tenantsResponse.error
    || formsResponse.error
    || submissionsResponse.error
    || membershipsResponse.error
    || aiSettingsResponse.error;

  if (loadError) {
    return (
      <div className="zalen-page min-h-screen p-8 text-gray-200">
        <Card className="max-w-2xl mx-auto p-8 border border-red-500/20 bg-red-500/5">
          <LockKeyhole className="w-8 h-8 text-red-300 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Não foi possível carregar o painel</h1>
          <p className="text-sm text-muted">{loadError.message}</p>
        </Card>
      </div>
    );
  }

  const tenants = (tenantsResponse.data || []) as Tenant[];
  const forms = (formsResponse.data || []) as FormRecord[];
  const submissions = (submissionsResponse.data || []) as SubmissionRecord[];
  const memberships = (membershipsResponse.data || []) as MembershipRecord[];
  const aiSettings = (aiSettingsResponse.data || []) as AiSettingRecord[];

  const rows: TenantRow[] = tenants.map((tenant) => {
    const tenantForms = forms.filter((form) => form.tenant_id === tenant.id);
    const tenantSubmissions = submissions.filter((submission) => submission.tenant_id === tenant.id);
    const tenantMemberships = memberships.filter((membership) => membership.tenant_id === tenant.id);
    const tenantAi = aiSettings.find((setting) => setting.tenant_id === tenant.id);
    const firstPublishedForm = tenantForms.find((form) => form.status === 'published');

    return {
      ...tenant,
      formsCount: tenantForms.length,
      publishedFormsCount: tenantForms.filter((form) => form.status === 'published').length,
      submissionsCount: tenantSubmissions.length,
      submittedCount: tenantSubmissions.filter((submission) => submission.status === 'submitted').length,
      membersCount: new Set(tenantMemberships.map((membership) => membership.user_id)).size,
      aiProvider: tenantAi?.provider ?? null,
      aiEnabled: Boolean(tenantAi?.enabled),
      firstPublishedFormSlug: firstPublishedForm?.slug ?? null,
    };
  });

  const activeTenants = rows.filter((tenant) => tenant.status === 'active').length;
  const publishedForms = forms.filter((form) => form.status === 'published').length;
  const recentSubmissions = submissions.filter((submission) => isFromLastSevenDays(submission.created_at)).length;
  const aiEnabledTenants = rows.filter((tenant) => tenant.aiEnabled).length;

  return (
    <div className="zalen-page min-h-screen text-gray-200 p-6 md:p-10">
      <main className="max-w-7xl mx-auto">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
          <div className="flex items-center gap-4">
            <ZalenLogo size="md" showText={false} />
            <div>
              <p className="text-xs text-primary uppercase tracking-[0.3em]">Forms Zalen</p>
              <h1 className="text-3xl font-bold text-white">Admin geral</h1>
              <p className="text-sm text-muted mt-1">Logado como {ownerEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/tenants" className="text-sm text-gray-400 hover:text-white transition-colors">
              Meus tenants
            </Link>
            <LogoutButton />
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Building2} label="Tenants" value={rows.length} detail={`${activeTenants} ativos na plataforma`} />
          <StatCard icon={FileText} label="Formulários" value={forms.length} detail={`${publishedForms} publicados`} tone="blue" />
          <StatCard icon={ClipboardList} label="Respostas" value={submissions.length} detail={`${recentSubmissions} nos últimos 7 dias`} tone="amber" />
          <StatCard icon={KeyRound} label="IA" value={aiEnabledTenants} detail="tenants com IA ativa" tone="violet" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <Card className="xl:col-span-4 p-6 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Novo tenant</h2>
            </div>
            <form action={createTenantAction} className="space-y-4">
              <input name="name" required placeholder="Nome da empresa/igreja" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50" />
              <input name="slug" placeholder="slug opcional" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50" />
              <div className="border-t border-white/10 pt-4 space-y-4">
                <p className="text-xs text-muted">Admin inicial opcional</p>
                <input name="adminName" placeholder="Nome do admin" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50" />
                <input name="adminEmail" type="email" placeholder="E-mail do admin" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50" />
                <input name="adminPassword" type="text" placeholder="Senha inicial se for usuário novo" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50" />
              </div>
              <Button type="submit" variant="primary" className="w-full">Criar tenant</Button>
            </form>

            <div className="mt-6 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
              <ShieldCheck className="w-5 h-5 text-emerald-300 mb-2" />
              <p className="text-xs leading-relaxed text-gray-400">
                O tenant nasce isolado. O admin informado recebe papel owner apenas dentro desse tenant.
              </p>
            </div>
          </Card>

          <Card className="xl:col-span-8 p-0 border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-white/5">
              <div>
                <h2 className="text-lg font-semibold text-white">Empresas e igrejas</h2>
                <p className="text-xs text-muted mt-1">Operações cadastradas em forms.zalen.tech</p>
              </div>
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead className="text-xs uppercase tracking-wider text-gray-500">
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 font-medium">Tenant</th>
                    <th className="px-4 py-4 font-medium">Uso</th>
                    <th className="px-4 py-4 font-medium">IA</th>
                    <th className="px-4 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-white/[0.025] transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-emerald-300" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{tenant.name}</p>
                            <p className="text-xs text-emerald-400 mt-1">/{tenant.slug}</p>
                            <p className="text-xs text-gray-500 mt-2">Criado em {formatDate(tenant.created_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <span><strong className="block text-white text-base">{tenant.formsCount}</strong>forms</span>
                          <span><strong className="block text-white text-base">{tenant.submissionsCount}</strong>respostas</span>
                          <span><strong className="block text-white text-base">{tenant.membersCount}</strong>membros</span>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        {tenant.aiEnabled ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {tenant.aiProvider}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Não configurada</span>
                        )}
                      </td>
                      <td className="px-4 py-5">
                        <div className="space-y-3">
                          <StatusPill status={tenant.status} />
                          <form action={updateTenantStatusAction.bind(null, tenant.id)} className="flex items-center gap-2">
                            <select name="status" defaultValue={tenant.status} className="h-9 rounded-lg border border-white/10 bg-black/30 px-2 text-xs text-gray-200 outline-none">
                              <option value="active">Ativo</option>
                              <option value="suspended">Pausado</option>
                              <option value="archived">Arquivado</option>
                            </select>
                            <button type="submit" className="h-9 rounded-lg border border-white/10 px-3 text-xs text-gray-300 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors">
                              Salvar
                            </button>
                          </form>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          {tenant.firstPublishedFormSlug && (
                            <Link
                              href={`/t/${tenant.slug}/f/${tenant.firstPublishedFormSlug}`}
                              className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:text-blue-300 hover:border-blue-500/30 transition-colors"
                              title="Abrir primeiro form publicado"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </Link>
                          )}
                          <Link
                            href={`/t/${tenant.slug}/admin`}
                            className="h-9 rounded-lg border border-white/10 px-3 inline-flex items-center gap-2 text-xs text-gray-300 hover:text-emerald-300 hover:border-emerald-500/30 transition-colors"
                          >
                            Admin
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length === 0 && (
              <div className="px-6 py-16 text-center">
                <Users className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-muted">Nenhum tenant criado ainda.</p>
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
