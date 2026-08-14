import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "./anthropic-client";
import { BLUEPRINT_SYSTEM_PROMPT } from "./system-prompt";
import {
  BlueprintArtifactSchema,
  TurnEnvelopeSchema,
  type BlueprintArtifactOutput,
  type TurnEnvelope,
} from "./schemas";
import { retrieveKnowledgeBase, formatRetrievedContext } from "./retrieve-knowledge-base";
import { getSiteSettings } from "@/lib/site-settings";
import type { AgentEffort } from "@/lib/agent-config";

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const KICKOFF_MESSAGE =
  "[SESSION START] Begin the session now, following STAGE 0 exactly as instructed in the system prompt (silent intake, then your opening message and Q1.1).";

const GENERATE_ARTIFACT_MESSAGE =
  "[GENERATE BLUEPRINT] The interview is complete — Sections 1 through 9 have all been covered above. Produce the final blueprint artifact now, following the OUTPUT CONTRACT structure exactly, grounded in everything discussed in this conversation. Flag any gaps honestly per Rule 8 rather than inventing answers.";

// How many of the founder's most recent answers to embed as the retrieval
// query. Recent-only (not the whole transcript) so the query tracks
// wherever the conversation has drifted to, not just where it started.
const RETRIEVAL_HISTORY_WINDOW = 3;

function buildSystemBlock(retrievedContextText: string | null) {
  const blocks: Array<{
    type: "text";
    text: string;
    cache_control?: { type: "ephemeral" };
  }> = [
    {
      type: "text",
      text: BLUEPRINT_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];

  // Deliberately its own block, with no cache_control — this changes every
  // turn as the conversation moves, unlike the main prompt above.
  if (retrievedContextText) {
    blocks.push({ type: "text", text: retrievedContextText });
  }

  return blocks;
}

/**
 * Builds the retrieval query from the founder's own recent words — never
 * the assistant's, which would mostly just match generic interview
 * phrasing back against itself instead of the founder's actual situation.
 * Returns null for a brand-new session, where there's no founder content
 * yet to retrieve against.
 */
async function retrieveContextForHistory(
  history: HistoryMessage[]
): Promise<string | null> {
  const recentFounderText = history
    .filter((m) => m.role === "user")
    .slice(-RETRIEVAL_HISTORY_WINDOW)
    .map((m) => m.content)
    .join("\n\n");

  if (!recentFounderText.trim()) return null;

  const cards = await retrieveKnowledgeBase(recentFounderText);
  return formatRetrievedContext(cards);
}

/**
 * Runs one conversational turn. Pass the prior transcript (user/assistant
 * only — no 'log' rows); pass an empty array for a brand-new session, which
 * triggers the Stage 0 kickoff.
 *
 * Model, effort, and thinking are all admin-configurable (site_settings,
 * migration 0018) rather than hardcoded — the founder-facing latency of
 * this specific call is exactly what that setting exists to tune. Thinking
 * defaults off: this is meant to be a fast, structured-output conversational
 * turn, not a task where deep reasoning materially changes the next
 * question asked (though an admin can turn it on). The heavier synthesis
 * work (generateBlueprintArtifact) always keeps thinking on regardless.
 */
// Structured outputs are schema-valid by definition, but the model can
// still satisfy the schema with degenerate junk instead of a real answer
// under time/effort pressure — observed in production as reply_markdown
// and log_message both coming back as the literal word "placeholder".
// Since that's indistinguishable from a real turn to the type system, we
// check for it explicitly and retry rather than ever showing it to a
// founder.
const DEGENERATE_TEXT = new Set(["placeholder", "tbd", "n/a", "todo", "..."]);

function isDegenerateTurn(turn: TurnEnvelope): boolean {
  const reply = turn.reply_markdown.trim().toLowerCase();
  const log = turn.log_message.trim().toLowerCase();
  return (
    DEGENERATE_TEXT.has(reply) ||
    DEGENERATE_TEXT.has(log) ||
    reply.length < 5
  );
}

const MAX_TURN_ATTEMPTS = 2;

export async function runAgentTurn(
  history: HistoryMessage[]
): Promise<TurnEnvelope> {
  const messages =
    history.length > 0
      ? history
      : [{ role: "user" as const, content: KICKOFF_MESSAGE }];

  const [retrievedContextText, settings] = await Promise.all([
    retrieveContextForHistory(history),
    getSiteSettings(),
  ]);

  let lastTurn: TurnEnvelope | null = null;

  for (let attempt = 1; attempt <= MAX_TURN_ATTEMPTS; attempt++) {
    const response = await anthropic.messages.parse({
      model: settings.agent_model,
      max_tokens: 4096,
      thinking: settings.agent_thinking_enabled
        ? { type: "enabled", budget_tokens: 2048 }
        : { type: "disabled" },
      output_config: {
        // Bump to high effort on a retry — the degenerate output is a sign
        // the model rushed it the first time.
        effort: attempt === 1 ? (settings.agent_effort as AgentEffort) : "high",
        format: zodOutputFormat(TurnEnvelopeSchema),
      },
      system: buildSystemBlock(retrievedContextText),
      messages,
    });

    if (!response.parsed_output) {
      throw new Error("Blueprint agent returned no parsed output for this turn.");
    }

    lastTurn = response.parsed_output;
    if (!isDegenerateTurn(lastTurn)) {
      return lastTurn;
    }

    console.error(
      `Blueprint agent returned degenerate output on attempt ${attempt}`,
      lastTurn
    );
  }

  throw new Error(
    "Blueprint agent returned degenerate output after retrying."
  );
}

/**
 * Synthesizes the full 9-section blueprint artifact from the completed
 * transcript. Called once, when a turn's session_status flips to "complete".
 * Uses its own admin-configurable model (settings.artifact_model), not
 * runAgentTurn's — deliberately decoupled (migration 0021): a Sonnet 5
 * conversational-turn latency win previously broke this call outright in
 * production ("the compiled grammar is too large" from Anthropic — the
 * full BlueprintArtifactSchema is too complex for Sonnet 5's
 * structured-output grammar compiler, a limit Opus tolerates). Synthesis
 * only runs once per session and isn't latency-sensitive the way a live
 * turn is, so it can afford a heavier default model.
 */
export async function generateBlueprintArtifact(
  history: HistoryMessage[]
): Promise<BlueprintArtifactOutput> {
  const messages = [
    ...history,
    { role: "user" as const, content: GENERATE_ARTIFACT_MESSAGE },
  ];

  const settings = await getSiteSettings();

  const response = await anthropic.messages.parse({
    model: settings.artifact_model,
    max_tokens: 16000,
    output_config: {
      effort: settings.artifact_effort as AgentEffort,
      format: zodOutputFormat(BlueprintArtifactSchema),
    },
    // No retrieval here — this is synthesis from the completed transcript,
    // not a live question that benefits from market-calibration context.
    system: buildSystemBlock(null),
    messages,
  });

  if (!response.parsed_output) {
    throw new Error("Blueprint agent returned no parsed output for the artifact.");
  }

  return response.parsed_output;
}
