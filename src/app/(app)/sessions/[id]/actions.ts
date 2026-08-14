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
 *
 * Deliberately does NOT run the blueprint synthesis itself, even when this
 * turn is the closing one (session_status "complete") — that's a second,
 * much slower model call, and folding it into this same round-trip left
 * the founder staring at a generic spinner with no honest signal for what
 * was actually taking so long, then seeing the closing reply ("give me a
 * moment...") arrive already-stale, well after the moment had passed. This
 * function instead lands the conversational turn as its own fast,
 * self-contained update — flipping status to "generating" rather than
 * straight to "complete" — and the founder-visible synthesis step happens
 * in its own separate call (see generateBlueprintForSession below),
 * triggered by GenerateBlueprintPanel the instant "generating" reaches the
 * page.
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

  // "complete" here means "the interview is done" per the model's own
  // judgement — mapped to "generating" so the UI can show the synthesis
  // step as its own honest, separately-triggered phase instead of a done
  // deal that hasn't actually happened yet.
  const finalStatus: "in_progress" | "generating" =
    turn.session_status === "complete" ? "generating" : "in_progress";

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

  if (!session || session.status === "complete" || session.status === "generating") {
    return;
  }

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

  if (!session || session.status === "complete" || session.status === "generating") {
    return;
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

  // Nothing to retry if the last turn already got a reply.
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return;
  }

  await runTurnAndPersist(supabase, sessionId, session.current_stage, history);
  revalidatePath(`/sessions/${sessionId}`);
}

/**
 * The blueprint synthesis step, on its own — called by GenerateBlueprintPanel
 * the moment a session lands on status "generating" (see page.tsx), so the
 * founder gets a dedicated, honestly-worded "generating your blueprint"
 * state for exactly as long as this actually takes, instead of it being
 * silently bundled into the closing conversational turn. Idempotent
 * (saveBlueprintArtifact upserts on session_id), so a duplicate call from a
 * second tab or a client remount just overwrites the same row rather than
 * corrupting anything.
 *
 * Returns a plain result object rather than throwing on failure. Next.js
 * masks thrown Error messages from Server Actions in production by
 * default (replaced client-side with a generic "Minified React error
 * #441" digest, with no way to recover the real text) — a real bug we hit
 * live: the founder saw that raw digest instead of a usable message.
 * Returning the message as data sidesteps that entirely, since it's never
 * an uncaught exception crossing the server/client boundary.
 */
export type GenerateBlueprintResult =
  | { ok: true }
  | { ok: false; message: string };

export async function generateBlueprintForSession(
  sessionId: string
): Promise<GenerateBlueprintResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { data: session } = await supabase
    .from("sessions")
    .select("id, founder_id, status, current_stage")
    .eq("id", sessionId)
    .single();

  if (!session) return { ok: false, message: "Session not found." };
  if (session.founder_id !== user.id) {
    return { ok: false, message: "You don't have access to this session." };
  }
  // Already done, or not actually waiting on this step (e.g. a stale
  // client retriggering after a previous failure already reset status) —
  // either way, nothing to do here.
  if (session.status !== "generating") return { ok: true };

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

  try {
    const artifact = await generateBlueprintArtifact(history);
    await saveBlueprintArtifact(supabase, sessionId, artifact);
  } catch (err) {
    console.error("generateBlueprintArtifact failed", err);
    await supabase.from("session_messages").insert({
      session_id: sessionId,
      role: "log",
      stage: session.current_stage,
      content:
        "Something went wrong generating your final blueprint. Send any message to try again.",
    });
    // Back to in_progress (not "generating") so the founder gets the
    // composer and the normal needsRetry banner back, rather than being
    // stuck on a permanent "generating" screen with no way forward.
    await supabase
      .from("sessions")
      .update({ status: "in_progress" })
      .eq("id", sessionId);
    return {
      ok: false,
      message:
        "Something went wrong generating your final blueprint. Please try again.",
    };
  }

  await supabase
    .from("sessions")
    .update({ status: "complete" })
    .eq("id", sessionId);

  revalidatePath(`/sessions/${sessionId}`);
  return { ok: true };
}
