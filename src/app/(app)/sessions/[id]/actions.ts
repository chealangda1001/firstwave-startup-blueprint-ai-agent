"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PHASE_3_PLACEHOLDER_NOTE } from "@/lib/blueprint/opening";

export async function sendMessage(sessionId: string, formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: session } = await supabase
    .from("sessions")
    .select("id, current_stage")
    .eq("id", sessionId)
    .single();

  if (!session) return;

  const { error } = await supabase.from("session_messages").insert({
    session_id: sessionId,
    role: "user",
    stage: session.current_stage,
    content,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Placeholder until Phase 3 wires up the real agent reasoning.
  await supabase.from("session_messages").insert({
    session_id: sessionId,
    role: "log",
    stage: session.current_stage,
    content: PHASE_3_PLACEHOLDER_NOTE,
  });

  revalidatePath(`/sessions/${sessionId}`);
}
