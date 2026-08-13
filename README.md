# Blueprint Agent — FirstWave

Next.js + Supabase app that runs the Blueprint Agent ("Aura Chea") session
described in [docs/blueprint-agent-system-prompt.md](docs/blueprint-agent-system-prompt.md):
a guided interview that turns a founder's raw idea into a structured,
9-section Product Blueprint (and PDF export).

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind) — `src/app`
- **Supabase** — Postgres (schema in `supabase/migrations`), Auth, Storage
  for uploaded pitch decks/notes
- `@supabase/ssr` for browser/server/middleware Supabase clients

## Phase 1 — Supabase schema + Next.js scaffold

- Supabase schema (`supabase/migrations/0001_init.sql`, `0002_rls.sql`):
  `profiles`, `sessions`, `session_files`, `session_messages`, `blueprints`,
  `knowledge_base`, RLS policies, and a private `session-uploads` storage
  bucket. Applied to the linked hosted project; types generated with
  `supabase gen types typescript --linked`.
- Next.js scaffold with Supabase client/server/middleware wiring
  (`src/lib/supabase/*`, `middleware.ts`).
- App-level types mirroring the agent's JSON output contract
  (`src/types/blueprint.ts`, `src/types/database.types.ts`).

## Phase 2 — Auth + session UI

- Email/password auth (`src/app/login`) with signup, login, and a
  `/auth/confirm` route handling the confirmation-link callback
  (`supabase.auth.verifyOtp`).
- Protected route group `src/app/(app)` — redirects to `/login` when signed
  out, shows the signed-in email + a sign-out button.
- `/dashboard` — lists the founder's sessions, "+ New session" creates a row
  in `sessions` and seeds the transcript with the Stage 0 opener + Q1.1
  (`src/lib/blueprint/opening.ts`).
- `/sessions/[id]` — chat-style transcript (`session_messages`) with a reply
  form. Sending a message persists it and appends a placeholder log line —
  **no LLM is wired up yet**; the actual agent reasoning (follow-ups, quality
  gates, section generation) is Phase 3.
- Verified end-to-end against the live Supabase project: signup → email
  confirm → login → create session → send message → transcript persists and
  reloads correctly; RLS/cascade delete confirmed clean.

## Phase 3 — LLM wiring (Anthropic)

- `src/lib/blueprint/system-prompt.ts` loads `docs/blueprint-agent-system-prompt.md`
  verbatim and appends a short adapter block that maps the persona's
  behavior onto structured output instead of freeform chat.
- `src/lib/blueprint/schemas.ts` — two Zod schemas used as Claude's
  structured output format (`output_config.format`): a small per-turn
  envelope (`reply_markdown`, `log_message`, stage/canvas bookkeeping) sent
  on every turn, and the full 9-section blueprint artifact sent once, when
  the interview completes — keeping the cheap per-turn call cheap.
- `src/lib/blueprint/agent.ts` — `runAgentTurn()` (model `claude-opus-5`,
  thinking disabled, effort `medium` — fast conversational turns) and
  `generateBlueprintArtifact()` (adaptive thinking, effort `high` — the
  final synthesis call). System prompt is cache-marked (`cache_control:
  ephemeral`) since it's large and reused on every call.
- `src/lib/blueprint/persist.ts` maps the model's output onto the
  `blueprints` table, matching the OUTPUT CONTRACT shape.
- `/dashboard` "+ New session" and `/sessions/[id]` "Send" now call the real
  agent; `session_status: "complete"` triggers a second call that generates
  and saves the full blueprint, surfaced at `/sessions/[id]/blueprint`.
  Both calls are wrapped so a model/API failure logs an inline error and
  leaves the session resumable rather than crashing the page.
- Verified end-to-end with real API calls: canvas selection reasoning,
  Stage 0 opener + Q1.1, and a live pushback/quality-gate follow-up (thin
  answer → lead-through examples → sharper question) all matched the
  system prompt exactly; domain detection persisted correctly.

## Quick-reply chips

Bounded/categorical questions (tech sophistication, same-vs-different
decision maker, yes/no confirmations) can offer tappable answer choices
alongside the always-present free-text box, instead of forcing every answer
through prose. Narrative questions (describe a person, describe your
advantage) stay free-text-only — a chip would let the founder skip past the
exact vagueness the quality gates are supposed to catch.

- `TurnEnvelopeSchema` (`src/lib/blueprint/schemas.ts`) gained
  `quick_replies` (nullable array of `{label, value}`) and
  `quick_replies_multi_select`. The system prompt adapter
  (`src/lib/blueprint/system-prompt.ts`) tells the model exactly when to
  populate them — defaulting to null (free text) whenever it's unsure.
- `session_messages` gained `quick_replies jsonb` and
  `quick_replies_multi_select boolean not null default false`
  (`supabase/migrations/0003_quick_replies.sql`) so chips still render
  correctly after a page refresh, not just right after generation.
- `src/app/(app)/sessions/[id]/reply-composer.tsx` (client component)
  renders the chips above the textbox. Picking a chip submits that answer
  immediately (single-select) or toggles it with a "Continue" button
  (multi-select, rare); the textbox always stays available for a custom
  answer.
- Verified end-to-end: the model correctly emits chips only for bounded
  questions (tested live — tech-sophistication question returned 3 well-formed
  options, the following frequency/cost question correctly returned null),
  and tapping a chip submits and persists exactly as designed.

## Chat UX fixes

Real usage surfaced three problems, all fixed:

- **Bundled questions.** A low-effort founder reply ("hi") could make the
  model compress several sub-questions into one "fill in the blanks" list —
  a real violation of the system prompt's "one question at a time" rule.
  `system-prompt.ts` now has an explicit, forceful block with a labeled
  bad/good example matching the exact failure pattern observed.
- **Raw markdown showing as literal text.** Chat bubbles rendered
  `message.content` as a plain string, so the model's `**bold**` and list
  syntax showed up as literal asterisks. `message-content.tsx` now renders
  through `react-markdown` instead.
- **No loading feedback.** `reply-composer.tsx` now shows a rotating status
  bubble ("Reading your answer…" → "Checking it against the quality
  gate…" → "Weighing what to ask next…" → "Almost there…", cycling every
  1.6s) plus a spinner + "Sending…" state on the Send button, so the
  10-20s agent round trip doesn't feel like a stalled page.

Verified live against the exact scenario that surfaced the bug (reply "hi"
to Q1.1): confirmed a single clean question comes back with one lead-through
example, clean markdown rendering, and both loading indicators animating
correctly through a real request.

## Chat UX round 2

A second pass on real usage:

- **One wall-of-text bubble → several short ones.** `split-blocks.ts` splits
  a reply on markdown paragraph boundaries (blank lines); `assistant-message.tsx`
  renders each as its own bubble. Only the newest turn reveals bubbles one
  at a time (~700ms apart, fade-in), so it reads like someone typing several
  messages instead of a bot dumping a paragraph — older turns render fully,
  immediately, no replay on refresh.
- **log_message lingering as a permanent bubble.** It was meant as transient
  "what am I doing" transparency, not a permanent transcript entry — role
  `log` rows are now filtered out of the rendered transcript entirely (the
  composer's existing "working…" indicator already covers the same purpose
  and disappears the instant the real reply lands).
- **Tool/method-choice questions missing quick-reply chips.** "What is he
  using today — Excel, OTA extranets, a PMS, WhatsApp, paper?" is bounded
  (the agent names the candidates itself) but wasn't triggering chips.
  Broadened the `quick_replies` guidance in `system-prompt.ts` to cover any
  question where the agent enumerates specific tool/method candidates.
- **Design system.** Switched the UI font from Geist to Inter with a full
  system-font fallback stack (found and fixed a real bug along the way: a
  legacy unlayered `font-family: Arial...` rule in `globals.css` was silently
  beating Tailwind's `font-sans` utility). Added a ChatGPT-style right-edge
  minimap (`chat-transcript.tsx`) — tick marks per turn, click to jump — and
  a floating "scroll to latest" button that appears once you've scrolled
  away from the bottom.

Found and fixed a second real bug during verification: the transcript box
had no bounded height, so the whole page scrolled instead of the box
scrolling internally, and the one-time "scroll to bottom on mount" landed
wherever content happened to be *before* the newest reply finished its
staggered block reveal. Fixed with a capped `max-h-[65vh]` on the box plus
a `ResizeObserver`-driven "stick to bottom while streaming" pattern (stays
pinned to the bottom as blocks reveal, unless the founder has deliberately
scrolled up to read earlier messages). Verified live: confirmed the box
scrolls internally, lands at the true bottom, the button appears/disappears
correctly, and minimap tick clicks jump to the right message.

## Getting started

### 1. Supabase project

Either link to a hosted project or run the stack locally with Docker:

```bash
# hosted: create a project at supabase.com, then
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# or local (requires Docker):
npx supabase start
```

Copy `.env.local.example` to `.env.local` and fill in the values from
`npx supabase status` (local) or Project Settings > API (hosted).

```bash
cp .env.local.example .env.local
```

### 2. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Schema overview

| Table | Purpose |
|---|---|
| `profiles` | Founder profile, 1:1 with `auth.users` (auto-created on signup) |
| `sessions` | One blueprint conversation: canvas type, current stage, status |
| `session_files` | Uploaded notes/pitch decks read during Stage 0 silent intake |
| `session_messages` | Full transcript — user turns, assistant turns, inline log lines |
| `blueprints` | Generated artifact, 1:1 with `sessions`; section columns + `raw_artifact` jsonb matching the agent's output contract |
| `knowledge_base` | Retrieved-context source material (founder lessons, domain notes) used to ground questions |

All founder-owned tables are RLS-protected to `auth.uid() = founder_id`
(directly or via the parent `sessions` row).

## Next phases (not yet built)

- Phase 4: branded PDF export of the generated blueprint (the in-app
  `/sessions/[id]/blueprint` view exists; export to PDF does not yet)
