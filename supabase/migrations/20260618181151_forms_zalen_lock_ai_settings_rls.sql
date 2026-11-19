create policy tenant_ai_settings_no_direct_api_access on public.tenant_ai_settings
for all to public
using (false)
with check (false);
