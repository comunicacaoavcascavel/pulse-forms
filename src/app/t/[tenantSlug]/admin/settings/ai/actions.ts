'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, hasServiceRoleKey } from '@/utils/supabase/admin';
import { encryptSecret } from '@/lib/secretCrypto';
import { requireTenantManager, tenantAdminPath } from '@/lib/tenancy';

export async function saveTenantAiSettingsAction(tenantSlug: string, formData: FormData) {
  const context = await requireTenantManager(tenantSlug);

  if (!hasServiceRoleKey()) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY precisa estar configurada.');
  }

  const provider = String(formData.get('provider') || 'openai');
  const model = String(formData.get('model') || '').trim();
  const apiKey = String(formData.get('apiKey') || '').trim();
  const enabled = formData.get('enabled') === 'on';

  if (!['openai', 'gemini'].includes(provider)) {
    throw new Error('Provider de IA inválido.');
  }

  const admin = createAdminClient();
  const payload: Record<string, unknown> = {
    tenant_id: context.tenant.id,
    provider,
    model: model || (provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'),
    enabled,
    updated_by: context.userId,
    updated_at: new Date().toISOString(),
  };

  if (apiKey) {
    payload.encrypted_api_key = encryptSecret(apiKey);
  }

  const { error } = await admin
    .from('tenant_ai_settings')
    .upsert(payload, { onConflict: 'tenant_id' });

  if (error) throw new Error(error.message);

  revalidatePath(`${tenantAdminPath(tenantSlug)}/settings/ai`);
}
