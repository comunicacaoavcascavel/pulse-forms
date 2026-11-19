-- Rebuild the pre-tenancy schema required by the Forms Zalen migrations.
create extension if not exists "uuid-ossp" with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'leader',
  created_at timestamptz not null default now()
);

create table public.form_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.form_folders(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  slug text not null unique,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  welcome_title text,
  welcome_text text,
  welcome_duration text,
  welcome_disclaimer text,
  theme jsonb not null default '{}'::jsonb,
  review_criteria jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.form_sections (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null
);

create table public.form_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  section_id uuid not null references public.form_sections(id) on delete cascade,
  label text not null,
  description text,
  type text not null,
  options jsonb,
  is_required boolean not null default false,
  order_index integer not null
);

create table public.form_rules (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  section_id uuid references public.form_sections(id) on delete cascade,
  question_id uuid references public.form_questions(id) on delete cascade,
  rule_type text not null,
  condition jsonb not null,
  action jsonb not null,
  message text
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  participant_id uuid not null references public.participants(id),
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'approved', 'rejected')),
  protocol_code text not null,
  created_at timestamptz not null default now()
);

create table public.form_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  question_id uuid references public.form_questions(id) on delete set null,
  answer_text text,
  answer_json jsonb
);

create table public.manual_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.form_submissions(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  comments text,
  recommendation text,
  scores jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_evaluation_rules (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  criteria jsonb not null default '[]'::jsonb,
  max_score numeric not null default 20,
  active boolean not null default true
);

create table public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  rule_id uuid references public.ai_evaluation_rules(id) on delete set null,
  total_score numeric,
  summary text,
  strengths text,
  concerns text,
  recommendation text,
  raw_result jsonb,
  created_at timestamptz not null default now()
);

create table public.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  question_id uuid references public.form_questions(id) on delete set null,
  file_type text not null,
  storage_path text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.form_folders enable row level security;
alter table public.forms enable row level security;
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
