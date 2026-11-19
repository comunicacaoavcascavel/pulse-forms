import { FormBuilder } from '@/components/admin/FormBuilder';
import { createClient } from '@/utils/supabase/server';
import { requireTenantEditor } from '@/lib/tenancy';

export default async function NewTenantFormPage(props: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await props.params;
  const context = await requireTenantEditor(tenantSlug);
  const supabase = await createClient();

  const { data: folders } = await supabase
    .from('form_folders')
    .select('*')
    .eq('tenant_id', context.tenant.id)
    .order('name');

  return (
    <div className="zalen-page min-h-screen p-6 md:p-10 relative pt-24 md:pt-10">
      <header className="mb-10 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white">Criar Novo Formulário</h1>
        <p className="text-muted mt-2 text-sm">Monte um formulário para {context.tenant.name}.</p>
      </header>

      <FormBuilder folders={folders || []} tenantId={context.tenant.id} tenantSlug={tenantSlug} />
    </div>
  );
}
