alter table public.tenant_ai_settings
  drop constraint tenant_ai_settings_provider_check,
  add constraint tenant_ai_settings_provider_check
    check (provider in ('openai', 'gemini', 'openrouter'));
