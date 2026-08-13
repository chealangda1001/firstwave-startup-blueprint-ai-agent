import { z } from "zod";

/**
 * Structured-output schemas for the blueprint agent's Claude calls.
 *
 * Two separate schemas, two separate calls, by design:
 *  - TurnEnvelopeSchema: small, sent on every conversational turn.
 *  - BlueprintArtifactSchema: large (mirrors the full OUTPUT CONTRACT),
 *    sent once — only when the conversation reaches completion — so the
 *    per-turn schema stays cheap.
 */

const confidence = z.enum(["high", "medium", "low"]);

const quickReply = z.object({
  label: z.string().describe("Short button text, e.g. 'Medium'."),
  value: z
    .string()
    .describe(
      "The full text submitted as the founder's answer when this option is picked — written as if the founder said it themselves, e.g. 'Medium — comfortable with everyday apps but hasn't paid for software before.'"
    ),
});

export const TurnEnvelopeSchema = z.object({
  log_message: z
    .string()
    .describe(
      "Short human-readable status line for the UI. Plain sentence, present tense, no jargon. E.g. 'Checking your problem statement against quality criteria...'"
    ),
  reply_markdown: z
    .string()
    .describe(
      "The single conversational message to show the founder next — the actual next thing you'd say out loud. This is the only text the founder sees; write it exactly as instructed by the system prompt (one question at a time, lead-throughs when stuck, pushback when thin, transition messages between stages)."
    ),
  domain: z
    .string()
    .nullable()
    .describe(
      "Detected industry/domain once known, e.g. 'hospitality tech'. Null until Stage 0 has enough signal."
    ),
  title: z
    .string()
    .nullable()
    .describe(
      "Short title for this session once knowable (company/product name or one-line concept). Null if not yet known."
    ),
  canvas_type: z
    .enum(["lean", "bmc"])
    .nullable()
    .describe("Selected canvas framework. Null until Stage 0 selects one."),
  canvas_selection_reasoning: z
    .string()
    .nullable()
    .describe("One or two sentences on why that canvas was chosen. Null until chosen."),
  current_stage: z
    .string()
    .describe(
      "Machine-readable stage id: stage_0_intake | stage_1_problem | stage_2_users | stage_3_canvas | stage_4_8_generated | stage_9_market_fit | complete."
    ),
  session_status: z
    .enum(["in_progress", "complete"])
    .describe(
      "'complete' only once Section 9 has been asked and answered and you are ready to generate the final blueprint artifact."
    ),
  quick_replies: z
    .array(quickReply)
    .nullable()
    .describe(
      "2-5 tappable answer choices, ONLY for genuinely bounded/categorical questions (tech sophistication, same-vs-different decision maker, yes/no confirmations, pricing-intentional-or-not checks). Null for every narrative question (describe a person, describe your advantage, etc.) — those need the founder's own unique detail and a chip would be meaningless. Never turn lead-through examples into quick_replies; those are illustrations, not answer choices for the founder."
    ),
  quick_replies_multi_select: z
    .boolean()
    .nullable()
    .describe(
      "True only on the rare question where more than one option can apply at once. Null/false otherwise (the default — picking one option submits it immediately)."
    ),
});

export type TurnEnvelope = z.infer<typeof TurnEnvelopeSchema>;

const roadmapPhase = z.object({
  goal: z.string(),
  timing: z.string(),
  scope: z.array(z.string()),
});

const leanCanvasFields = z.object({
  problem: z.string(),
  customer_segments: z.string(),
  unique_value_proposition: z.string(),
  solution: z.string(),
  channels: z.string(),
  revenue_streams: z.string(),
  cost_structure: z.string(),
  key_metrics: z.string(),
  unfair_advantage: z.string(),
});

const bmcFields = z.object({
  key_partners: z.string(),
  key_activities: z.string(),
  key_resources: z.string(),
  value_propositions: z.string(),
  customer_relationships: z.string(),
  channels: z.string(),
  customer_segments: z.string(),
  cost_structure: z.string(),
  revenue_streams: z.string(),
});

export const BlueprintArtifactSchema = z.object({
  canvas_type: z.enum(["lean", "bmc"]),
  section_1_problem: z.object({
    existence: z.string(),
    frequency_and_cost: z.string(),
    current_solution: z.string(),
    why_now: z.string(),
    confidence,
    gaps: z.array(z.string()),
  }),
  section_2_users: z.object({
    primary_user: z.string(),
    decision_maker: z.string(),
    tech_sophistication: z.string(),
    real_motivation: z.string(),
    confidence,
    gaps: z.array(z.string()),
  }),
  section_3_canvas: z.object({
    type: z.enum(["lean", "bmc"]),
    fields_lean: leanCanvasFields.nullable(),
    fields_bmc: bmcFields.nullable(),
    confidence,
    gaps: z.array(z.string()),
  }),
  section_4_mvp_scope: z.object({
    in_scope: z.array(z.string()),
    out_of_scope: z.array(z.string()),
    gaps: z.array(z.string()),
  }),
  section_5_success_metrics: z.object({
    product: z.string(),
    marketing: z.string(),
    finance: z.string(),
    gaps: z.array(z.string()),
  }),
  section_6_risks: z.array(
    z.object({
      assumption: z.string(),
      risk_if_wrong: z.string(),
      danger_level: z.enum(["high", "medium", "low"]),
    })
  ),
  section_7_roadmap: z.object({
    phase_1: roadmapPhase,
    phase_2: roadmapPhase,
    phase_3: roadmapPhase,
  }),
  section_8_open_questions: z.array(z.string()),
  section_9_founder_market_fit: z.object({
    strengths: z.string(),
    gaps: z.string(),
    suggestion: z.string(),
    narrative: z.string(),
  }),
});

export type BlueprintArtifactOutput = z.infer<typeof BlueprintArtifactSchema>;
