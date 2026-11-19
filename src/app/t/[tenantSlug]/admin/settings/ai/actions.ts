'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, hasServiceRoleKey } from '@/utils/supabase/admin';
import { encryptSecret } from '@/lib/secretCrypto';
import { aiProviders, isAiProvider, isFreeOpenRouterModel } from '@/lib/aiProviders';
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

  if (!isAiProvider(provider)) {
    throw new Error('Provedor de IA inválido.');
  }

  const selectedModel = model || aiProviders[provider].defaultModel;
  if (provider === 'openrouter' && !isFreeOpenRouterModel(selectedModel)) {
    throw new Error('Escolha openrouter/free ou um modelo com sufixo :free.');
  }

  const admin = createAdminClient();
  const { data: current, error: readError } = await admin
    .from('tenant_ai_settings')
    .select('provider, encrypted_api_key')
    .eq('tenant_id', context.tenant.id)
    .maybeSingle();
  if (readError) throw new Error('Não foi possível ler a configuração de IA.');

  const encryptedApiKey = apiKey
    ? encryptSecret(apiKey)
    : current?.provider === provider ? current.encrypted_api_key : null;
  if (enabled && !encryptedApiKey) {
    throw new Error('Informe uma chave de API para ativar o provedor selecionado.');
  }

  const payload: Record<string, unknown> = {
    tenant_id: context.tenant.id,
    provider,
    model: selectedModel,
    encrypted_api_key: encryptedApiKey,
    enabled,
    updated_by: context.userId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from('tenant_ai_settings')
    .upsert(payload, { onConflict: 'tenant_id' });

  if (error) throw new Error(error.message);

  revalidatePath(`${tenantAdminPath(tenantSlug)}/settings/ai`);
}
