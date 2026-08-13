-- ============================================================================
-- Blueprint Agent — Initial Schema
-- Mirrors the OUTPUT CONTRACT in docs/blueprint-agent-system-prompt.md
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: one row per authenticated founder, extends auth.users
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Founder profile, one row per auth.users entry.';

-- ----------------------------------------------------------------------------
-- sessions: one blueprint conversation. Tracks canvas choice + progress.
-- ----------------------------------------------------------------------------
create type public.canvas_type as enum ('lean', 'bmc');
create type public.session_status as enum ('in_progress', 'complete', 'abandoned');
create type public.confidence_level as enum ('high', 'medium', 'low');

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references public.profiles (id) on delete cascade,
  status public.session_status not null default 'in_progress',
  canvas_type public.canvas_type,
  canvas_selection_reasoning text,
  current_stage text not null default 'stage_0_intake',
  domain text,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sessions is 'One blueprint-building session/conversation per founder attempt.';

create index if not exists sessions_founder_id_idx on public.sessions (founder_id);
create index if not exists sessions_status_idx on public.sessions (status);

-- ----------------------------------------------------------------------------
-- session_files: uploaded notes / pitch decks read during Stage 0 silent intake
-- ----------------------------------------------------------------------------
create table if not exists public.session_files (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz not null default now()
);

create index if not exists session_files_session_id_idx on public.session_files (session_id);

-- ----------------------------------------------------------------------------
-- session_messages: full transcript (user turns, assistant turns, inline logs)
-- ----------------------------------------------------------------------------
create type public.message_role as enum ('user', 'assistant', 'log');

create table if not exists public.session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  role public.message_role not null,
  stage text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists session_messages_session_id_idx on public.session_messages (session_id, created_at);

-- ----------------------------------------------------------------------------
-- blueprints: the generated artifact (1:1 with sessions), matching the
-- OUTPUT CONTRACT JSON shape. Section payloads kept as jsonb for flexibility;
-- confidence + gaps promoted to columns for easy querying/filtering.
-- ----------------------------------------------------------------------------
create table if not exists public.blueprints (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions (id) on delete cascade,
  canvas_type public.canvas_type not null,

  section_1_problem jsonb not null default '{}'::jsonb,
  section_1_confidence public.confidence_level,
  section_1_gaps text[] not null default '{}',

  section_2_users jsonb not null default '{}'::jsonb,
  section_2_confidence public.confidence_level,
  section_2_gaps text[] not null default '{}',

  section_3_canvas jsonb not null default '{}'::jsonb,
  section_3_confidence public.confidence_level,
  section_3_gaps text[] not null default '{}',

  section_4_mvp_scope jsonb not null default '{}'::jsonb,
  section_5_success_metrics jsonb not null default '{}'::jsonb,
  section_6_risks jsonb not null default '[]'::jsonb,
  section_7_roadmap jsonb not null default '{}'::jsonb,
  section_8_open_questions text[] not null default '{}',
  section_9_founder_market_fit jsonb not null default '{}'::jsonb,

  -- full raw artifact exactly as emitted by the agent, for PDF export / audit
  raw_artifact jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blueprints_session_id_idx on public.blueprints (session_id);

-- ----------------------------------------------------------------------------
-- knowledge_base: retrieved_context source material (founder lessons, domain
-- notes) used to ground the agent's questions. Populated out-of-band; the app
-- queries it by domain/tag at Stage 0.
-- ----------------------------------------------------------------------------
create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  tags text[] not null default '{}',
  title text not null,
  content text not null,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_base_domain_idx on public.knowledge_base (domain);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.sessions;
create trigger set_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.blueprints;
create trigger set_updated_at before update on public.blueprints
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- auto-create a profile row when a new auth user signs up
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
