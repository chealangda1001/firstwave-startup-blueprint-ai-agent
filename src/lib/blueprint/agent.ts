import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, BLUEPRINT_MODEL } from "./anthropic-client";
import { BLUEPRINT_SYSTEM_PROMPT } from "./system-prompt";
import {
  BlueprintArtifactSchema,
  TurnEnvelopeSchema,
  type BlueprintArtifactOutput,
  type TurnEnvelope,
} from "./schemas";

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const KICKOFF_MESSAGE =
  "[SESSION START] Begin the session now, following STAGE 0 exactly as instructed in the system prompt (silent intake, then your opening message and Q1.1).";

const GENERATE_ARTIFACT_MESSAGE =
  "[GENERATE BLUEPRINT] The interview is complete — Sections 1 through 9 have all been covered above. Produce the final blueprint artifact now, following the OUTPUT CONTRACT structure exactly, grounded in everything discussed in this conversation. Flag any gaps honestly per Rule 8 rather than inventing answers.";

function buildSystemBlock() {
  return [
    {
      type: "text" as const,
      text: BLUEPRINT_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

/**
 * Runs one conversational turn. Pass the prior transcript (user/assistant
 * only — no 'log' rows); pass an empty array for a brand-new session, which
 * triggers the Stage 0 kickoff.
 *
 * Thinking is explicitly disabled here: this is a fast, structured-output
 * conversational turn, not a task where deep reasoning materially changes
 * the next question asked. The heavier synthesis work (generateBlueprintArtifact)
 * keeps adaptive thinking on.
 */
export async function runAgentTurn(
  history: HistoryMessage[]
): Promise<TurnEnvelope> {
  const messages =
    history.length > 0
      ? history
      : [{ role: "user" as const, content: KICKOFF_MESSAGE }];

  const response = await anthropic.messages.parse({
    model: BLUEPRINT_MODEL,
    max_tokens: 4096,
    thinking: { type: "disabled" },
    output_config: {
      effort: "medium",
      format: zodOutputFormat(TurnEnvelopeSchema),
    },
    system: buildSystemBlock(),
    messages,
  });

  if (!response.parsed_output) {
    throw new Error("Blueprint agent returned no parsed output for this turn.");
  }

  return response.parsed_output;
}

/**
 * Synthesizes the full 9-section blueprint artifact from the completed
 * transcript. Called once, when a turn's session_status flips to "complete".
 */
export async function generateBlueprintArtifact(
  history: HistoryMessage[]
): Promise<BlueprintArtifactOutput> {
  const messages = [
    ...history,
    { role: "user" as const, content: GENERATE_ARTIFACT_MESSAGE },
  ];

  const response = await anthropic.messages.parse({
    model: BLUEPRINT_MODEL,
    max_tokens: 16000,
    output_config: {
      effort: "high",
      format: zodOutputFormat(BlueprintArtifactSchema),
    },
    system: buildSystemBlock(),
    messages,
  });

  if (!response.parsed_output) {
    throw new Error("Blueprint agent returned no parsed output for the artifact.");
  }

  return response.parsed_output;
}
