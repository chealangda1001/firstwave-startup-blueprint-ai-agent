"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_0_OPENING, Q1_1_EXISTENCE_TEST } from "@/lib/blueprint/opening";

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
      current_stage: "stage_1_problem",
    })
    .select("id")
    .single();

  if (error || !session) {
    throw new Error(error?.message ?? "Could not create session.");
  }

  const { error: messagesError } = await supabase
    .from("session_messages")
    .insert([
      {
        session_id: session.id,
        role: "assistant",
        stage: "stage_0_intake",
        content: STAGE_0_OPENING,
      },
      {
        session_id: session.id,
        role: "assistant",
        stage: "stage_1_problem",
        content: Q1_1_EXISTENCE_TEST,
      },
    ]);

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  redirect(`/sessions/${session.id}`);
}
