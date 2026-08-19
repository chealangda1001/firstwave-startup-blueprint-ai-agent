"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  startMarketingPipeline,
  advanceMarketingPipeline,
  resolvePipelineApproval,
} from "@/lib/workflow/marketing-pipeline";
import type { Database } from "@/types/database.types";

type BlueprintRow = Database["public"]["Tables"]["blueprints"]["Row"];

/**
 * Same access check as the PDF export actions (blueprint/actions.ts) —
 * a founder may only touch their own session's workflow, an admin may
 * touch any. Everything after this uses the service-role client, since
 * workflow_runs/workflow_nodes have no founder-facing insert/update RLS
 * policy at all (see migration 0023) — only the orchestrator writes them.
 */
async function assertCanAccessSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, founder_id, title, domain")
    .eq("id", sessionId)
    .single();
  if (!session) throw new Error("Session not found.");

  if (session.founder_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) throw new Error("You don't have access to this session.");
  }

  return { session, userId: user.id };
}

function summarizeBlueprint(blueprint: BlueprintRow): string {
  const s1 = blueprint.section_1_problem as Record<string, string>;
  const s2 = blueprint.section_2_users as Record<string, string>;
  const s3 = blueprint.section_3_canvas as {
    type: "lean" | "bmc";
    fields: Record<string, Record<string, string> | null>;
  };
  const canvasFields = s3?.fields?.[s3?.type ?? "lean"] ?? {};

  return [
    `Problem: ${s1?.existence ?? ""} ${s1?.frequency_and_cost ?? ""}`,
    `Users: ${s2?.primary_user ?? ""}`,
    `Unique value proposition / positioning seed: ${(canvasFields as Record<string, string>).unique_value_proposition ?? (canvasFields as Record<string, string>).value_propositions ?? ""}`,
    `Unfair advantage: ${(canvasFields as Record<string, string>).unfair_advantage ?? ""}`,
    `Customer segments: ${(canvasFields as Record<string, string>).customer_segments ?? ""}`,
  ]
    .filter((line) => line.split(": ")[1]?.trim())
    .join("\n");
}

export async function startMarketingPipelineAction(sessionId: string) {
  const { userId } = await assertCanAccessSession(sessionId);
  const admin = createAdminClient();

  const { data: blueprint } = await admin
    .from("blueprints")
    .select("*")
    .eq("session_id", sessionId)
    .single();
  if (!blueprint) throw new Error("No blueprint has been generated for this session yet.");

  const { data: existingRun } = await admin
    .from("workflow_runs")
    .select("id, status")
    .eq("blueprint_id", blueprint.id)
    .eq("pipeline_type", "marketing")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingRun && existingRun.status !== "failed") {
    return existingRun.id;
  }

  const runId = await startMarketingPipeline(
    admin,
    blueprint.id,
    userId,
    summarizeBlueprint(blueprint)
  );

  revalidatePath(`/sessions/${sessionId}/blueprint/workflow`);
  return runId;
}

/**
 * One non-blocking tick — called on an interval by the client (see
 * WorkflowCanvas). Never throws for "still running"; only for real
 * failures (e.g. the run doesn't exist).
 */
export async function tickWorkflow(sessionId: string, workflowRunId: string) {
  await assertCanAccessSession(sessionId);
  const admin = createAdminClient();
  const status = await advanceMarketingPipeline(admin, workflowRunId);
  revalidatePath(`/sessions/${sessionId}/blueprint/workflow`);
  return status;
}

export async function decideFounderApproval(
  sessionId: string,
  workflowRunId: string,
  founderApprovalNodeId: string,
  decision: "approve" | "reject",
  note: string
) {
  const { userId } = await assertCanAccessSession(sessionId);
  const admin = createAdminClient();
  await resolvePipelineApproval(
    admin,
    workflowRunId,
    founderApprovalNodeId,
    decision,
    note.trim() || null,
    userId
  );
  revalidatePath(`/sessions/${sessionId}/blueprint/workflow`);
}
