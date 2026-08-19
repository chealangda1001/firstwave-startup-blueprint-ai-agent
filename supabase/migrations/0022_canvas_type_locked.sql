-- Lets a founder explicitly choose Lean Canvas vs Business Model Canvas
-- (a picker in the composer, mirroring a model-choice picker) instead of
-- only ever letting the agent decide for itself during Stage 0. "Auto"
-- (today's behavior — the agent judges from the founder's own signals)
-- stays the default; this column just tracks whether that judgment call
-- has been overridden by an explicit founder choice, so the agent's
-- system prompt knows whether it's still allowed to decide.
alter table public.sessions
  add column if not exists canvas_type_locked boolean not null default false;
