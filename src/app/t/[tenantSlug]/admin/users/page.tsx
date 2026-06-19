import Link from 'next/link';
import { ArrowLeft, UserPlus, Users, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { UserForm } from '@/app/admin/users/UserForm';
import { UserRow } from '@/app/admin/users/UserRow';
import { createClient } from '@/utils/supabase/server';
import { requireTenantManager, tenantAdminPath } from '@/lib/tenancy';
import { ZalenLogo } from '@/components/ui/ZalenLogo';

export default async function TenantUsersManagementPage(props: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await props.params;
  const context = await requireTenantManager(tenantSlug);
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from('tenant_memberships')
    .select('*')
    .eq('tenant_id', context.tenant.id)
    .order('created_at', { ascending: false });

  const userIds = (memberships || []).map((membership) => membership.user_id);
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('*').in('id', userIds)
    : { data: [] };

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const rows = (memberships || []).map((membership) => ({
    ...profilesById.get(membership.user_id),
    id: membership.user_id,
    role: membership.role,
  }));

  return (
    <div className="zalen-page min-h-screen text-gray-200 font-sans relative pb-20">
      <header className="zalen-header flex items-center justify-between px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href={tenantAdminPath(tenantSlug)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <ZalenLogo size="sm" subtitle="Equipe" />
        </div>
      </header>

      <main className="p-6 md:p-10 max-w-6xl mx-auto z-10 relative">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-400" />
            Equipe de {context.tenant.name}
          </h2>
          <p className="text-muted mt-2 text-sm max-w-xl">
            Adicione e gerencie os usuários que podem criar formulários, revisar respostas e administrar este tenant.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card glow className="p-6 border-white/5 bg-black/40">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Convidar membro
              </h3>
              <UserForm tenantId={context.tenant.id} tenantSlug={tenantSlug} />
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card glow className="p-6 border-white/5 bg-black/40">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Membros ({rows.length})
                </h3>
              </div>

              <div className="space-y-4">
                {rows.map((profile) => (
                  <UserRow
                    key={profile.id}
                    profile={profile}
                    currentUserId={context.userId}
                    tenantId={context.tenant.id}
                    tenantSlug={tenantSlug}
                  />
                ))}

                {rows.length === 0 && (
                  <div className="text-center py-10 text-muted">
                    Nenhum membro registrado.
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
