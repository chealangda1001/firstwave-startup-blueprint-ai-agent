"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

export async function createKnowledgeBaseCard(input: KnowledgeBaseCardInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_base").insert({
    title: input.title,
    domain: input.domain,
    card_type: input.card_type,
    content: input.content,
    is_active: input.is_active,
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
  const { error } = await supabase
    .from("knowledge_base")
    .update({
      title: input.title,
      domain: input.domain,
      card_type: input.card_type,
      content: input.content,
      is_active: input.is_active,
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
