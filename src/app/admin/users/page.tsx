import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Users, Shield, Trash2, Mail } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserForm } from './UserForm';
import { UserRow } from './UserRow';

export default async function UsersManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  // Fetch current user profile to verify super_admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    redirect('/admin');
  }

  // Fetch all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const safeProfiles = profiles || [];

  return (
    <div className="min-h-screen bg-[#050b08] text-gray-200 font-sans relative pb-20">
      <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <header className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-white font-bold text-lg leading-none">P</span>
          </div>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-emerald-400">
            Pulse Forms &bull; Super Admin
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-400 font-mono tracking-widest uppercase bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            Painel Super Admin
          </span>
        </div>
      </header>

      <main className="p-6 md:p-10 max-w-6xl mx-auto z-10 relative">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-400" />
            Gerenciamento de Equipe
          </h2>
          <p className="text-muted mt-2 text-sm max-w-xl">
            Adicione e gerencie as contas dos líderes de louvor, pastores e banca avaliadora da sua igreja.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form para adicionar usuário */}
          <div className="lg:col-span-1">
            <Card glow className="p-6 border-white/5 bg-black/40">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Convidar Novo Membro
              </h3>
              
              <UserForm />
            </Card>
          </div>

          {/* Listagem de usuários */}
          <div className="lg:col-span-2 space-y-4">
            <Card glow className="p-6 border-white/5 bg-black/40">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Membros da Equipe ({safeProfiles.length})
                </h3>
              </div>

              <div className="space-y-4">
                {safeProfiles.map((p) => (
                  <UserRow key={p.id} profile={p} currentUserId={user.id} />
                ))}

                {safeProfiles.length === 0 && (
                  <div className="text-center py-10 text-muted">
                    Nenhum membro da equipe registrado.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
