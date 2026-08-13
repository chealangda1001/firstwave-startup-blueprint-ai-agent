-- ============================================================================
-- Row Level Security — founders can only see/touch their own data.
-- knowledge_base is readable by any authenticated user, writable only via
-- service_role (loaded out-of-band).
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_files enable row level security;
alter table public.session_messages enable row level security;
alter table public.blueprints enable row level security;
alter table public.knowledge_base enable row level security;

-- profiles --------------------------------------------------------------
create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- sessions ----------------------------------------------------------------
create policy "sessions: select own" on public.sessions
  for select using (auth.uid() = founder_id);

create policy "sessions: insert own" on public.sessions
  for insert with check (auth.uid() = founder_id);

create policy "sessions: update own" on public.sessions
  for update using (auth.uid() = founder_id);

create policy "sessions: delete own" on public.sessions
  for delete using (auth.uid() = founder_id);

-- session_files -------------------------------------------------------------
create policy "session_files: select own" on public.session_files
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_files.session_id and s.founder_id = auth.uid()
    )
  );

create policy "session_files: insert own" on public.session_files
  for insert with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_files.session_id and s.founder_id = auth.uid()
    )
  );

create policy "session_files: delete own" on public.session_files
  for delete using (
    exists (
      select 1 from public.sessions s
      where s.id = session_files.session_id and s.founder_id = auth.uid()
    )
  );

-- session_messages ----------------------------------------------------------
create policy "session_messages: select own" on public.session_messages
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_messages.session_id and s.founder_id = auth.uid()
    )
  );

create policy "session_messages: insert own" on public.session_messages
  for insert with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_messages.session_id and s.founder_id = auth.uid()
    )
  );

-- blueprints ------------------------------------------------------------
create policy "blueprints: select own" on public.blueprints
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = blueprints.session_id and s.founder_id = auth.uid()
    )
  );

create policy "blueprints: insert own" on public.blueprints
  for insert with check (
    exists (
      select 1 from public.sessions s
      where s.id = blueprints.session_id and s.founder_id = auth.uid()
    )
  );

create policy "blueprints: update own" on public.blueprints
  for update using (
    exists (
      select 1 from public.sessions s
      where s.id = blueprints.session_id and s.founder_id = auth.uid()
    )
  );

-- knowledge_base: read-only for any authenticated founder ------------------
create policy "knowledge_base: select for authenticated" on public.knowledge_base
  for select using (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- storage bucket for uploaded founder files (pitch decks, notes)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('session-uploads', 'session-uploads', false)
on conflict (id) do nothing;

create policy "session-uploads: founders manage own folder"
  on storage.objects for all
  using (bucket_id = 'session-uploads' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'session-uploads' and auth.uid()::text = (storage.foldername(name))[1]);
