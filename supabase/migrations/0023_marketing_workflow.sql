-- V2 workflow platform, first slice: the Marketing pipeline (per docs/ROADMAP.md
-- V2 Scope). Deliberately does NOT touch the sessions/blueprints tables — a
-- workflow_run is triggered from an approved blueprint but lives in its own
-- tables, since V2's whole premise is "the data model from V1 supports this
-- without a rewrite."
--
-- Execution itself runs on Claude Managed Agents (agents provisioned once via
-- scripts/setup-marketing-agents.ts, IDs stored in pipeline_agents below) —
-- these tables are the durable state our own UI reads/polls, since a
-- Managed Agents session's own lifecycle doesn't survive a founder pausing
-- an approval gate for days the way our own row does.

create type public.workflow_pipeline_type as enum ('marketing', 'product');

create type public.workflow_run_status as enum (
  'running', 'paused_for_approval', 'complete', 'failed'
);

create type public.workflow_node_status as enum (
  'waiting', 'running', 'complete', 'paused', 'error'
);

-- One row per Managed Agents Agent this app has provisioned — the
-- "which agent_id/version backs which pipeline role" mapping. Populated by
-- scripts/setup-marketing-agents.ts (run once; not at request time, per the
-- Managed Agents anti-pattern warning against agents.create() in the hot path).
create table if not exists public.pipeline_agents (
  id uuid primary key default gen_random_uuid(),
  role text not null unique,
  anthropic_agent_id text not null,
  anthropic_agent_version bigint,
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pipeline_agents enable row level security;

create policy "pipeline_agents: admin read" on public.pipeline_agents
  for select using (public.is_admin());

-- No founder-facing policy — this is pure backend config, never rendered to
-- a founder; only admins (for ops visibility) and the service-role client
-- (orchestration) touch it.

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references public.blueprints (id) on delete cascade,
  founder_id uuid not null references public.profiles (id) on delete cascade,
  pipeline_type public.workflow_pipeline_type not null,
  status public.workflow_run_status not null default 'running',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflow_runs_blueprint_id_idx
  on public.workflow_runs (blueprint_id, created_at desc);

alter table public.workflow_runs enable row level security;

create policy "workflow_runs: founders select own" on public.workflow_runs
  for select using (founder_id = auth.uid());

create policy "workflow_runs: admin select all" on public.workflow_runs
  for select using (public.is_admin());

-- One row per pipeline stage per run — what the visual canvas renders as a
-- node. `round_number` distinguishes repeated attempts at the same role
-- (currently only meaningful for the Strategist/Content Outcome, which can
-- iterate internally via Managed Agents' own max_iterations — round_number
-- here tracks distinct *node executions*, e.g. a manual re-run after a
-- founder rejection, not the Outcome's internal grading iterations).
create table if not exists public.workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs (id) on delete cascade,
  role text not null,
  round_number int not null default 1,
  status public.workflow_node_status not null default 'waiting',
  managed_agent_session_id text,
  -- Structured output captured from the role's submit_artifact custom tool
  -- call — never parsed from free text. Matches docs/ROADMAP.md's Agent
  -- Output Contract (log_message, structured content, status, confidence, gaps).
  artifact jsonb,
  -- Plain-language status lines as they stream in, for the canvas node's
  -- "last action" — per ROADMAP.md's "never raw JSON status codes in the
  -- founder-facing log" rule.
  log jsonb not null default '[]'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflow_nodes_run_id_idx
  on public.workflow_nodes (workflow_run_id, created_at asc);

alter table public.workflow_nodes enable row level security;

create policy "workflow_nodes: founders select via run" on public.workflow_nodes
  for select using (
    exists (
      select 1 from public.workflow_runs r
      where r.id = workflow_nodes.workflow_run_id
        and r.founder_id = auth.uid()
    )
  );

create policy "workflow_nodes: admin select all" on public.workflow_nodes
  for select using (public.is_admin());

-- Async approval gate audit trail — per ROADMAP.md's "hard stop, no
-- default-proceed" rule. One row per founder decision at a gate.
create table if not exists public.workflow_approvals (
  id uuid primary key default gen_random_uuid(),
  workflow_node_id uuid not null references public.workflow_nodes (id) on delete cascade,
  decision text not null check (decision in ('approve', 'reject')),
  note text,
  decided_by uuid not null references public.profiles (id),
  decided_at timestamptz not null default now()
);

alter table public.workflow_approvals enable row level security;

create policy "workflow_approvals: founders select via node" on public.workflow_approvals
  for select using (
    exists (
      select 1
      from public.workflow_nodes n
      join public.workflow_runs r on r.id = n.workflow_run_id
      where n.id = workflow_approvals.workflow_node_id
        and r.founder_id = auth.uid()
    )
  );

create policy "workflow_approvals: admin select all" on public.workflow_approvals
  for select using (public.is_admin());

-- All writes to these four tables happen server-side via the service-role
-- client (orchestration + admin setup script) — same pattern as
-- blueprint_pdfs (see migration 0007) — so there are deliberately no
-- insert/update policies for the authenticated role here, only select.
