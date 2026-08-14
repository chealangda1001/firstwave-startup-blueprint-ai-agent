"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { embedDocument } from "@/lib/blueprint/embeddings";
import type { KnowledgeBaseCardType } from "@/types/database.types";

export interface KnowledgeBaseCardInput {
  title: string;
  domain: string;
  card_type: KnowledgeBaseCardType;
  content: string;
  is_active: boolean;
}

/**
 * Every mutation here relies on the "knowledge_base: admin *" RLS policies
 * from migration 0004 as the real enforcement — a non-admin's request would
 * be rejected by Postgres even if this code path were somehow reached. The
 * /admin layout check is the first gate; RLS is the one that actually
 * matters.
 */

/**
 * Title and domain are folded into the embedded text alongside content —
 * a founder lesson titled "ABA Pay adoption in Battambang" carries real
 * signal in the title/domain that similarity search over content alone
 * would miss.
 */
function embeddableText(input: KnowledgeBaseCardInput): string {
  return `${input.title}\n${input.domain}\n${input.content}`;
}

export async function createKnowledgeBaseCard(input: KnowledgeBaseCardInput) {
  const supabase = await createClient();

  // Retrieval is an enhancement, not a hard dependency for the CRUD action
  // itself — a Voyage hiccup shouldn't block saving the card. It just
  // won't be retrievable until the next edit (or the backfill script)
  // successfully embeds it.
  let embedding: number[] | null = null;
  try {
    embedding = await embedDocument(embeddableText(input));
  } catch (err) {
    console.error("createKnowledgeBaseCard: embedDocument failed", err);
  }

  const { error } = await supabase.from("knowledge_base").insert({
    title: input.title,
    domain: input.domain,
    card_type: input.card_type,
    content: input.content,
    is_active: input.is_active,
    embedding: embedding as unknown as string,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/knowledge-base");
}

export async function updateKnowledgeBaseCard(
  id: string,
  input: KnowledgeBaseCardInput
) {
  const supabase = await createClient();

  let embedding: number[] | null = null;
  try {
    embedding = await embedDocument(embeddableText(input));
  } catch (err) {
    console.error("updateKnowledgeBaseCard: embedDocument failed", err);
  }

  const { error } = await supabase
    .from("knowledge_base")
    .update({
      title: input.title,
      domain: input.domain,
      card_type: input.card_type,
      content: input.content,
      is_active: input.is_active,
      ...(embedding ? { embedding: embedding as unknown as string } : {}),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/knowledge-base");
}

export async function deleteKnowledgeBaseCard(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_base").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/knowledge-base");
}

export async function setKnowledgeBaseCardActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("knowledge_base")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/knowledge-base");
}
