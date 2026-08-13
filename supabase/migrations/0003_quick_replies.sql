-- ============================================================================
-- Quick-reply chips: bounded/categorical questions can offer tappable
-- answer choices alongside free text. Stored on the assistant message so
-- the chips still render correctly after a page refresh (not just right
-- after generation).
-- ============================================================================

alter table public.session_messages
  add column if not exists quick_replies jsonb,
  add column if not exists quick_replies_multi_select boolean not null default false;

comment on column public.session_messages.quick_replies is
  'Array of {label, value} tappable answer choices for this turn''s question, or null for free-text-only questions.';
comment on column public.session_messages.quick_replies_multi_select is
  'When true, multiple quick_replies can be selected before submitting; otherwise picking one submits immediately.';
