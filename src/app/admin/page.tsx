import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoutButton } from './LogoutButton';
import { FolderCreator } from './FolderCreator';
import { FormListTabs } from './FormListTabs';
import { Users } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  // Buscar ou inicializar o perfil do usuário
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const { data: allProfiles } = await supabase.from('profiles').select('id').limit(1);
    const role = (!allProfiles || allProfiles.length === 0) ? 'super_admin' : 'leader';
    
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        name: user.email!.split('@')[0],
        role
      })
      .select()
      .single();
    
    profile = newProfile;
  }

  const isSuperAdmin = profile?.role === 'super_admin';

  // Buscar pastas
  const { data: folders } = await supabase.from('form_folders').select('*').order('name');
  const safeFolders = folders || [];

  // Buscar formulários.
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

  // Agrupar forms por pasta
  const formsByFolder: Record<string, any[]> = { unassigned: [] };
  safeFolders.forEach(f => { formsByFolder[f.id] = []; });
  
  forms?.forEach(form => {
    if (form.folder_id && formsByFolder[form.folder_id]) {
      formsByFolder[form.folder_id].push(form);
    } else {
      formsByFolder.unassigned.push(form);
    }
  });

  return (
    <div className="min-h-screen bg-[#050b08] text-gray-200 font-sans relative pb-10">
      <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-white font-bold text-lg leading-none">P</span>
          </div>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-emerald-400">
            Pulse Forms
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Link 
                href="/admin/users" 
                className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all shadow-inner mr-2"
                title="Gerenciar Equipe"
              >
                <Users className="w-5 h-5" />
              </Link>
            )}
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-white">{user.email?.split('@')[0]}</span>
              {isSuperAdmin ? (
                <span className="text-[10px] text-emerald-400 font-medium tracking-widest uppercase">Super Admin</span>
              ) : (
                <span className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Líder</span>
              )}
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold overflow-hidden shadow-inner">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="p-6 md:p-10 max-w-7xl mx-auto">

      {/* Métricas Simplificadas */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col min-w-[120px]">
          <span className="text-xs text-emerald-500/70">Formulários</span>
          <span className="text-xl font-bold text-emerald-400">{forms?.length ?? 0}</span>
        </div>
        <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 flex flex-col min-w-[120px]">
          <span className="text-xs text-blue-500/70">Inscrições</span>
          <span className="text-xl font-bold text-blue-400">{totalSubmissions ?? 0}</span>
        </div>
        <div className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex flex-col min-w-[120px]">
          <span className="text-xs text-yellow-500/70">Hoje</span>
          <span className="text-xl font-bold text-yellow-400">{todaySubmissions ?? 0}</span>
        </div>
      </div>

      {/* Ações de Criação */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-white/5 pb-4 gap-4">
        <h2 className="text-lg font-semibold text-gray-300">Seus Formulários</h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <FolderCreator />
          <Link href="/admin/forms/new">
            <Button variant="primary" className="text-sm h-10 whitespace-nowrap">+ Criar Formulário</Button>
          </Link>
        </div>
      </div>

      {/* Listagem com Abas */}
      <FormListTabs folders={safeFolders} formsByFolder={formsByFolder} />
      
      </div>
    </div>
  );
}
