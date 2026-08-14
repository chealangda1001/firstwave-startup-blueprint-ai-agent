-- ============================================================================
-- Track how long the agent took to generate each reply, so the founder-facing
-- UI can show a small "responded in Xs" note under assistant messages
-- (mirrors how Claude.ai surfaces generation time).
-- ============================================================================

alter table public.session_messages
  add column if not exists response_time_ms integer;

comment on column public.session_messages.response_time_ms is
  'Wall-clock milliseconds spent generating this reply (model call only). Null for user/log rows and for older rows predating this column.';
