"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runAgentTurn, generateBlueprintArtifact } from "@/lib/blueprint/agent";
import { saveBlueprintArtifact } from "@/lib/blueprint/persist";

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
    .select("id, current_stage, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.status === "complete") return;

  const { error: insertUserError } = await supabase
    .from("session_messages")
    .insert({
      session_id: sessionId,
      role: "user",
      stage: session.current_stage,
      content,
    });

  if (insertUserError) {
    throw new Error(insertUserError.message);
  }

  const { data: priorMessages } = await supabase
    .from("session_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });

  const history = (priorMessages ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let turn;
  try {
    turn = await runAgentTurn(history);
  } catch (err) {
    console.error("runAgentTurn failed", err);
    await supabase.from("session_messages").insert({
      session_id: sessionId,
      role: "log",
      stage: session.current_stage,
      content:
        "Something went wrong reaching the blueprint agent. Please try sending your last message again.",
    });
    revalidatePath(`/sessions/${sessionId}`);
    return;
  }

  const { error: insertReplyError } = await supabase
    .from("session_messages")
    .insert([
      {
        session_id: sessionId,
        role: "log",
        stage: turn.current_stage,
        content: turn.log_message,
      },
      {
        session_id: sessionId,
        role: "assistant",
        stage: turn.current_stage,
        content: turn.reply_markdown,
      },
    ]);

  if (insertReplyError) {
    throw new Error(insertReplyError.message);
  }

  // Only flip the session to "complete" once the artifact is safely saved —
  // otherwise a founder who reached the end can never retry generation.
  let finalStatus: "in_progress" | "complete" = turn.session_status;

  if (turn.session_status === "complete") {
    const fullHistory = [
      ...history,
      { role: "user" as const, content },
      { role: "assistant" as const, content: turn.reply_markdown },
    ];

    try {
      const artifact = await generateBlueprintArtifact(fullHistory);
      await saveBlueprintArtifact(supabase, sessionId, artifact);
    } catch (err) {
      console.error("generateBlueprintArtifact failed", err);
      finalStatus = "in_progress";
      await supabase.from("session_messages").insert({
        session_id: sessionId,
        role: "log",
        stage: turn.current_stage,
        content:
          "Something went wrong generating your final blueprint. Send any message to try again.",
      });
    }
  }

  await supabase
    .from("sessions")
    .update({
      current_stage: turn.current_stage,
      domain: turn.domain,
      title: turn.title,
      canvas_type: turn.canvas_type,
      canvas_selection_reasoning: turn.canvas_selection_reasoning,
      status: finalStatus,
    })
    .eq("id", sessionId);

  revalidatePath(`/sessions/${sessionId}`);
}
