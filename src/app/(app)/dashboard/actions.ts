"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runAgentTurn } from "@/lib/blueprint/agent";

export async function createSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      founder_id: user.id,
      status: "in_progress",
      current_stage: "stage_0_intake",
    })
    .select("id")
    .single();

  if (error || !session) {
    throw new Error(error?.message ?? "Could not create session.");
  }

  try {
    const startedAt = Date.now();
    const opening = await runAgentTurn([]);
    const responseTimeMs = Date.now() - startedAt;

    const { error: messagesError } = await supabase
      .from("session_messages")
      .insert([
        {
          session_id: session.id,
          role: "log",
          stage: opening.current_stage,
          content: opening.log_message,
          quick_replies: null,
          quick_replies_multi_select: false,
        },
        {
          session_id: session.id,
          role: "assistant",
          stage: opening.current_stage,
          content: opening.reply_markdown,
          quick_replies: opening.quick_replies,
          quick_replies_multi_select: opening.quick_replies_multi_select ?? false,
          response_time_ms: responseTimeMs,
        },
      ]);

    if (messagesError) {
      throw new Error(messagesError.message);
    }

    await supabase
      .from("sessions")
      .update({
        current_stage: opening.current_stage,
        domain: opening.domain,
        title: opening.title,
        canvas_type: opening.canvas_type,
        canvas_selection_reasoning: opening.canvas_selection_reasoning,
      })
      .eq("id", session.id);
  } catch (err) {
    console.error("Failed to generate session opener", err);
    await supabase.from("session_messages").insert({
      session_id: session.id,
      role: "log",
      stage: "stage_0_intake",
      content:
        "Something went wrong starting the session. Send a message below to try again.",
    });
  }

  redirect(`/sessions/${session.id}`);
}

export async function renameSession(sessionId: string, title: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Title can't be empty.");
  }

  // RLS ("sessions: update own") is the real enforcement — this only ever
  // touches a row where founder_id = auth.uid() regardless of the id passed.
  const { error } = await supabase
    .from("sessions")
    .update({ title: trimmed })
    .eq("id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/sessions/${sessionId}`);
}

export async function deleteSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS ("sessions: delete own") is the real enforcement; cascade deletes
  // session_messages/blueprints via their FK to sessions.
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}
