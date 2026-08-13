-- ============================================================================
-- System admin backend.
--
-- Adds profiles.is_admin (the access gate, enforced both in RLS and at the
-- /admin route level), extends knowledge_base with the fields the admin CRUD
-- UI needs, and grants admins read access across founder data plus full
-- read/write on knowledge_base. No admin write access to founder-owned
-- session/blueprint data — oversight is read-only by design.
-- ============================================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Grants access to /admin. Set manually via SQL for the first admin — there is no self-service admin signup.';

-- ----------------------------------------------------------------------------
-- knowledge_base: add the fields the admin CRUD UI needs.
-- ----------------------------------------------------------------------------
create type public.knowledge_base_card_type as enum (
  'founder_lesson',
  'market_context',
  'lead_through_example'
);

alter table public.knowledge_base
  add column if not exists card_type public.knowledge_base_card_type
    not null default 'founder_lesson',
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_updated_at on public.knowledge_base;
create trigger set_updated_at before update on public.knowledge_base
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- is_admin() helper — used by every admin RLS policy below. security definer
-- so the policy check itself isn't blocked by profiles' own RLS.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- Admin read access across founder data (oversight — read-only; admins never
-- get insert/update/delete on founder-owned tables through these policies).
-- ----------------------------------------------------------------------------
create policy "profiles: admin select all" on public.profiles
  for select using (public.is_admin());

create policy "sessions: admin select all" on public.sessions
  for select using (public.is_admin());

create policy "session_messages: admin select all" on public.session_messages
  for select using (public.is_admin());

create policy "blueprints: admin select all" on public.blueprints
  for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Admin full CRUD on knowledge_base (the founder-facing "authenticated read"
-- policy from 0002 stays as-is for the agent's own runtime lookups).
-- ----------------------------------------------------------------------------
create policy "knowledge_base: admin insert" on public.knowledge_base
  for insert with check (public.is_admin());

create policy "knowledge_base: admin update" on public.knowledge_base
  for update using (public.is_admin());

create policy "knowledge_base: admin delete" on public.knowledge_base
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- First admin user: set manually, e.g.
--   update public.profiles set is_admin = true where email = 'you@example.com';
-- ----------------------------------------------------------------------------
