import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { BlueprintArtifactOutput } from "./schemas";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Maps the model's flat BlueprintArtifactOutput onto the blueprints table
 * (section columns for querying) and a raw_artifact jsonb blob that matches
 * the OUTPUT CONTRACT shape in docs/blueprint-agent-system-prompt.md
 * (fields.lean / fields.bmc nesting) for PDF export / audit fidelity.
 */
export async function saveBlueprintArtifact(
  supabase: SupabaseServerClient,
  sessionId: string,
  artifact: BlueprintArtifactOutput
) {
  const rawArtifact = {
    canvas_type: artifact.canvas_type,
    section_1_problem: artifact.section_1_problem,
    section_2_users: artifact.section_2_users,
    section_3_canvas: {
      type: artifact.section_3_canvas.type,
      fields:
        artifact.section_3_canvas.type === "lean"
          ? { lean: artifact.section_3_canvas.fields_lean }
          : { bmc: artifact.section_3_canvas.fields_bmc },
      confidence: artifact.section_3_canvas.confidence,
      gaps: artifact.section_3_canvas.gaps,
    },
    section_4_mvp_scope: artifact.section_4_mvp_scope,
    section_5_success_metrics: artifact.section_5_success_metrics,
    section_6_risks: artifact.section_6_risks,
    section_7_roadmap: artifact.section_7_roadmap,
    section_8_open_questions: artifact.section_8_open_questions,
    section_9_founder_market_fit: artifact.section_9_founder_market_fit,
  };

  const { error } = await supabase.from("blueprints").upsert(
    {
      session_id: sessionId,
      canvas_type: artifact.canvas_type,
      section_1_problem: artifact.section_1_problem,
      section_1_confidence: artifact.section_1_problem.confidence,
      section_1_gaps: artifact.section_1_problem.gaps,
      section_2_users: artifact.section_2_users,
      section_2_confidence: artifact.section_2_users.confidence,
      section_2_gaps: artifact.section_2_users.gaps,
      section_3_canvas: rawArtifact.section_3_canvas,
      section_3_confidence: artifact.section_3_canvas.confidence,
      section_3_gaps: artifact.section_3_canvas.gaps,
      section_4_mvp_scope: artifact.section_4_mvp_scope,
      section_5_success_metrics: artifact.section_5_success_metrics,
      section_6_risks: artifact.section_6_risks,
      section_7_roadmap: artifact.section_7_roadmap,
      section_8_open_questions: artifact.section_8_open_questions,
      section_9_founder_market_fit: artifact.section_9_founder_market_fit,
      raw_artifact: rawArtifact,
    },
    { onConflict: "session_id" }
  );

  if (error) {
    throw new Error(`Could not save blueprint artifact: ${error.message}`);
  }
}
