-- Adds a second PDF variant per blueprint: a one-page landscape canvas
-- poster (Lean Canvas / BMC only, meant to be printed and pinned up),
-- alongside the existing multi-page written report. Same table, same
-- storage bucket, same RLS — just tagged so getBlueprintPdfUrl-style
-- "reuse the newest one" lookups for each variant don't collide.
alter table public.blueprint_pdfs
  add column if not exists kind text not null default 'report';

alter table public.blueprint_pdfs
  add constraint blueprint_pdfs_kind_check
    check (kind in ('report', 'canvas_poster'));

create index if not exists blueprint_pdfs_blueprint_id_kind_idx
  on public.blueprint_pdfs (blueprint_id, kind, created_at desc);
