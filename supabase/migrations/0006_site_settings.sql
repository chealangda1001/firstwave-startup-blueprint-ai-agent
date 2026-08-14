-- ============================================================================
-- site_settings: a singleton row holding the handful of public-facing text
-- an admin can edit without a deploy — app name and the landing page hero
-- copy. Singleton enforced via a fixed-value primary key (id must be 1).
-- Publicly readable (the landing page and the browser-tab title need it for
-- signed-out visitors too); only admins can write.
-- ============================================================================

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  app_name text not null default 'Blueprint Agent',
  hero_title text not null default
    'Turn a raw idea into a structured product blueprint',
  hero_subtitle text not null default
    'A 20–30 minute conversation with an AI agent that pushes back on vague answers.',
  hero_description text not null default
    'Get a 9-section blueprint — problem, users, business model, and more — ready to share with engineering, marketing, and finance.',
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is
  'Singleton (id=1) of admin-editable public-facing text: app name and landing page hero copy.';

drop trigger if exists set_updated_at on public.site_settings;
create trigger set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

insert into public.site_settings (id) values (1)
  on conflict (id) do nothing;

alter table public.site_settings enable row level security;

create policy "site_settings: public select" on public.site_settings
  for select using (true);

create policy "site_settings: admin update" on public.site_settings
  for update using (public.is_admin());
