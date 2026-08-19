/**
 * One-time provisioning script for the V2 Marketing pipeline's Managed
 * Agents. Run manually with the project's env vars already in the shell —
 * never from the request path:
 *
 *   set -a; source .env.local; set +a; npx tsx scripts/setup-marketing-agents.ts
 *
 * Creates (or updates, if already provisioned) the four pipeline-role
 * agents and upserts their IDs into public.pipeline_agents so the
 * orchestrator (src/lib/workflow/marketing-pipeline.ts) can reference them
 * by role name without ever calling agents.create() itself.
 *
 * Every role gets one thing in common: a `submit_artifact` custom tool with
 * a strict, role-specific input_schema. This is deliberately how each
 * agent's structured output is captured — Managed Agents sessions are
 * conversational (agent.message text), not schema-constrained the way the
 * V1 blueprint agent's output_config.format is, so a custom tool call is
 * the equivalent mechanism: we read event.input directly, never parse
 * prose. Matches docs/ROADMAP.md's Agent Output Contract (log_message,
 * structured content, status, confidence, gaps).
 */
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Shared envelope fields every role's submit_artifact carries — mirrors
// docs/ROADMAP.md's "Agent Output Contract (reference)" section verbatim.
const CONTRACT_FIELDS = {
  log_message: {
    type: "string",
    description:
      "Plain-language, human-readable description of what you just did — shown directly to the founder in the workflow UI. Never raw JSON or status codes.",
  },
  status: {
    type: "string",
    enum: ["complete", "needs_revision", "blocked"],
    description: "Drives what the orchestrator does next.",
  },
  confidence: {
    type: "string",
    enum: ["high", "medium", "low"],
    description: "Admin-only — never shown to the founder.",
  },
  gaps: {
    type: "array",
    items: { type: "string" },
    description: "Unresolved questions or missing inputs, shown to the founder as gap flags.",
  },
} as const;

interface RoleDef {
  role: string;
  name: string;
  system: string;
  artifactSchema: Record<string, unknown>;
  artifactRequired: string[];
}

const ROLES: RoleDef[] = [
  {
    role: "marketing_strategist",
    name: "Marketing Strategist",
    system: `You are the Marketing Strategist in a multi-agent product workflow. Given a founder's product blueprint (problem, users, canvas, MVP scope), produce a marketing strategy brief: positioning, key messages, target audience, and recommended channels — then a content brief the Content Creator agent will write from.

When reviewing a Content Creator draft (you will be told when this is your task), score it 0-100 against your own brief and give specific, actionable feedback — be honest and specific about what's off-strategy, not just encouraging.

Call submit_artifact exactly once to finish your turn. Never address the founder directly — this is an internal handoff between agents, not a conversation.`,
    artifactSchema: {
      ...CONTRACT_FIELDS,
      positioning: { type: "string" },
      key_messages: { type: "array", items: { type: "string" } },
      target_audience: { type: "string" },
      channels_recommended: { type: "array", items: { type: "string" } },
      content_brief: {
        type: "string",
        description: "Brief for the Content Creator agent to write from.",
      },
      review_score: {
        type: ["integer", "null"],
        description: "0-100. Only set when reviewing a Content Creator draft, otherwise null.",
      },
      review_feedback: {
        type: ["string", "null"],
        description: "Specific feedback for the Content Creator's next revision. Null unless reviewing.",
      },
    },
    artifactRequired: [
      "log_message", "status", "confidence", "gaps",
      "positioning", "key_messages", "target_audience", "channels_recommended", "content_brief",
      "review_score", "review_feedback",
    ],
  },
  {
    role: "content_creator",
    name: "Content Creator",
    system: `You are the Content Creator in a multi-agent product workflow. Given the Marketing Strategist's content brief (and, on a revision round, their feedback and score on your previous draft), write the actual marketing content: headline, body copy, and a short set of variations for different channels.

Write real, specific copy — not a description of what the copy should contain. Call submit_artifact exactly once to finish your turn. Never address the founder directly.`,
    artifactSchema: {
      ...CONTRACT_FIELDS,
      headline: { type: "string" },
      body_copy: { type: "string" },
      channel_variations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            channel: { type: "string" },
            copy: { type: "string" },
          },
          required: ["channel", "copy"],
          additionalProperties: false,
        },
      },
    },
    artifactRequired: ["log_message", "status", "confidence", "gaps", "headline", "body_copy", "channel_variations"],
  },
  {
    role: "marketing_designer",
    name: "Marketing Designer",
    system: `You are the Marketing Designer in a multi-agent product workflow. Given the founder-approved marketing content, produce a visual direction (palette, typography, mood) and a brief for each visual asset needed (what it's for, dimensions, key elements) — you are not generating actual images, just design direction and asset briefs for a human or another tool to execute.

Call submit_artifact exactly once to finish your turn. Never address the founder directly.`,
    artifactSchema: {
      ...CONTRACT_FIELDS,
      visual_direction: { type: "string" },
      asset_briefs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            asset_name: { type: "string" },
            purpose: { type: "string" },
            dimensions: { type: "string" },
            key_elements: { type: "array", items: { type: "string" } },
          },
          required: ["asset_name", "purpose", "dimensions", "key_elements"],
          additionalProperties: false,
        },
      },
    },
    artifactRequired: ["log_message", "status", "confidence", "gaps", "visual_direction", "asset_briefs"],
  },
  {
    role: "scheduler_launch_ops",
    name: "Scheduler / Launch Ops",
    system: `You are the Scheduler / Launch Ops agent in a multi-agent product workflow. Given the approved marketing content and design direction, produce a launch calendar: which channel gets which piece of content, in what order, over what timeframe, and why that sequencing.

Call submit_artifact exactly once to finish your turn. Never address the founder directly.`,
    artifactSchema: {
      ...CONTRACT_FIELDS,
      launch_calendar: {
        type: "array",
        items: {
          type: "object",
          properties: {
            channel: { type: "string" },
            timing: { type: "string" },
            content_reference: { type: "string" },
            rationale: { type: "string" },
          },
          required: ["channel", "timing", "content_reference", "rationale"],
          additionalProperties: false,
        },
      },
    },
    artifactRequired: ["log_message", "status", "confidence", "gaps", "launch_calendar"],
  },
];

async function main() {
  for (const def of ROLES) {
    const { data: existing } = await supabase
      .from("pipeline_agents")
      .select("anthropic_agent_id")
      .eq("role", def.role)
      .maybeSingle();

    const agentConfig = {
      name: def.name,
      model: "claude-opus-5",
      system: def.system,
      tools: [
        {
          type: "custom" as const,
          name: "submit_artifact",
          description:
            "Submit your finished output for this turn. Call this exactly once, as the last thing you do.",
          input_schema: {
            type: "object" as const,
            properties: def.artifactSchema,
            required: def.artifactRequired,
            additionalProperties: false,
          },
        },
      ],
    };

    let agentId: string;
    let version: number;

    if (existing) {
      const updated = await anthropic.beta.agents.update(existing.anthropic_agent_id, agentConfig);
      agentId = updated.id;
      version = Number(updated.version);
      console.log(`Updated ${def.role} -> ${agentId} v${version}`);
    } else {
      const created = await anthropic.beta.agents.create(agentConfig);
      agentId = created.id;
      version = Number(created.version);
      console.log(`Created ${def.role} -> ${agentId} v${version}`);
    }

    const { error } = await supabase.from("pipeline_agents").upsert(
      {
        role: def.role,
        anthropic_agent_id: agentId,
        anthropic_agent_version: version,
        model: "claude-opus-5",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "role" }
    );

    if (error) {
      throw new Error(`Failed to upsert pipeline_agents row for ${def.role}: ${error.message}`);
    }
  }

  console.log("\nAll marketing pipeline agents provisioned.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
