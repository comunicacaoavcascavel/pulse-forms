'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient, hasServiceRoleKey } from '@/utils/supabase/admin';
import { requirePlatformOwner } from '@/lib/tenancy';
import type { TenantStatus } from '@/types/tenant';

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);

    const user = data.users.find((authUser) => authUser.email?.toLowerCase() === normalizedEmail);
    if (user || data.users.length < 1000) return user ?? null;
    page += 1;
  }

  return null;
}

export async function createTenantAction(formData: FormData) {
  await requirePlatformOwner();

  if (!hasServiceRoleKey()) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY precisa ser uma secret/service_role key.');
  }

  const name = String(formData.get('name') || '').trim();
  const explicitSlug = String(formData.get('slug') || '').trim();
  const adminEmail = String(formData.get('adminEmail') || '').trim();
  const adminName = String(formData.get('adminName') || '').trim();
  const adminPassword = String(formData.get('adminPassword') || '').trim();

  if (!name) throw new Error('Nome do tenant é obrigatório.');

  const slug = slugify(explicitSlug || name);
  if (!slug) throw new Error('Slug inválido.');

  const admin = createAdminClient();
  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ name, slug, status: 'active' })
    .select('*')
    .single();

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message || 'Erro ao criar tenant.');
  }

  if (adminEmail) {
    let authUser = await findAuthUserByEmail(adminEmail);

    if (!authUser) {
      if (!adminPassword) {
        throw new Error('Informe uma senha inicial ou use um e-mail que já exista no Auth.');
      }

      const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { name: adminName || adminEmail.split('@')[0] },
      });

      if (createUserError || !createdUser.user) {
        throw new Error(createUserError?.message || 'Tenant criado, mas falhou ao criar admin.');
      }

      authUser = createdUser.user;
    }

    await admin.from('profiles').upsert({
      id: authUser.id,
      email: adminEmail,
      name: adminName || authUser.user_metadata?.name || adminEmail.split('@')[0],
      role: 'owner',
      platform_role: 'member',
    });

    await admin.from('tenant_memberships').upsert({
      tenant_id: tenant.id,
      user_id: authUser.id,
      role: 'owner',
    }, { onConflict: 'tenant_id,user_id' });
  }

  revalidatePath('/owner');
  redirect('/owner');
}

export async function updateTenantStatusAction(tenantId: string, formData: FormData) {
  await requirePlatformOwner();

  if (!hasServiceRoleKey()) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY precisa ser uma secret/service_role key.');
  }

  const status = String(formData.get('status') || '') as TenantStatus;
  if (!['active', 'suspended', 'archived'].includes(status)) {
    throw new Error('Status de tenant inválido.');
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('tenants')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', tenantId);

  if (error) throw new Error(error.message);

  revalidatePath('/owner');
}
