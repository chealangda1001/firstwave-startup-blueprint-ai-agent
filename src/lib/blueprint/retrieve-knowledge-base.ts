import "server-only";
import { createClient } from "@/lib/supabase/server";
import { embedQuery } from "./embeddings";

const MATCH_COUNT = 5;
const MIN_SIMILARITY = 0.3;

export interface RetrievedCard {
  id: string;
  title: string;
  domain: string;
  card_type: string;
  content: string;
  similarity: number;
}

/**
 * Finds the knowledge base cards most relevant to what the founder has
 * said so far — this is the `retrieved_context` the system prompt has
 * always claimed to receive (see docs/blueprint-agent-system-prompt.md)
 * but, until this, never actually did.
 *
 * Query text should be the founder's own words (recent conversation
 * content), not the assistant's — embedding the agent's own questions back
 * against a knowledge base of founder lessons would mostly just match
 * generic interview phrasing rather than the founder's actual situation.
 */
export async function retrieveKnowledgeBase(
  queryText: string
): Promise<RetrievedCard[]> {
  if (!queryText.trim()) return [];

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedQuery(queryText);
  } catch (err) {
    // Retrieval is an enhancement, not a hard dependency — a Voyage outage
    // or rate limit should degrade to "no extra context" rather than
    // taking the whole conversational turn down with it.
    console.error("retrieveKnowledgeBase: embedQuery failed", err);
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_knowledge_base", {
    query_embedding: queryEmbedding as unknown as string,
    match_count: MATCH_COUNT,
    min_similarity: MIN_SIMILARITY,
  });

  if (error) {
    console.error("retrieveKnowledgeBase: match_knowledge_base failed", error);
    return [];
  }

  return data ?? [];
}

const CARD_TYPE_LABEL: Record<string, string> = {
  founder_lesson: "Founder lesson",
  market_context: "Market context",
  lead_through_example: "Lead-through example",
};

/**
 * Formats retrieved cards into the text block injected into the system
 * prompt. Kept out of the cached main system block (see
 * buildSystemBlock in agent.ts) since this changes turn to turn.
 */
export function formatRetrievedContext(cards: RetrievedCard[]): string | null {
  if (cards.length === 0) return null;

  const entries = cards
    .map((card) => {
      const label = CARD_TYPE_LABEL[card.card_type] ?? card.card_type;
      return `[${label} — ${card.domain}] ${card.title}\n${card.content}`;
    })
    .join("\n\n");

  return `RETRIEVED_CONTEXT (founder knowledge base — use to calibrate questions and flag realistic Cambodia/SEA-market concerns per Rule 7; never quote these verbatim to the founder):\n\n${entries}`;
}
