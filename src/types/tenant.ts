export type TenantStatus = 'active' | 'suspended' | 'archived';

export type TenantRole = 'owner' | 'admin' | 'editor' | 'reviewer';

export type PlatformRole = 'owner' | 'member';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  platform_role: PlatformRole | null;
  created_at?: string;
}

export interface TenantMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  created_at?: string;
  tenants?: Tenant | null;
}

export interface TenantContext {
  tenant: Tenant;
  membership: TenantMembership | null;
  profile: Profile;
  userId: string;
  userEmail: string;
  isPlatformOwner: boolean;
}
