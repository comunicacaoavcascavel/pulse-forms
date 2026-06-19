import Link from 'next/link';
import { ArrowLeft, Brain } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createAdminClient, hasServiceRoleKey } from '@/utils/supabase/admin';
import { maskSecret } from '@/lib/secretCrypto';
import { requireTenantManager, tenantAdminPath } from '@/lib/tenancy';
import { saveTenantAiSettingsAction } from './actions';

export default async function TenantAiSettingsPage(props: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await props.params;
  const context = await requireTenantManager(tenantSlug);

  const settings = hasServiceRoleKey()
    ? (await createAdminClient()
      .from('tenant_ai_settings')
      .select('provider, model, encrypted_api_key, enabled, updated_at')
      .eq('tenant_id', context.tenant.id)
      .maybeSingle()).data
    : null;

  return (
    <div className="zalen-page min-h-screen text-gray-200 p-6 md:p-10">
      <main className="max-w-3xl mx-auto">
        <Link href={tenantAdminPath(tenantSlug)} className="text-emerald-500 hover:text-emerald-400 transition-colors mb-6 inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao painel
        </Link>

        <Card glow className="p-8 border-blue-500/20 bg-blue-950/5">
          <div className="flex items-center gap-3 mb-8">
            <Brain className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">IA do tenant</h1>
              <p className="text-sm text-muted">Configure a chave de IA usada nas avaliações de {context.tenant.name}.</p>
            </div>
          </div>

          {!hasServiceRoleKey() && (
            <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
              Configure SUPABASE_SERVICE_ROLE_KEY para salvar e ler esta configuração.
            </div>
          )}

          <form action={saveTenantAiSettingsAction.bind(null, tenantSlug)} className="space-y-5">
            <label className="flex items-center gap-3 text-sm text-gray-200">
              <input name="enabled" type="checkbox" defaultChecked={Boolean(settings?.enabled)} className="accent-blue-500" />
              Ativar avaliação por IA neste tenant
            </label>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-200">Provider</label>
              <select name="provider" defaultValue={settings?.provider || 'openai'} className="w-full h-11 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-gray-100">
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-200">Modelo</label>
              <input name="model" defaultValue={settings?.model || 'gpt-4o-mini'} className="w-full h-11 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-200">API key</label>
              <input name="apiKey" type="password" placeholder="Cole uma nova chave para substituir" className="w-full h-11 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-gray-100" />
              <p className="text-xs text-muted mt-2">{maskSecret(settings?.encrypted_api_key)}</p>
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Salvar configuração
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
