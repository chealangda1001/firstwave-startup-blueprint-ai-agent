"use server";

import { redirect } from "next/navigation";
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
    const opening = await runAgentTurn([]);

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
