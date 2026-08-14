/**
 * One-time (and safe to re-run) backfill: embeds every active knowledge_base
 * card that doesn't have an embedding yet. New cards get embedded
 * automatically on create/update (see admin/knowledge-base/actions.ts) —
 * this only exists for cards that were created before that wiring existed,
 * or any row where embedding failed and was left null at write time.
 *
 * Run with: npx tsx scripts/backfill-knowledge-base-embeddings.ts
 * Requires .env.local to have SUPABASE_SERVICE_ROLE_KEY and VOYAGE_API_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const VOYAGE_MODEL = "voyage-3-lite";

async function embedDocuments(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set in .env.local");

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL, input_type: "document" }),
  });

  if (!response.ok) {
    throw new Error(`Voyage request failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return data.data.map((d) => d.embedding);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  }

  const supabase = createClient(url, serviceKey);

  const { data: cards, error } = await supabase
    .from("knowledge_base")
    .select("id, title, domain, content")
    .is("embedding", null);

  if (error) throw error;

  if (!cards || cards.length === 0) {
    console.log("No cards need embedding — all set.");
    return;
  }

  console.log(`Embedding ${cards.length} card(s)...`);

  // Voyage batches multiple inputs per request; keep batches modest so one
  // slow/failed request doesn't lose progress on everything else.
  const BATCH_SIZE = 20;
  let embedded = 0;

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => `${c.title}\n${c.domain}\n${c.content}`);
    const embeddings = await embedDocuments(texts);

    for (let j = 0; j < batch.length; j++) {
      const { error: updateError } = await supabase
        .from("knowledge_base")
        .update({ embedding: embeddings[j] as unknown as string })
        .eq("id", batch[j].id);

      if (updateError) {
        console.error(`Failed to save embedding for "${batch[j].title}":`, updateError.message);
        continue;
      }
      embedded++;
    }

    console.log(`  ${embedded}/${cards.length} done`);
  }

  console.log(`Backfill complete: ${embedded}/${cards.length} card(s) embedded.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
