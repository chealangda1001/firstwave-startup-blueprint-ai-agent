-- Shared Managed Agents environment for the V2 workflow pipeline (all
-- pipeline roles run in the same cloud environment — none of them need
-- bash/file access beyond the submit_artifact custom tool, so one
-- environment covers every role). Stored on site_settings alongside the
-- other admin-configurable app-wide values, rather than a dedicated
-- single-row table, since it's exactly that: one shared config value.
alter table public.site_settings
  add column if not exists pipeline_environment_id text;
