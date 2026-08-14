import "server-only";

// voyage-3-lite: cheap, fast, 512-dim — plenty for a knowledge base this
// size (dozens to low hundreds of cards), and keeps the pgvector index
// small. Bump to voyage-3 (1024-dim) later if retrieval quality ever
// becomes the bottleneck; the embedding column would need to change size.
const VOYAGE_MODEL = "voyage-3-lite";
const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";

interface VoyageEmbeddingsResponse {
  data: Array<{ embedding: number[] }>;
}

/**
 * Embeds one or more strings via Voyage AI. `inputType` tells the model
 * which side of the retrieval pair this is — Voyage (like most retrieval
 * embedding models) trains asymmetric "query" vs "document" encodings, and
 * using the right one measurably improves match quality over embedding
 * both sides the same way.
 */
async function embed(
  texts: string[],
  inputType: "query" | "document"
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set.");
  }

  const response = await fetch(VOYAGE_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage embeddings request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as VoyageEmbeddingsResponse;
  return data.data.map((d) => d.embedding);
}

/** Embeds a knowledge base card's content — the "document" side of retrieval. */
export async function embedDocument(text: string): Promise<number[]> {
  const [vector] = await embed([text], "document");
  return vector;
}

/** Embeds a founder's conversation text — the "query" side of retrieval. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([text], "query");
  return vector;
}

/** Batch document embedding — used by the backfill script. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  return embed(texts, "document");
}
