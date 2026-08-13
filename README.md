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

- Phase 3: LLM wiring (Anthropic) driving the agent per the system prompt —
  Stage 0 domain detection, one-question-at-a-time flow, quality gates,
  follow-ups, and Section 4–9 generation
- Phase 4: Blueprint rendering + branded PDF export
