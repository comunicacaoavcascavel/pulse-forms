with default_criteria(criteria) as (
  values (
    jsonb_build_array(
      jsonb_build_object(
        'name', 'Aderencia ao perfil esperado',
        'description', 'Avalie se a pessoa atende aos requisitos e expectativas definidos para este formulario.',
        'max_score', 10
      ),
      jsonb_build_object(
        'name', 'Clareza e consistencia das respostas',
        'description', 'Observe se as respostas sao completas, coerentes e ajudam a tomada de decisao.',
        'max_score', 10
      ),
      jsonb_build_object(
        'name', 'Maturidade e responsabilidade',
        'description', 'Considere postura, comprometimento, disponibilidade e sinais de responsabilidade.',
        'max_score', 10
      )
    )
  )
)
update public.forms f
set review_criteria = dc.criteria,
    updated_at = now()
from default_criteria dc
where f.review_criteria is null
   or f.review_criteria = '[]'::jsonb
   or f.review_criteria @> '[{"name":"Apto"}]'::jsonb
   or f.review_criteria::text ilike '%Novo Crit%';

with target as (
  select f.id as form_id, f.tenant_id, fs.id as section_id
  from public.forms f
  join public.tenants t on t.id = f.tenant_id
  join public.form_sections fs on fs.tenant_id = f.tenant_id and fs.form_id = f.id
  where t.slug = 'in-pulse-college'
    and f.slug = 'pre-entrevita-in-pulse-college'
    and fs.order_index = 1
)
update public.form_sections fs
set title = 'Dados pessoais',
    description = 'Informacoes usadas para identificar e contatar a pessoa inscrita.'
from target t
where fs.id = t.section_id;

with target as (
  select f.id as form_id, f.tenant_id, fs.id as section_id
  from public.forms f
  join public.tenants t on t.id = f.tenant_id
  join public.form_sections fs on fs.tenant_id = f.tenant_id and fs.form_id = f.id
  where t.slug = 'in-pulse-college'
    and f.slug = 'pre-entrevita-in-pulse-college'
    and fs.order_index = 1
)
update public.form_questions fq
set label = 'Nome completo',
    type = 'short_text',
    is_required = true,
    order_index = 1
from target t
where fq.tenant_id = t.tenant_id
  and fq.form_id = t.form_id
  and fq.section_id = t.section_id
  and fq.order_index = 1;

with target as (
  select f.id as form_id, f.tenant_id, fs.id as section_id
  from public.forms f
  join public.tenants t on t.id = f.tenant_id
  join public.form_sections fs on fs.tenant_id = f.tenant_id and fs.form_id = f.id
  where t.slug = 'in-pulse-college'
    and f.slug = 'pre-entrevita-in-pulse-college'
    and fs.order_index = 1
)
insert into public.form_questions (tenant_id, form_id, section_id, label, type, is_required, order_index, options)
select t.tenant_id, t.form_id, t.section_id, 'E-mail', 'email', true, 2, null::jsonb
from target t
where not exists (
  select 1
  from public.form_questions fq
  where fq.tenant_id = t.tenant_id
    and fq.form_id = t.form_id
    and fq.type = 'email'
);

with target as (
  select f.id as form_id, f.tenant_id, fs.id as section_id
  from public.forms f
  join public.tenants t on t.id = f.tenant_id
  join public.form_sections fs on fs.tenant_id = f.tenant_id and fs.form_id = f.id
  where t.slug = 'in-pulse-college'
    and f.slug = 'pre-entrevita-in-pulse-college'
    and fs.order_index = 1
)
insert into public.form_questions (tenant_id, form_id, section_id, label, type, is_required, order_index, options)
select t.tenant_id, t.form_id, t.section_id, 'WhatsApp', 'phone', true, 3, null::jsonb
from target t
where not exists (
  select 1
  from public.form_questions fq
  where fq.tenant_id = t.tenant_id
    and fq.form_id = t.form_id
    and fq.type = 'phone'
);

update public.form_submissions s
set protocol_code = regexp_replace(s.protocol_code, '^ZALEN-', 'COLLEGE-')
from public.forms f
join public.tenants t on t.id = f.tenant_id
where s.tenant_id = f.tenant_id
  and s.form_id = f.id
  and t.slug = 'in-pulse-college'
  and s.protocol_code like 'ZALEN-%';
