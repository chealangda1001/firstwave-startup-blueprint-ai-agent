# Blueprint Engine — Product Roadmap

> This document is the single source of truth for the Blueprint Engine product vision, architecture decisions, and build sequence. It was produced from a full strategic design session covering audience, value proposition, agent design, question framework, memory architecture, and V1/V2 scope.
>
> **For Claude Code:** When asked "what's next," refer to the current phase below and the backlog in order. Do not invent scope — everything to be built is listed here.

---

## Product Vision

**What it is:**
An AI-powered Blueprint Engine that guides founders and product owners through a structured discovery process — producing a rigorous product blueprint document and PDF that their entire team can act on.

**Core value proposition:**
*The AI that won't let you build the wrong thing.*

Unlike asking Claude or ChatGPT directly, the Blueprint Engine is opinionated and stubborn. It holds founders to a quality standard. It asks the question they were hoping to skip. It doesn't move forward until the answer is good enough. The output is not a conversation — it is a structured artifact a team can pick up and act on without translation.

**What makes it different from Claude/ChatGPT direct:**
- Structured, gated question framework — not freeform chat
- Cambodia and Southeast Asia market calibration baked in
- 30+ senior founder knowledge base (fintech, edtech, healthtech, tourism tech, agritech, logistics) informing questions and flags
- Output is a structured document and branded PDF — not a wall of text
- Project memory — the agent knows your business history across sessions
- Credit-based usage model — pay for what you use

**First target user:**
Solo founders and product owners launching new product initiatives — specifically those overwhelmed by where to start when a new product feels like starting a startup from scratch.

---

## Architecture Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 App Router | Solo builder, Vercel deploy, API routes in one framework |
| Database | Supabase (Postgres + Auth + RLS + Storage) | Managed, familiar from BookMeBus, pgvector for RAG |
| AI model | Claude Sonnet 4.6 via Anthropic API | Streaming, structured outputs, cost-effective |
| Vector store | Supabase pgvector | No separate infrastructure in V1 |
| PDF generation | Puppeteer (server-side HTML → PDF) | Full design control over canvas layout |
| Auth | Supabase Auth (magic link + Google OAuth) | No password management |
| Payments | Stripe | Credit pack purchases |
| Hosting | Vercel + GitHub auto-deploy | Zero server management |
| Admin access | `is_admin` boolean on profiles table, RLS enforced | Simple, no separate auth system |

**V2 infrastructure additions (not yet needed):**
- Pinecone (if pgvector outgrown)
- Separate Node/Python backend (if API routes outgrown)
- n8n or custom workflow orchestration layer

---

## Canvas Framework Logic

The blueprint agent selects the canvas framework automatically based on signals from the founder's input:

| Signal | Canvas |
|---|---|
| Existing revenue model | BMC signal |
| Existing customer base | BMC signal |
| Unvalidated assumptions about users/problem | Lean Canvas signal |
| Tie | Lean Canvas (default) |

The agent tells the founder which canvas it chose and why, transparently. The founder can override.

- **Lean Canvas** → new ideas, early stage, unvalidated assumptions
- **Business Model Canvas** → existing businesses, established revenue, known customers

Both canvases use simplified, outcome-oriented language in questions. Framework jargon (TAM, CAC, value proposition) never appears in conversation — only in the final artifact as section headers.

---

## Blueprint Question Framework

The agent runs 9 sections in order. Sections 1–3 are **earned** (interrogated deeply, quality-gated). Sections 4–8 are **generated** (drafted from what was learned). Section 9 is the closing gift.

| Section | Name | Type | Quality Gate |
|---|---|---|---|
| 0 | Silent Intake | Internal only | Canvas selection, file reading, KB query |
| 1 | Problem | Earned | Falsifiable problem statement required |
| 2 | Users | Earned | Findable in 48hrs required |
| 3 | Canvas Core Fields | Earned | All primary fields completed |
| 4 | MVP Scope | Generated | Gap-flagged |
| 5 | Success Metrics | Generated | Gap-flagged |
| 6 | Risks & Assumptions | Generated | Gap-flagged |
| 7 | High-Level Roadmap | Generated | Gap-flagged |
| 8 | Open Questions | Generated | Gap-flagged |
| 9 | Founder/Team Market Fit | Closing gift | Honest narrative, no score |

**Behavioral rules baked into agent:**
- One question at a time — never two in the same message
- Maximum 3 follow-ups per section before proceeding with gap flag
- Lead-through examples shown before definitions for hard questions
- Disagree openly when problem statement and solution contradict
- Cambodia/SEA market calibration active throughout
- Inline log messages stream to UI at each significant step

---

## Data Model

```
businesses
  id, name, founder_id, created_at, memory_summary

projects
  id, business_id, name, status (draft|active|shipped|archived)
  canvas_type, created_at, archived_at

sessions
  id, project_id, founder_id, status (started|completed|abandoned)
  created_at, completed_at, token_usage

artifacts
  id, session_id, version, blueprint_json, pdf_url, created_at

memory_cards (knowledge base)
  id, content, domain, card_type (founder_lesson|market_context|lead_through_example)
  active, created_at, embedding (vector)

credit_transactions
  id, business_id, type (purchase|usage), amount, session_id, created_at

profiles
  id (= auth.uid), email, full_name, business_id, is_admin, created_at
```

**Memory hierarchy:**
- Business-level memory: shared context across all projects for a business
- Project-level memory: specific to one product initiative, branches from business memory
- On project archive: project memory folds back into business-level memory as a learning summary
- Cross-project learning: a business's second product benefits from what was learned in the first

---

## What Is Shipped (as of current build)

- ✅ Supabase schema — Postgres, Auth, RLS policies
- ✅ Next.js 15 App Router scaffold
- ✅ Auth — login/signup, magic link
- ✅ Dashboard — founder-facing session management
- ✅ Chat session UI — full interview flow, quick-reply chips, segmented bubbles, typing animation
- ✅ LLM wiring — Claude API, structured outputs, blueprint agent system prompt
- ✅ System admin backend — `/admin` route, `is_admin` RLS enforcement
- ✅ Admin: knowledge base CRUD UI
- ✅ Admin: session oversight (all founders, sessions, blueprints)
- ✅ Admin: basic analytics dashboard
- ✅ Admin: site settings
- ✅ Production deploy — Vercel + GitHub auto-deploy
- ✅ Marketing landing page — hero section, admin-editable copy

---

## V1 Remaining Backlog

Everything here must ship before V1 is considered complete. In priority order:

### P1 — Core output (product is incomplete without these)

**1. PDF export**
- Artifact JSON renders as a styled HTML template server-side
- Puppeteer converts HTML to PDF
- Visual canvas layout on its own page (Lean Canvas grid or BMC grid, fields filled in)
- Cover page: product name, founder name, date, branding
- Sections 1–9 formatted as a clean document
- Download link surfaced in chat UI at end of session
- PDF stored in Supabase Storage, URL saved to `artifacts` table
- Versioned — new PDF per session, old ones not overwritten

**2. Knowledge base RAG integration**
- pgvector extension enabled on Supabase
- Embeddings generated for all knowledge base cards (use Anthropic or OpenAI embeddings)
- At Stage 0 (silent intake): query KB by domain, retrieve top 5 relevant cards, inject as `retrieved_context` into agent system prompt
- At trigger points during conversation: re-query when domain signals shift
- Admin UI already exists for managing cards — this wires the retrieval layer

**3. Project lifecycle**
- Project status: `draft` → `active` → `shipped` → `archived`
- Agents behave differently per status:
  - `draft`: full edit mode, all questions re-askable
  - `active`: blueprint locked, downstream pipeline running (V2)
  - `shipped`: read-only, memory folding triggered
  - `archived`: fully read-only, memory folded into business level
- Memory fold on archive: summarise project learnings, write to `businesses.memory_summary`
- UI: project status badge, status transition controls

### P2 — Business model (product cannot be sold without these)

**4. Credit metering**
- `credit_transactions` table tracks all usage
- Token usage logged per session from Anthropic API response
- Exchange rate: 1 credit = X API tokens (calculate based on ~60% margin target)
- Credit balance checked before session start — block if insufficient
- Credits deducted on session completion (not per message — reduces anxiety)
- Admin view: per-business credit balance and transaction history

**5. Stripe integration**
- Credit pack purchase flow (not subscription — usage-based)
- Sold as "credits" not "tokens" in the UI
- Stripe webhook updates `credit_transactions` on successful payment
- Simple pricing page: 3 credit pack sizes
- Post-purchase: credits instantly available, redirect to dashboard

### P3 — Quality and trust (product feels professional without these)

**6. Cascade invalidation UI**
- When a founder edits any artifact mid-session, downstream sections visually marked stale
- Banner: "This section was generated before your last edit. Re-run from here, or keep and continue?"
- Founder decides — hard stop not default-proceed
- Stale state tracked in artifact JSON per section

**7. Gap flagging in UI**
- Sections with unresolved gaps display a visible flag in the blueprint view
- Gap flag text matches what the agent wrote in the artifact JSON
- Founder can click a gap flag to re-open that section's questions
- Cleared when founder provides satisfactory answers

**8. Session resume**
- Founder can close browser mid-session and return
- Session state persists in database — conversation history, current section, answers so far
- On return: agent acknowledges the resume, briefly summarises where they left off, continues from current section

**9. Business and project memory display**
- Founder can see their business memory summary in dashboard
- Project cards show canvas type, status, date, and a one-line summary
- Memory cards visible but not editable by founder (admin-only edit)

---

## V2 Scope (design now, build after V1 is complete)

V2 transforms the Blueprint Engine from a planning tool into a full workflow platform. The data model and artifact format from V1 are designed to support this without a rewrite.

### Product Workflow Pipeline

Sequential agent pipeline triggered from an approved V1 blueprint:

```
Blueprint (V1 output)
    │
    ▼
Product Owner Agent ⇄ Project Manager Agent   [approval gate + revision loop]
    │
    ▼
Solution Architect Agent
    │
    ▼
UX/UI Designer Agent
    │
    ▼
Engineer Agent
    │
    ▼
Tester/QA Agent
```

**Peer review loop rules (prevents infinite loops):**
- Max rounds: 3 (configurable per gate in pipeline config)
- Acceptance score: 0–100, agent approves if score ≥ 70
- Diminishing return check: if score improvement between rounds < 3 points, escalate to founder instead of looping again
- Human breaks deadlock: pipeline pauses, surfaces dispute to founder in workflow UI

**Role configuration per tenant:**
- Roles can be turned on or off per business
- Roles can be renamed and re-prompted within guardrails (same pipeline position, same I/O contract)
- Cannot add fully custom roles in V2 (V3 consideration)

### Marketing Workflow Pipeline

Triggered after Phase 1 of product pipeline is tester-approved:

```
Marketing Strategist Agent ⇄ Content Creator Agent   [approval gate + revision loop]
    │
    ▼
Marketing Designer Agent
    │
    ▼
Scheduler/Launch Ops Agent
```

### n8n-Style Workflow UI

- Visual canvas showing all agent nodes and connections
- Each node shows: role name, status (waiting/running/complete/paused/error), last action
- Clicking a node opens: agent's full log for this run, input artifact, output artifact
- Founder can pause pipeline at any node
- Founder can edit an agent's knowledge/context while paused
- Resume triggers cascade invalidation check for downstream nodes
- Inline approve/reject at gated transitions (PO→PM, Strategist→Content)

**Log format (human-readable, non-technical):**
Each agent emits plain-language status messages during execution. Example:
*"Reviewing blueprint against PM backlog... 2 gaps found, sending back to Product Owner for revision."*
Never raw JSON status codes in the founder-facing log.

### Department Briefs

Auto-generated from the core blueprint at pipeline completion:
- **Engineering Brief** — scope, constraints, technical assumptions, acceptance criteria
- **Marketing Brief** — positioning, key messages, target audience, launch phase
- **Finance Brief** — revenue model, cost assumptions, pricing, break-even estimate

Each brief is a separate PDF export. All derived from the same blueprint artifact — no manual re-entry.

### Async Approval Gates

When a pipeline gate requires founder decision:
- Pipeline hard-stops (does not default-proceed)
- Founder sees notification in dashboard
- Founder reviews the disputed artifact inline
- Founder clicks Approve or Reject with optional note
- Pipeline resumes or routes back based on decision
- Timeout policy: configurable per gate per tenant (default: hard stop, no auto-proceed)

### Global Agent Learning Pipeline (Admin)

- Per-session: agent behavior and founder feedback logged silently
- Per-business: tenant-specific prompt variants stored in `memory_cards` with `tenant_id`
- Global: admin reviews aggregated learnings, promotes high-confidence changes to global KB
- Auto-approve low-risk changes (terminology, example additions)
- Manual review for high-risk changes (acceptance criteria logic, question framework)
- Founder never sees this process — it is entirely background infrastructure

---

## Deliberately Deferred (not in V1 or V2)

These were considered and explicitly removed from scope:

| Feature | Why removed |
|---|---|
| Telegram async approvals | Replaced by inline workflow UI approval gates |
| Like/dislike feedback buttons | Removed — adds complexity without clear V1 value |
| Custom agent roles (fully freeform) | Breaks global learning, explodes support surface |
| Confidence score shown to user | Admin-only — showing to users creates anxiety |
| Multiple simultaneous projects in V1 | One project per business until data model proven |
| UX/UI Designer agent in V1 pipeline | Solo founders often use no-code — not critical path |
| Separate summariser agent | Replaced by inline `log_message` field in agent output contract |
| BMC canvas in V1 | Lean Canvas only for V1 — BMC added in V2 |

---

## Agent Output Contract (reference)

Every agent in the system (V1 blueprint agent and all V2 pipeline agents) must:

1. Emit a `log_message` field with a plain-language human-readable description of what it is doing — streamed to UI before the main output
2. Return a structured JSON object matching its defined output contract
3. Include a `status` field that drives orchestrator routing
4. Include a `confidence` field (high/medium/low) per section — never shown to founder, visible in admin
5. Include a `gaps` array listing unresolved questions — shown to founder as gap flags in UI

---

## Credit Pricing Model (reference)

- Sold as **credits**, not tokens (tokens are internal accounting only)
- 1 credit = X API tokens — exchange rate set to achieve ~60% gross margin
- A complete blueprint session (Sections 0–9, average 2 follow-ups per section) ≈ 25,000–40,000 tokens
- Price per session in credits: calculate before launch and validate against real runs
- Credit packs: 3 sizes (starter / growth / scale) — no subscription in V1
- Credits checked before session start, deducted on completion
- Failed or abandoned sessions: partial deduction (configurable — suggestion: 50% if session abandoned after Section 1)

---

## For Claude Code — How to Use This Document

When the founder asks "what's next," look at the **V1 Remaining Backlog** section. Work through items in P1 → P2 → P3 order.

When starting a new item:
1. Read the description in this document first
2. Check what's already shipped (the ✅ list) to avoid rebuilding existing work
3. Reference the data model section for table and field names — use exact names, don't invent new ones
4. Reference the agent output contract for any AI-related work
5. Ask the founder to confirm before starting any item that touches Stripe, payments, or credit deduction logic

When in doubt about scope, refer to the **Deliberately Deferred** table — if it's listed there, don't build it unless the founder explicitly asks to bring it back.

---

*Last updated: August 2026*
*Produced from product design session — Blueprint Engine V1*
