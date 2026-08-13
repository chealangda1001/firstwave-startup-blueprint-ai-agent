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

## Phase 1 — done in this pass

- Supabase schema (`supabase/migrations/0001_init.sql`, `0002_rls.sql`):
  `profiles`, `sessions`, `session_files`, `session_messages`, `blueprints`,
  `knowledge_base`, RLS policies, and a private `session-uploads` storage
  bucket.
- Next.js scaffold with Supabase client/server/middleware wiring
  (`src/lib/supabase/*`, `middleware.ts`).
- App-level types mirroring the agent's JSON output contract
  (`src/types/blueprint.ts`, `src/types/database.types.ts`).

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

- Phase 2: Auth + session UI (start session, chat interface, Stage 0–9 flow)
- Phase 3: LLM wiring (Anthropic) driving the agent per the system prompt
- Phase 4: Blueprint rendering + branded PDF export
