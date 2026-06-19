import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getUserTenantMemberships, isPlatformOwner, requireAuthenticatedUser, tenantAdminPath } from '@/lib/tenancy';
import { ZalenLogo } from '@/components/ui/ZalenLogo';

export default async function TenantsPage() {
  const { supabase, user, profile } = await requireAuthenticatedUser('/tenants');
  const memberships = await getUserTenantMemberships(user.id, supabase);

  if (isPlatformOwner(profile, user)) {
    redirect('/owner');
  }

  if (memberships.length === 1 && memberships[0].tenants?.slug) {
    redirect(tenantAdminPath(memberships[0].tenants.slug));
  }

  return (
    <div className="zalen-page min-h-screen text-gray-200 p-6 md:p-10">
      <main className="max-w-5xl mx-auto">
        <div className="mb-10 flex flex-col gap-8">
          <ZalenLogo subtitle="Operações" />
          <div>
          <h1 className="text-3xl font-bold text-white">Escolha uma operação</h1>
          <p className="text-muted mt-2">Selecione a empresa ou igreja que deseja administrar.</p>
          </div>
        </div>

        {memberships.length === 0 ? (
          <Card className="p-8 border border-white/5 bg-white/[0.02]">
            <Shield className="w-8 h-8 text-amber-400 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Nenhum tenant vinculado</h2>
            <p className="text-sm text-muted">Peça para o administrador geral da Forms Zalen vincular sua conta a uma operação.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberships.map((membership) => {
              const tenant = membership.tenants;
              if (!tenant) return null;
              return (
                <Card key={membership.id} glow className="p-6 border border-primary/20 bg-white/[0.02]">
                  <Building2 className="w-8 h-8 text-primary mb-4" />
                  <h2 className="text-xl font-semibold text-white">{tenant.name}</h2>
                  <p className="text-xs text-primary uppercase tracking-wider mt-1">{membership.role}</p>
                  <Link href={tenantAdminPath(tenant.slug)} className="block mt-6">
                    <Button variant="primary" className="w-full">Acessar</Button>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
