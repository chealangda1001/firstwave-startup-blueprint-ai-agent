-- ============================================================================
-- Admin-configurable LLM settings for the blueprint agent. Until now the
-- model (claude-opus-5 — the largest, slowest model in the family, not the
-- "Claude Sonnet 4.6 ... cost-effective" the roadmap's own locked
-- architecture decision calls for) and effort were hardcoded constants,
-- meaning any tuning needed a code change and a deploy. This surfaces them
-- in site_settings alongside the existing app_name/hero fields, editable
-- from /admin/settings.
-- ============================================================================

alter table public.site_settings
  add column if not exists agent_model text not null default 'claude-sonnet-5',
  add column if not exists agent_effort text not null default 'medium',
  add column if not exists artifact_effort text not null default 'high',
  add column if not exists agent_thinking_enabled boolean not null default false;

alter table public.site_settings
  add constraint site_settings_agent_effort_check
    check (agent_effort in ('low', 'medium', 'high')),
  add constraint site_settings_artifact_effort_check
    check (artifact_effort in ('low', 'medium', 'high'));

comment on column public.site_settings.agent_model is
  'Claude model id used for the conversational turn (runAgentTurn) and the final blueprint synthesis (generateBlueprintArtifact).';
comment on column public.site_settings.agent_effort is
  'output_config.effort for the per-turn conversational call — the founder-facing latency-sensitive one.';
comment on column public.site_settings.artifact_effort is
  'output_config.effort for the one-time final blueprint synthesis — not latency-sensitive the same way, defaults higher.';
comment on column public.site_settings.agent_thinking_enabled is
  'Extended thinking for the conversational turn only. The artifact synthesis call always keeps thinking on regardless of this setting.';
