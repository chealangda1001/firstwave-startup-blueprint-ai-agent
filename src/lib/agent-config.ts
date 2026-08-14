// Plain constants/types shared between server code (site-settings.ts,
// agent.ts) and client components (the admin settings form) — kept out of
// site-settings.ts specifically because that file is marked "server-only",
// and importing anything from it at all breaks a client component's build,
// even if the import itself is just a type or a literal array.

export type AgentEffort = "low" | "medium" | "high";

// Every model currently available to this app's Anthropic account. Kept as
// a plain literal union (not fetched from Anthropic) since the choice is
// deliberately curated, not "whatever the API happens to list today."
export const AGENT_MODEL_OPTIONS = [
  "claude-sonnet-5",
  "claude-opus-5",
  "claude-haiku-4-5-20251001",
  "claude-fable-5",
] as const;
export type AgentModel = (typeof AGENT_MODEL_OPTIONS)[number];

export const AGENT_EFFORT_OPTIONS: AgentEffort[] = ["low", "medium", "high"];
