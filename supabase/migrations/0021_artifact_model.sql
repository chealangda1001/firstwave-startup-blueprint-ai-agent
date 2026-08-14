-- Decouples the blueprint-synthesis model from the conversational-turn
-- model. Previously both used the single agent_model setting; in
-- production, switching that setting to claude-sonnet-5 (for fast
-- conversational latency) broke synthesis outright — Anthropic rejected
-- the BlueprintArtifactSchema's structured-output call with "the compiled
-- grammar is too large" on Sonnet 5, a limit Opus apparently tolerates.
-- Since synthesis only runs once per session and isn't latency-sensitive
-- the way a live turn is, it gets its own model default (Opus) so a
-- founder-facing latency optimization on the conversation never breaks
-- the one-time synthesis step again.
alter table public.site_settings
  add column if not exists artifact_model text not null default 'claude-opus-5';
