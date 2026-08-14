"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { runAgentTurn, generateBlueprintArtifact } from "@/lib/blueprint/agent";
import { saveBlueprintArtifact } from "@/lib/blueprint/persist";
import type { Database } from "@/types/database.types";

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Runs one agent turn against `history` and persists the result — shared by
 * sendMessage (after inserting the new user row) and retryLastTurn (which
 * replays the same history with no new user row, so a failed turn never
 * needs the founder to retype their answer). On failure this inserts a log
 * row for the record but does NOT throw — the caller's revalidatePath
 * still runs, and the page derives "still unanswered" from the message
 * shape itself (last visible message is role=user), not from this row, so
 * a retry stays available either way.
 */
async function runTurnAndPersist(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  currentStage: string,
  history: HistoryMessage[]
) {
  let turn;
  const startedAt = Date.now();
  let responseTimeMs: number;
  try {
    turn = await runAgentTurn(history);
    responseTimeMs = Date.now() - startedAt;
  } catch (err) {
    console.error("runAgentTurn failed", err);
    await supabase.from("session_messages").insert({
      session_id: sessionId,
      role: "log",
      stage: currentStage,
      content:
        "Something went wrong reaching the blueprint agent. Please try sending your last message again.",
    });
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
        quick_replies: null,
        quick_replies_multi_select: false,
      },
      {
        session_id: sessionId,
        role: "assistant",
        stage: turn.current_stage,
        content: turn.reply_markdown,
        quick_replies: turn.quick_replies,
        quick_replies_multi_select: turn.quick_replies_multi_select ?? false,
        response_time_ms: responseTimeMs,
      },
    ]);

  if (insertReplyError) {
    throw new Error(insertReplyError.message);
  }

  // Only flip the session to "complete" once the artifact is safely saved —
  // otherwise a founder who reached the end can never retry generation.
  let finalStatus: "in_progress" | "complete" = turn.session_status;

  if (turn.session_status === "complete") {
    const fullHistory = [...history, { role: "assistant" as const, content: turn.reply_markdown }];

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
}

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

  await runTurnAndPersist(supabase, sessionId, session.current_stage, history);
  revalidatePath(`/sessions/${sessionId}`);
}

/**
 * Recovers a session stuck after a failed turn — the founder's last message
 * has no reply and nothing else can move the conversation forward. Replays
 * the exact same history (no new user row), so retrying never duplicates
 * their answer or requires retyping it.
 */
export async function retryLastTurn(sessionId: string) {
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

  // Nothing to retry if the last turn already got a reply.
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return;
  }

  await runTurnAndPersist(supabase, sessionId, session.current_stage, history);
  revalidatePath(`/sessions/${sessionId}`);
}
