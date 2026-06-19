# Forms Zalen

MVP SaaS multi-tenant para formulários, respostas, revisão e avaliação por IA. A Pulse Igreja nasce como primeiro tenant (`pulse`) e os formulários existentes foram preservados nesse contexto.

## Rotas principais

- `/login`: login único da plataforma.
- `/owner`: painel geral Zalen para visualizar/criar tenants.
- `/tenants`: seletor de tenants do usuário.
- `/t/[tenantSlug]/admin`: painel administrativo do tenant.
- `/t/[tenantSlug]/admin/settings/ai`: configuração de IA por tenant.
- `/t/[tenantSlug]/f/[formSlug]`: link público de coleta.
- `/f/[slug]`: redirect legado para `/t/pulse/f/[slug]`.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TENANT_SECRET_ENCRYPTION_KEY=
FORMS_ZALEN_BASE_URL=https://forms.zalen.tech
FORMS_ZALEN_PLATFORM_OWNER_EMAILS=
```

`SUPABASE_SERVICE_ROLE_KEY` e `TENANT_SECRET_ENCRYPTION_KEY` são server-only. Nunca use prefixo `NEXT_PUBLIC_` nelas.

## Banco

As migrações em `supabase/migrations` criam:

- `tenants`, `tenant_memberships` e `tenant_ai_settings`.
- `tenant_id` nas tabelas operacionais.
- tenant inicial `pulse`.
- RLS tenant-aware, sem autorização baseada em `user_metadata`.
- storage separado por caminhos `tenants/{tenant}/...`.

## Desenvolvimento

```bash
npm install
npm run dev
npm run lint
npx next build --webpack
```

O build com `--webpack` evita falhas de Turbopack em ambientes locais que bloqueiam portas internas.
