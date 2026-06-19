create schema if not exists app_private;

grant usage on schema app_private to anon, authenticated;

create table if not exists public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'reviewer')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists public.tenant_ai_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  provider text not null default 'openai' check (provider in ('openai', 'gemini')),
  model text not null default 'gpt-4o-mini',
  encrypted_api_key text,
  enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists platform_role text not null default 'member'
  check (platform_role in ('owner', 'member'));

insert into public.tenants (name, slug, status)
values ('Pulse Igreja', 'pulse', 'active')
on conflict (slug) do update set name = excluded.name, status = excluded.status;

alter table public.forms add column if not exists tenant_id uuid;
alter table public.form_folders add column if not exists tenant_id uuid;
alter table public.form_sections add column if not exists tenant_id uuid;
alter table public.form_questions add column if not exists tenant_id uuid;
alter table public.form_rules add column if not exists tenant_id uuid;
alter table public.participants add column if not exists tenant_id uuid;
alter table public.form_submissions add column if not exists tenant_id uuid;
alter table public.form_answers add column if not exists tenant_id uuid;
alter table public.manual_reviews add column if not exists tenant_id uuid;
alter table public.ai_evaluation_rules add column if not exists tenant_id uuid;
alter table public.ai_evaluations add column if not exists tenant_id uuid;
alter table public.phone_verifications add column if not exists tenant_id uuid;
alter table public.submission_files add column if not exists tenant_id uuid;

with pulse as (select id from public.tenants where slug = 'pulse')
update public.forms set tenant_id = (select id from pulse) where tenant_id is null;

with pulse as (select id from public.tenants where slug = 'pulse')
update public.form_folders set tenant_id = (select id from pulse) where tenant_id is null;

update public.form_sections section
set tenant_id = form.tenant_id
from public.forms form
where section.form_id = form.id and section.tenant_id is null;

update public.form_questions question
set tenant_id = form.tenant_id
from public.forms form
where question.form_id = form.id and question.tenant_id is null;

update public.form_rules rule
set tenant_id = form.tenant_id
from public.forms form
where rule.form_id = form.id and rule.tenant_id is null;

with pulse as (select id from public.tenants where slug = 'pulse')
update public.participants set tenant_id = (select id from pulse) where tenant_id is null;

update public.form_submissions submission
set tenant_id = form.tenant_id
from public.forms form
where submission.form_id = form.id and submission.tenant_id is null;

update public.form_answers answer
set tenant_id = submission.tenant_id
from public.form_submissions submission
where answer.submission_id = submission.id and answer.tenant_id is null;

update public.manual_reviews review
set tenant_id = submission.tenant_id
from public.form_submissions submission
where review.submission_id = submission.id and review.tenant_id is null;

update public.ai_evaluation_rules rule
set tenant_id = form.tenant_id
from public.forms form
where rule.form_id = form.id and rule.tenant_id is null;

update public.ai_evaluations evaluation
set tenant_id = submission.tenant_id
from public.form_submissions submission
where evaluation.submission_id = submission.id and evaluation.tenant_id is null;

update public.phone_verifications verification
set tenant_id = participant.tenant_id
from public.participants participant
where verification.participant_id = participant.id and verification.tenant_id is null;

update public.submission_files file
set tenant_id = submission.tenant_id
from public.form_submissions submission
where file.submission_id = submission.id and file.tenant_id is null;

with pulse as (select id from public.tenants where slug = 'pulse')
insert into public.tenant_memberships (tenant_id, user_id, role)
select
  pulse.id,
  profiles.id,
  case
    when profiles.role = 'super_admin' then 'owner'
    when profiles.role = 'reviewer' then 'reviewer'
    when profiles.role = 'pastor' then 'reviewer'
    else 'admin'
  end
from public.profiles
cross join pulse
on conflict (tenant_id, user_id) do nothing;

alter table public.forms alter column tenant_id set not null;
alter table public.form_folders alter column tenant_id set not null;
alter table public.form_sections alter column tenant_id set not null;
alter table public.form_questions alter column tenant_id set not null;
alter table public.form_rules alter column tenant_id set not null;
alter table public.participants alter column tenant_id set not null;
alter table public.form_submissions alter column tenant_id set not null;
alter table public.form_answers alter column tenant_id set not null;
alter table public.manual_reviews alter column tenant_id set not null;
alter table public.ai_evaluation_rules alter column tenant_id set not null;
alter table public.ai_evaluations alter column tenant_id set not null;
alter table public.phone_verifications alter column tenant_id set not null;
alter table public.submission_files alter column tenant_id set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'forms_tenant_id_fkey') then
    alter table public.forms add constraint forms_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'form_folders_tenant_id_fkey') then
    alter table public.form_folders add constraint form_folders_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'form_sections_tenant_id_fkey') then
    alter table public.form_sections add constraint form_sections_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'form_questions_tenant_id_fkey') then
    alter table public.form_questions add constraint form_questions_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'form_rules_tenant_id_fkey') then
    alter table public.form_rules add constraint form_rules_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'participants_tenant_id_fkey') then
    alter table public.participants add constraint participants_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'form_submissions_tenant_id_fkey') then
    alter table public.form_submissions add constraint form_submissions_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'form_answers_tenant_id_fkey') then
    alter table public.form_answers add constraint form_answers_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'manual_reviews_tenant_id_fkey') then
    alter table public.manual_reviews add constraint manual_reviews_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_evaluation_rules_tenant_id_fkey') then
    alter table public.ai_evaluation_rules add constraint ai_evaluation_rules_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_evaluations_tenant_id_fkey') then
    alter table public.ai_evaluations add constraint ai_evaluations_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'phone_verifications_tenant_id_fkey') then
    alter table public.phone_verifications add constraint phone_verifications_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'submission_files_tenant_id_fkey') then
    alter table public.submission_files add constraint submission_files_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
  end if;
end $$;

alter table public.forms drop constraint if exists forms_slug_key;
drop index if exists public.forms_slug_key;
create unique index if not exists forms_tenant_slug_key on public.forms (tenant_id, slug);

create index if not exists tenant_memberships_user_idx on public.tenant_memberships (user_id);
create index if not exists forms_tenant_idx on public.forms (tenant_id);
create index if not exists form_folders_tenant_idx on public.form_folders (tenant_id);
create index if not exists form_sections_tenant_form_idx on public.form_sections (tenant_id, form_id);
create index if not exists form_questions_tenant_form_idx on public.form_questions (tenant_id, form_id);
create index if not exists form_submissions_tenant_form_idx on public.form_submissions (tenant_id, form_id);
create index if not exists form_answers_tenant_submission_idx on public.form_answers (tenant_id, submission_id);
create index if not exists participants_tenant_idx on public.participants (tenant_id);

create or replace function app_private.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.platform_role = 'owner'
  );
$$;

create or replace function app_private.has_tenant_role(p_tenant_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = p_tenant_id
      and membership.user_id = auth.uid()
      and membership.role = any(p_roles)
  );
$$;

create or replace function app_private.can_access_form(p_form_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.forms form
    join public.tenants tenant on tenant.id = form.tenant_id
    where form.id = p_form_id
      and (
        (form.status = 'published' and tenant.status = 'active')
        or app_private.has_tenant_role(form.tenant_id, array['owner','admin','editor','reviewer'])
        or app_private.is_platform_owner()
      )
  );
$$;

create or replace function app_private.can_manage_form(p_form_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.forms form
    where form.id = p_form_id
      and (
        app_private.has_tenant_role(form.tenant_id, array['owner','admin','editor'])
        or app_private.is_platform_owner()
      )
  );
$$;

create or replace function app_private.can_access_submission(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.form_submissions submission
    where submission.id = p_submission_id
      and (
        app_private.has_tenant_role(submission.tenant_id, array['owner','admin','editor','reviewer'])
        or app_private.is_platform_owner()
      )
  );
$$;

grant execute on all functions in schema app_private to anon, authenticated;

create or replace function app_private.set_tenant_from_form()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_tenant_id uuid;
begin
  select tenant_id into parent_tenant_id from public.forms where id = new.form_id;
  if parent_tenant_id is null then
    raise exception 'form_id % não pertence a um tenant válido', new.form_id;
  end if;
  if new.tenant_id is null then
    new.tenant_id := parent_tenant_id;
  elsif new.tenant_id <> parent_tenant_id then
    raise exception 'tenant_id incompatível com form_id';
  end if;
  return new;
end;
$$;

create or replace function app_private.set_tenant_from_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_tenant_id uuid;
begin
  select tenant_id into parent_tenant_id from public.form_submissions where id = new.submission_id;
  if parent_tenant_id is null then
    raise exception 'submission_id % não pertence a um tenant válido', new.submission_id;
  end if;
  if new.tenant_id is null then
    new.tenant_id := parent_tenant_id;
  elsif new.tenant_id <> parent_tenant_id then
    raise exception 'tenant_id incompatível com submission_id';
  end if;
  return new;
end;
$$;

create or replace function app_private.set_tenant_from_participant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_tenant_id uuid;
begin
  select tenant_id into parent_tenant_id from public.participants where id = new.participant_id;
  if parent_tenant_id is null then
    raise exception 'participant_id % não pertence a um tenant válido', new.participant_id;
  end if;
  if new.tenant_id is null then
    new.tenant_id := parent_tenant_id;
  elsif new.tenant_id <> parent_tenant_id then
    raise exception 'tenant_id incompatível com participant_id';
  end if;
  return new;
end;
$$;

create or replace function app_private.validate_form_tenant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  folder_tenant_id uuid;
begin
  if new.folder_id is not null then
    select tenant_id into folder_tenant_id from public.form_folders where id = new.folder_id;
    if folder_tenant_id is null or folder_tenant_id <> new.tenant_id then
      raise exception 'folder_id incompatível com tenant_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_form_tenant_trigger on public.forms;
create trigger validate_form_tenant_trigger
before insert or update of tenant_id, folder_id on public.forms
for each row execute function app_private.validate_form_tenant();

drop trigger if exists set_form_sections_tenant_trigger on public.form_sections;
create trigger set_form_sections_tenant_trigger
before insert or update of tenant_id, form_id on public.form_sections
for each row execute function app_private.set_tenant_from_form();

drop trigger if exists set_form_questions_tenant_trigger on public.form_questions;
create trigger set_form_questions_tenant_trigger
before insert or update of tenant_id, form_id on public.form_questions
for each row execute function app_private.set_tenant_from_form();

drop trigger if exists set_form_rules_tenant_trigger on public.form_rules;
create trigger set_form_rules_tenant_trigger
before insert or update of tenant_id, form_id on public.form_rules
for each row execute function app_private.set_tenant_from_form();

drop trigger if exists set_ai_evaluation_rules_tenant_trigger on public.ai_evaluation_rules;
create trigger set_ai_evaluation_rules_tenant_trigger
before insert or update of tenant_id, form_id on public.ai_evaluation_rules
for each row execute function app_private.set_tenant_from_form();

drop trigger if exists set_form_answers_tenant_trigger on public.form_answers;
create trigger set_form_answers_tenant_trigger
before insert or update of tenant_id, submission_id on public.form_answers
for each row execute function app_private.set_tenant_from_submission();

drop trigger if exists set_manual_reviews_tenant_trigger on public.manual_reviews;
create trigger set_manual_reviews_tenant_trigger
before insert or update of tenant_id, submission_id on public.manual_reviews
for each row execute function app_private.set_tenant_from_submission();

drop trigger if exists set_ai_evaluations_tenant_trigger on public.ai_evaluations;
create trigger set_ai_evaluations_tenant_trigger
before insert or update of tenant_id, submission_id on public.ai_evaluations
for each row execute function app_private.set_tenant_from_submission();

drop trigger if exists set_submission_files_tenant_trigger on public.submission_files;
create trigger set_submission_files_tenant_trigger
before insert or update of tenant_id, submission_id on public.submission_files
for each row execute function app_private.set_tenant_from_submission();

drop trigger if exists set_phone_verifications_tenant_trigger on public.phone_verifications;
create trigger set_phone_verifications_tenant_trigger
before insert or update of tenant_id, participant_id on public.phone_verifications
for each row execute function app_private.set_tenant_from_participant();

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_ai_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.forms enable row level security;
alter table public.form_folders enable row level security;
alter table public.form_sections enable row level security;
alter table public.form_questions enable row level security;
alter table public.form_rules enable row level security;
alter table public.participants enable row level security;
alter table public.form_submissions enable row level security;
alter table public.form_answers enable row level security;
alter table public.manual_reviews enable row level security;
alter table public.ai_evaluation_rules enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.phone_verifications enable row level security;
alter table public.submission_files enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'tenants', 'tenant_memberships', 'tenant_ai_settings', 'profiles', 'forms',
        'form_folders', 'form_sections', 'form_questions', 'form_rules', 'participants',
        'form_submissions', 'form_answers', 'manual_reviews', 'ai_evaluation_rules',
        'ai_evaluations', 'phone_verifications', 'submission_files'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

create policy tenants_select_visible on public.tenants
for select to public
using (
  status = 'active'
  or app_private.has_tenant_role(id, array['owner','admin','editor','reviewer'])
  or app_private.is_platform_owner()
);

create policy tenants_platform_write on public.tenants
for all to authenticated
using (app_private.is_platform_owner())
with check (app_private.is_platform_owner());

create policy tenant_memberships_select_visible on public.tenant_memberships
for select to authenticated
using (
  user_id = auth.uid()
  or app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
);

create policy tenant_memberships_platform_write on public.tenant_memberships
for all to authenticated
using (app_private.is_platform_owner())
with check (app_private.is_platform_owner());

create policy profiles_select_visible on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or app_private.is_platform_owner()
  or exists (
    select 1
    from public.tenant_memberships mine
    join public.tenant_memberships other_member on other_member.tenant_id = mine.tenant_id
    where mine.user_id = auth.uid()
      and other_member.user_id = profiles.id
  )
);

create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy profiles_update_own_or_platform on public.profiles
for update to authenticated
using (id = auth.uid() or app_private.is_platform_owner())
with check (id = auth.uid() or app_private.is_platform_owner());

create policy forms_select_visible on public.forms
for select to public
using (
  (
    status = 'published'
    and exists (select 1 from public.tenants tenant where tenant.id = forms.tenant_id and tenant.status = 'active')
  )
  or app_private.has_tenant_role(tenant_id, array['owner','admin','editor','reviewer'])
  or app_private.is_platform_owner()
);

create policy forms_insert_editors on public.forms
for insert to authenticated
with check (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor'])
  or app_private.is_platform_owner()
);

create policy forms_update_editors on public.forms
for update to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor'])
  or app_private.is_platform_owner()
)
with check (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor'])
  or app_private.is_platform_owner()
);

create policy forms_delete_editors on public.forms
for delete to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor'])
  or app_private.is_platform_owner()
);

create policy folders_select_members on public.form_folders
for select to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor','reviewer'])
  or app_private.is_platform_owner()
);

create policy folders_write_editors on public.form_folders
for all to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor'])
  or app_private.is_platform_owner()
)
with check (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor'])
  or app_private.is_platform_owner()
);

create policy sections_select_visible on public.form_sections
for select to public
using (app_private.can_access_form(form_id));

create policy sections_write_editors on public.form_sections
for all to authenticated
using (app_private.can_manage_form(form_id))
with check (app_private.can_manage_form(form_id));

create policy questions_select_visible on public.form_questions
for select to public
using (app_private.can_access_form(form_id));

create policy questions_write_editors on public.form_questions
for all to authenticated
using (app_private.can_manage_form(form_id))
with check (app_private.can_manage_form(form_id));

create policy rules_select_visible on public.form_rules
for select to public
using (app_private.can_access_form(form_id));

create policy rules_write_editors on public.form_rules
for all to authenticated
using (app_private.can_manage_form(form_id))
with check (app_private.can_manage_form(form_id));

create policy participants_select_members on public.participants
for select to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor','reviewer'])
  or app_private.is_platform_owner()
);

create policy participants_write_service_or_members on public.participants
for all to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
)
with check (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
);

create policy submissions_select_members on public.form_submissions
for select to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor','reviewer'])
  or app_private.is_platform_owner()
);

create policy submissions_update_reviewers on public.form_submissions
for update to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin','reviewer'])
  or app_private.is_platform_owner()
)
with check (
  app_private.has_tenant_role(tenant_id, array['owner','admin','reviewer'])
  or app_private.is_platform_owner()
);

create policy submissions_delete_managers on public.form_submissions
for delete to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
);

create policy answers_select_members on public.form_answers
for select to authenticated
using (app_private.can_access_submission(submission_id));

create policy answers_write_managers on public.form_answers
for all to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
)
with check (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
);

create policy files_select_members on public.submission_files
for select to authenticated
using (app_private.can_access_submission(submission_id));

create policy files_write_managers on public.submission_files
for all to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
)
with check (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
);

create policy manual_reviews_select_members on public.manual_reviews
for select to authenticated
using (app_private.can_access_submission(submission_id));

create policy manual_reviews_write_reviewers on public.manual_reviews
for all to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin','reviewer'])
  or app_private.is_platform_owner()
)
with check (
  app_private.has_tenant_role(tenant_id, array['owner','admin','reviewer'])
  or app_private.is_platform_owner()
);

create policy ai_rules_select_members on public.ai_evaluation_rules
for select to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor','reviewer'])
  or app_private.is_platform_owner()
);

create policy ai_rules_write_editors on public.ai_evaluation_rules
for all to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor'])
  or app_private.is_platform_owner()
)
with check (
  app_private.has_tenant_role(tenant_id, array['owner','admin','editor'])
  or app_private.is_platform_owner()
);

create policy ai_evaluations_select_members on public.ai_evaluations
for select to authenticated
using (app_private.can_access_submission(submission_id));

create policy ai_evaluations_write_managers on public.ai_evaluations
for all to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
)
with check (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
);

create policy phone_verifications_select_managers on public.phone_verifications
for select to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
);

create policy phone_verifications_write_managers on public.phone_verifications
for all to authenticated
using (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
)
with check (
  app_private.has_tenant_role(tenant_id, array['owner','admin'])
  or app_private.is_platform_owner()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('form_assets', 'form_assets', true, 8388608, array['image/png','image/jpeg','image/webp','image/gif']),
  ('videos', 'videos', false, 52428800, array['video/mp4','video/quicktime','video/webm','video/x-msvideo'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Allow public select on videos bucket" on storage.objects;
drop policy if exists "Allow public upload to videos bucket" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Auth Users Insert" on storage.objects;

do $$
begin
  if exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'update_updated_at_column'
      and procedure.pronargs = 0
  ) then
    alter function public.update_updated_at_column() set search_path = public, pg_temp;
  end if;
end $$;
