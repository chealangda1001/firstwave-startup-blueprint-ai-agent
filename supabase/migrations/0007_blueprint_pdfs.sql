-- ============================================================================
-- Blueprint PDF export (roadmap P1.1). Every generated PDF gets its own row
-- and its own object in storage — "new PDF per session, old ones not
-- overwritten" per docs/ROADMAP.md — rather than a single pdf_url column on
-- blueprints that a regeneration would clobber. The founder-facing UI reads
-- the newest row; nothing else needs to change if a founder regenerates.
--
-- All writes happen server-side via the service-role client (see
-- src/lib/supabase/admin.ts) — Puppeteer runs in a Server Action, not in a
-- context with the founder's own session — so there is no insert policy
-- for authenticated/anon roles here, only select.
-- ============================================================================

create table if not exists public.blueprint_pdfs (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references public.blueprints (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists blueprint_pdfs_blueprint_id_idx
  on public.blueprint_pdfs (blueprint_id, created_at desc);

alter table public.blueprint_pdfs enable row level security;

create policy "blueprint_pdfs: founders select own" on public.blueprint_pdfs
  for select using (
    exists (
      select 1
      from public.blueprints b
      join public.sessions s on s.id = b.session_id
      where b.id = blueprint_pdfs.blueprint_id
        and s.founder_id = auth.uid()
    )
  );

create policy "blueprint_pdfs: admin select all" on public.blueprint_pdfs
  for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- storage bucket for generated PDFs. Private (not public) — every read goes
-- through a short-lived signed URL requested from a Server Action, which
-- re-checks the requester owns the session (or is an admin) before minting
-- one. Path convention: {founder_id}/{session_id}/{blueprint_pdf_id}.pdf
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('blueprint-pdfs', 'blueprint-pdfs', false)
on conflict (id) do nothing;

create policy "blueprint-pdfs bucket: founders read own folder"
  on storage.objects for select
  using (
    bucket_id = 'blueprint-pdfs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "blueprint-pdfs bucket: admin read all"
  on storage.objects for select
  using (bucket_id = 'blueprint-pdfs' and public.is_admin());
