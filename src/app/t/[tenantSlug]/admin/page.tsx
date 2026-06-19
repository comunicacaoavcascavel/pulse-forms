import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { LogoutButton } from '@/app/admin/LogoutButton';
import { FolderCreator } from '@/app/admin/FolderCreator';
import { FormListTabs } from '@/app/admin/FormListTabs';
import { Brain, Users } from 'lucide-react';
import { getTenantContext, roleCanManage, tenantAdminPath } from '@/lib/tenancy';
import { createClient } from '@/utils/supabase/server';
import { ZalenLogo } from '@/components/ui/ZalenLogo';

export default async function TenantAdminDashboard(props: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await props.params;
  const context = await getTenantContext(tenantSlug);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const canManage = context.isPlatformOwner || roleCanManage(context.membership?.role);

  const { data: folders } = await supabase
    .from('form_folders')
    .select('*')
    .eq('tenant_id', context.tenant.id)
    .order('name');
  const safeFolders = folders || [];

  const { data: forms } = await supabase
    .from('forms')
    .select('*, form_submissions(count)')
    .eq('tenant_id', context.tenant.id)
    .order('created_at', { ascending: false });

  const { count: totalSubmissions } = await supabase
    .from('form_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', context.tenant.id);

  const { count: todaySubmissions } = await supabase
    .from('form_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', context.tenant.id)
    .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  const formsByFolder: Record<string, any[]> = { unassigned: [] };
  safeFolders.forEach((folder) => { formsByFolder[folder.id] = []; });

  forms?.forEach((form) => {
    if (form.folder_id && formsByFolder[form.folder_id]) {
      formsByFolder[form.folder_id].push(form);
    } else {
      formsByFolder.unassigned.push(form);
    }
  });

  return (
    <div className="zalen-page min-h-screen text-gray-200 font-sans pb-10">
      <header className="zalen-header sticky top-0 z-50 flex items-center justify-between px-6 py-4">
        <ZalenLogo size="sm" subtitle={context.tenant.name} />

        <div className="flex items-center gap-4">
          {canManage && (
            <Link href={tenantAdminPath(tenantSlug, '/users')} className="zalen-icon-button w-10 h-10 rounded-xl flex items-center justify-center transition-all" title="Gerenciar equipe">
              <Users className="w-5 h-5" />
            </Link>
          )}
          {canManage && (
            <Link href={tenantAdminPath(tenantSlug, '/settings/ai')} className="zalen-icon-button w-10 h-10 rounded-xl flex items-center justify-center transition-all" title="Configurar IA">
              <Brain className="w-5 h-5" />
            </Link>
          )}
          <Link href="/tenants" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-gray-300 transition-all hover:border-primary/40 hover:text-white">Trocar tenant</Link>
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-white">{user?.email?.split('@')[0]}</span>
            <span className="text-[10px] text-primary font-medium tracking-widest uppercase">{context.membership?.role || 'Owner Zalen'}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-primary-hover font-bold overflow-hidden shadow-inner">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <div className="zalen-panel px-5 py-4 rounded-2xl flex flex-col min-w-[150px]">
            <span className="text-xs text-slate-400">Formulários</span>
            <span className="text-3xl font-bold text-white">{forms?.length ?? 0}</span>
          </div>
          <div className="zalen-panel px-5 py-4 rounded-2xl flex flex-col min-w-[150px]">
            <span className="text-xs text-slate-400">Respostas</span>
            <span className="text-3xl font-bold text-white">{totalSubmissions ?? 0}</span>
          </div>
          <div className="zalen-panel px-5 py-4 rounded-2xl flex flex-col min-w-[150px]">
            <span className="text-xs text-slate-400">Hoje</span>
            <span className="text-3xl font-bold text-white">{todaySubmissions ?? 0}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-white/5 pb-4 gap-4">
          <h2 className="text-lg font-semibold text-gray-300">Formulários</h2>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <FolderCreator tenantId={context.tenant.id} tenantSlug={tenantSlug} />
            <Link href={tenantAdminPath(tenantSlug, '/forms/new')}>
              <Button variant="primary" className="text-sm h-10 whitespace-nowrap">+ Criar Formulário</Button>
            </Link>
          </div>
        </div>

        <FormListTabs
          folders={safeFolders}
          formsByFolder={formsByFolder}
          tenantId={context.tenant.id}
          tenantSlug={tenantSlug}
        />
      </div>
    </div>
  );
}
