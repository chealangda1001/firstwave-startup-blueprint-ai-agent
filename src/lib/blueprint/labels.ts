/**
 * Human-friendly labels for the raw stage/status identifiers stored in the
 * database and used internally by the agent (see current_stage in
 * system-prompt.ts). Never show stage_1_problem, in_progress, etc. directly
 * in the UI — always go through these.
 */

const STAGE_LABEL: Record<string, string> = {
  stage_0_intake: "Getting started",
  stage_1_problem: "Problem",
  stage_2_users: "Target users",
  stage_3_canvas: "Business model",
  stage_4_8_generated: "Drafting blueprint",
  stage_9_market_fit: "Founder fit",
  complete: "Complete",
};

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return "Not started";
  return (
    STAGE_LABEL[stage] ??
    stage
      .replace(/^stage_\d+_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const STATUS_LABEL: Record<string, string> = {
  in_progress: "In progress",
  generating: "Generating blueprint",
  complete: "Complete",
  abandoned: "Abandoned",
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}
