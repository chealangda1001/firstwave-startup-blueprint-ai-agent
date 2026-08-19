import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkflowCanvas } from "./workflow-canvas";
import { StartPipelineButton } from "./start-pipeline-button";

// Route segment config — a single pipeline tick (advanceMarketingPipeline)
// only ever does light DB reads/writes plus a fast Managed Agents status
// check, so this stays well under the default, but the session.create()
// call inside startMarketingPipeline is a real network round-trip to
// Anthropic — same headroom reasoning as the blueprint session page.
export const maxDuration = 60;

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, domain")
    .eq("id", id)
    .single();
  if (!session) notFound();

  const { data: blueprint } = await supabase
    .from("blueprints")
    .select("id")
    .eq("session_id", id)
    .single();

  if (!blueprint) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No blueprint has been generated for this session yet.
        </p>
        <Link href={`/sessions/${id}`} className="text-sm underline underline-offset-2">
          ← Back to the conversation
        </Link>
      </div>
    );
  }

  // The Managed Agents pipeline writes via the service-role client (see
  // workflow/actions.ts) since workflow_runs/workflow_nodes have no
  // founder-facing insert/update policy — but reads here go through the
  // normal RLS-scoped client like every other founder-facing page.
  const { data: run } = await supabase
    .from("workflow_runs")
    .select("id, status, created_at")
    .eq("blueprint_id", blueprint.id)
    .eq("pipeline_type", "marketing")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const admin = createAdminClient();
  const { data: nodes } = run
    ? await admin
        .from("workflow_nodes")
        .select("*")
        .eq("workflow_run_id", run.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/sessions/${id}/blueprint`}
            className="text-xs text-zinc-500 underline underline-offset-2 dark:text-zinc-500"
          >
            ← Back to the blueprint
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            Marketing Pipeline
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            {session.title || session.domain || "Product Blueprint"}
          </p>
        </div>
        {!run && <StartPipelineButton sessionId={id} />}
      </div>

      {!run && (
        <div className="rounded-2xl border border-dashed border-black/[.12] px-6 py-16 text-center text-sm text-zinc-500 dark:border-white/[.15] dark:text-zinc-500">
          No pipeline run yet. Starting one hands your approved blueprint to
          the Marketing Strategist, Content Creator, Designer, and
          Scheduler agents in sequence.
        </div>
      )}

      {run && (
        <WorkflowCanvas
          sessionId={id}
          workflowRunId={run.id}
          initialStatus={run.status}
          initialNodes={nodes ?? []}
        />
      )}
    </div>
  );
}
