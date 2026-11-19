import { redirect, notFound } from 'next/navigation';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient, hasServiceRoleKey } from '@/utils/supabase/admin';
import type { Profile, Tenant, TenantContext, TenantMembership, TenantRole } from '@/types/tenant';

const EDIT_ROLES: TenantRole[] = ['owner', 'admin', 'editor'];
const MANAGE_ROLES: TenantRole[] = ['owner', 'admin'];
const REVIEW_ROLES: TenantRole[] = ['owner', 'admin', 'reviewer'];

export function tenantAdminPath(tenantSlug: string, path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/t/${tenantSlug}/admin${path ? cleanPath : ''}`;
}

export function tenantPublicFormPath(tenantSlug: string, formSlug: string) {
  return `/t/${tenantSlug}/f/${formSlug}`;
}

export function getPlatformOwnerEmails() {
  return (process.env.FORMS_ZALEN_PLATFORM_OWNER_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformOwnerEmail(email?: string | null) {
  if (!email) return false;
  return getPlatformOwnerEmails().includes(email.toLowerCase());
}

export function isPlatformOwner(profile: Pick<Profile, 'platform_role'> | null | undefined, user?: Pick<User, 'email'> | null) {
  return profile?.platform_role === 'owner' || isPlatformOwnerEmail(user?.email);
}

export async function ensureProfile(supabase: SupabaseClient, user: User): Promise<Profile> {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfile) {
    if (
      isPlatformOwnerEmail(user.email)
      && existingProfile.platform_role !== 'owner'
      && hasServiceRoleKey()
    ) {
      const { data: promotedProfile, error: promoteError } = await createAdminClient()
        .from('profiles')
        .update({ platform_role: 'owner' })
        .eq('id', user.id)
        .select('*')
        .single();

      if (promoteError || !promotedProfile) {
        throw new Error(promoteError?.message || 'Não foi possível promover o owner da plataforma.');
      }

      return promotedProfile as Profile;
    }

    return existingProfile as Profile;
  }

  const platformOwnerByEnv = isPlatformOwnerEmail(user.email);
  const profilePayload = {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
    role: 'leader',
    platform_role: platformOwnerByEnv && hasServiceRoleKey() ? 'owner' : 'member',
  };

  const insertWith = platformOwnerByEnv && hasServiceRoleKey() ? createAdminClient() : supabase;
  const { data: profile, error } = await insertWith
    .from('profiles')
    .insert(profilePayload)
    .select('*')
    .single();

  if (error?.code === '23505') {
    const { data: duplicateProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (duplicateProfile) {
      return duplicateProfile as Profile;
    }

    if (hasServiceRoleKey()) {
      const { data: adminProfile } = await createAdminClient()
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (adminProfile) {
        return adminProfile as Profile;
      }
    }
  }

  if (error || !profile) {
    throw new Error(error?.message || 'Não foi possível inicializar o perfil do usuário.');
  }

  return profile as Profile;
}

export async function requireAuthenticatedUser(nextPath?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    redirect(`/login${query}`);
  }

  const profile = await ensureProfile(supabase, user);
  return { supabase, user, profile };
}

export async function getTenantContext(tenantSlug: string, allowedRoles?: TenantRole[]): Promise<TenantContext> {
  const nextPath = tenantAdminPath(tenantSlug);
  const { supabase, user, profile } = await requireAuthenticatedUser(nextPath);

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', tenantSlug)
    .maybeSingle();

  if (!tenant) notFound();

  const { data: membership } = await supabase
    .from('tenant_memberships')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const platformOwner = isPlatformOwner(profile, user);
  const membershipRole = (membership as TenantMembership | null)?.role;

  if (!membership && !platformOwner) {
    redirect('/tenants');
  }

  if (allowedRoles && !platformOwner && (!membershipRole || !allowedRoles.includes(membershipRole))) {
    redirect(tenantAdminPath(tenantSlug));
  }

  return {
    tenant: tenant as Tenant,
    membership: membership as TenantMembership | null,
    profile,
    userId: user.id,
    userEmail: user.email || '',
    isPlatformOwner: platformOwner,
  };
}

export async function requireTenantEditor(tenantSlug: string) {
  return getTenantContext(tenantSlug, EDIT_ROLES);
}

export async function requireTenantManager(tenantSlug: string) {
  return getTenantContext(tenantSlug, MANAGE_ROLES);
}

export async function requireTenantReviewer(tenantSlug: string) {
  return getTenantContext(tenantSlug, REVIEW_ROLES);
}

export async function requirePlatformOwner() {
  const { supabase, user, profile } = await requireAuthenticatedUser('/owner');

  if (!isPlatformOwner(profile, user)) {
    redirect('/tenants');
  }

  return { supabase, user, profile };
}

export async function getUserTenantMemberships(userId: string, supabase?: SupabaseClient) {
  const client = supabase || await createClient();
  const { data } = await client
    .from('tenant_memberships')
    .select('*, tenants(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  return (data || []) as TenantMembership[];
}

export async function redirectToDefaultTenant(path = '') {
  const { supabase, user, profile } = await requireAuthenticatedUser('/tenants');

  if (isPlatformOwner(profile, user)) {
    redirect('/owner');
  }

  const memberships = await getUserTenantMemberships(user.id, supabase);
  const firstTenant = memberships.find((membership) => membership.tenants?.slug);

  if (!firstTenant?.tenants?.slug) {
    redirect('/tenants');
  }

  redirect(tenantAdminPath(firstTenant.tenants.slug, path));
}

export function roleCanManage(role?: TenantRole | null) {
  return Boolean(role && MANAGE_ROLES.includes(role));
}

export function roleCanEdit(role?: TenantRole | null) {
  return Boolean(role && EDIT_ROLES.includes(role));
}

export function roleCanReview(role?: TenantRole | null) {
  return Boolean(role && REVIEW_ROLES.includes(role));
}
