import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getSiteSettings } from "@/lib/site-settings";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Peer-review loop rules — verbatim from docs/ROADMAP.md's V2 Scope §
// "Peer review loop rules (prevents infinite loops)".
const MAX_REVIEW_ROUNDS = 3;
const ACCEPTANCE_SCORE = 70;
const DIMINISHING_RETURN_DELTA = 3;

// A node stuck "running" longer than this is presumed dead, not just slow —
// a single Managed Agents turn on this pipeline has been observed taking
// up to ~100s at default effort, so this is real headroom, not a guess.
const NODE_STALE_MS = 6 * 60_000;

export interface PipelineArtifact {
  log_message: string;
  status: "complete" | "needs_revision" | "blocked";
  confidence: "high" | "medium" | "low";
  gaps: string[];
  [key: string]: unknown;
}

type WorkflowNode = Database["public"]["Tables"]["workflow_nodes"]["Row"];

/**
 * Starts a Managed Agents turn for a pipeline role and returns immediately
 * — does NOT wait for it to finish. A single turn on this pipeline has
 * been observed taking 60-100+ seconds (Opus 5 at default effort,
 * thinking + a detailed structured artifact), which is longer than a
 * single Vercel function invocation should block for. The rest of the
 * lifecycle (did it finish? what did it produce?) is handled by
 * pollNode, called repeatedly from advanceMarketingPipeline — the same
 * "kick off, then poll" shape the V1 blueprint's PDF/generation flow uses
 * for its own long-running steps, just at the session level instead of
 * the request level.
 */
async function startNode(
  supabase: SupabaseClient<Database>,
  nodeId: string,
  role: string,
  promptText: string
): Promise<void> {
  const [{ data: pipelineAgent }, settings] = await Promise.all([
    supabase
      .from("pipeline_agents")
      .select("anthropic_agent_id, anthropic_agent_version")
      .eq("role", role)
      .single(),
    getSiteSettings(),
  ]);

  if (!pipelineAgent) {
    throw new Error(`No pipeline agent provisioned for role "${role}". Run scripts/setup-marketing-agents.ts.`);
  }
  if (!settings.pipeline_environment_id) {
    throw new Error("No pipeline_environment_id configured — run scripts/setup-marketing-agents.ts's environment step first.");
  }

  const session = await anthropic.beta.sessions.create({
    agent: {
      type: "agent",
      id: pipelineAgent.anthropic_agent_id,
      version: pipelineAgent.anthropic_agent_version ?? undefined,
    },
    environment_id: settings.pipeline_environment_id,
    initial_events: [
      {
        type: "user.message",
        content: [{ type: "text", text: promptText }],
      },
    ],
  });

  await updateNode(supabase, nodeId, {
    status: "running",
    managed_agent_session_id: session.id,
    started_at: new Date().toISOString(),
  });
}

/**
 * Checks a running node's session once — non-blocking. Returns:
 *  - "running" if the agent is still working (or the check itself failed
 *    transiently — treated as "still running" rather than erroring the
 *    whole node over one flaky poll)
 *  - "complete" once submit_artifact has been captured and the node row updated
 *  - "error" if the session ended without ever calling submit_artifact,
 *    or has been running long enough to presume it's stuck
 */
async function pollNode(
  supabase: SupabaseClient<Database>,
  node: WorkflowNode
): Promise<"running" | "complete" | "error"> {
  if (!node.managed_agent_session_id) return "running";

  if (node.started_at && Date.now() - new Date(node.started_at).getTime() > NODE_STALE_MS) {
    await updateNode(supabase, node.id, { status: "error", error_message: "Timed out waiting for the agent." });
    return "error";
  }

  const session = await anthropic.beta.sessions.retrieve(node.managed_agent_session_id);
  if (session.status === "running" || session.status === "rescheduling") {
    return "running";
  }

  // Idle or terminated — either way, check for a submit_artifact call
  // before deciding whether this was a real completion or a dead end.
  const events = await anthropic.beta.sessions.events.list(node.managed_agent_session_id);
  const toolCall = events.data.find(
    (e) => e.type === "agent.custom_tool_use" && (e as { name?: string }).name === "submit_artifact"
  ) as { input?: PipelineArtifact } | undefined;

  if (!toolCall?.input) {
    await updateNode(supabase, node.id, {
      status: "error",
      error_message: `Session ended (${session.status}) without calling submit_artifact.`,
    });
    return "error";
  }

  const artifact = toolCall.input;
  await updateNode(supabase, node.id, {
    status: "complete",
    artifact: artifact as never,
    log: [{ message: artifact.log_message, at: new Date().toISOString() }] as never,
    completed_at: new Date().toISOString(),
  });
  return "complete";
}

async function updateNode(
  supabase: SupabaseClient<Database>,
  nodeId: string,
  patch: Database["public"]["Tables"]["workflow_nodes"]["Update"]
) {
  const { error } = await supabase.from("workflow_nodes").update(patch).eq("id", nodeId);
  if (error) throw new Error(error.message);
}

async function createAndStartNode(
  supabase: SupabaseClient<Database>,
  workflowRunId: string,
  role: string,
  promptText: string,
  roundNumber = 1
): Promise<void> {
  const { data, error } = await supabase
    .from("workflow_nodes")
    .insert({ workflow_run_id: workflowRunId, role, round_number: roundNumber, status: "waiting" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create workflow node.");
  await startNode(supabase, data.id, role, promptText);
}

/**
 * Kicks off a Marketing pipeline run for an approved blueprint — creates
 * the run row, creates the first node (marketing_strategist), and starts
 * its session. Does not wait for that node to finish; the client calls
 * advanceMarketingPipeline on an interval afterward to drive the rest.
 */
export async function startMarketingPipeline(
  supabase: SupabaseClient<Database>,
  blueprintId: string,
  founderId: string,
  blueprintSummary: string
): Promise<string> {
  const { data: run, error } = await supabase
    .from("workflow_runs")
    .insert({ blueprint_id: blueprintId, founder_id: founderId, pipeline_type: "marketing", status: "running" })
    .select("id")
    .single();
  if (error || !run) throw new Error(error?.message ?? "Could not start workflow run.");

  await createAndStartNode(
    supabase,
    run.id,
    "marketing_strategist",
    `Here is the founder's approved product blueprint:\n\n${blueprintSummary}\n\nProduce the marketing strategy brief.`
  );

  return run.id;
}

/**
 * One non-blocking tick of the pipeline state machine — safe to call every
 * few seconds from the client. Each call does at most one of: poll the
 * currently-running node, or (if that node just completed) decide and
 * start the next one. Never blocks on a Managed Agents call finishing.
 *
 * Sequence: marketing_strategist -> content_creator (round N) ->
 * marketing_strategist_review (round N, scores the draft) -> either
 * marketing_designer (score >= 70), another content_creator round, or a
 * paused approval gate (round 3 reached, or improvement < 3 points) ->
 * scheduler_launch_ops -> complete.
 */
export async function advanceMarketingPipeline(
  supabase: SupabaseClient<Database>,
  workflowRunId: string
): Promise<Database["public"]["Enums"]["workflow_run_status"]> {
  const { data: run } = await supabase
    .from("workflow_runs")
    .select("id, status")
    .eq("id", workflowRunId)
    .single();
  if (!run) throw new Error("Workflow run not found.");
  if (run.status !== "running") return run.status;

  const { data: nodes } = await supabase
    .from("workflow_nodes")
    .select("*")
    .eq("workflow_run_id", workflowRunId)
    .order("created_at", { ascending: true });
  const allNodes = nodes ?? [];

  const runningNode = allNodes.find((n) => n.status === "running");
  if (runningNode) {
    const result = await pollNode(supabase, runningNode);
    if (result === "running") return "running";
    if (result === "error") return "running"; // node row now says "error"; run stays open for a manual look
    // "complete" falls through to decide the next step below.
  }

  const strategistNode = allNodes.find((n) => n.role === "marketing_strategist");
  if (!strategistNode || strategistNode.status !== "complete") {
    // Still waiting on the strategist (either it's the node we just
    // polled above, or something upstream hasn't happened yet).
    return "running";
  }
  const strategistArtifact = strategistNode.artifact as unknown as PipelineArtifact & { content_brief: string };

  const contentRounds = allNodes.filter((n) => n.role === "content_creator");
  const reviewRounds = allNodes.filter((n) => n.role === "marketing_strategist_review");
  const designerNode = allNodes.find((n) => n.role === "marketing_designer");
  const schedulerNode = allNodes.find((n) => n.role === "scheduler_launch_ops");

  if (schedulerNode) {
    if (schedulerNode.status === "complete") {
      await supabase.from("workflow_runs").update({ status: "complete" }).eq("id", workflowRunId);
      return "complete";
    }
    return "running"; // scheduler node exists but isn't complete — polled above if it was "running"
  }

  if (designerNode) {
    if (designerNode.status === "complete") {
      const designerArtifact = designerNode.artifact as unknown as PipelineArtifact;
      await createAndStartNode(
        supabase,
        workflowRunId,
        "scheduler_launch_ops",
        `Marketing content and design direction are approved. Design brief:\n\n${JSON.stringify(designerArtifact, null, 2)}\n\nProduce the launch calendar.`
      );
    }
    return "running";
  }

  const latestContent = contentRounds[contentRounds.length - 1];
  const latestReview = reviewRounds[reviewRounds.length - 1];

  // A content round finished but hasn't been reviewed yet — start the review.
  if (
    latestContent?.status === "complete" &&
    (!latestReview || latestReview.round_number !== latestContent.round_number)
  ) {
    const contentArtifact = latestContent.artifact as unknown as PipelineArtifact;
    await createAndStartNode(
      supabase,
      workflowRunId,
      "marketing_strategist_review",
      `Review this Content Creator draft against your own content brief and score it.\n\nYour content brief:\n${strategistArtifact.content_brief}\n\nDraft to review:\n${JSON.stringify(contentArtifact, null, 2)}`,
      latestContent.round_number
    );
    return "running";
  }

  // A review just completed — decide pass / another round / escalate.
  if (latestReview?.status === "complete" && latestReview.round_number === latestContent?.round_number) {
    const reviewArtifact = latestReview.artifact as unknown as PipelineArtifact;
    const score = Number(reviewArtifact.review_score ?? 0);
    const roundNumber = latestReview.round_number;
    const previousReview = reviewRounds.length > 1 ? reviewRounds[reviewRounds.length - 2] : null;
    const previousScore = previousReview
      ? Number((previousReview.artifact as unknown as PipelineArtifact)?.review_score ?? 0)
      : null;
    const improvement = previousScore === null ? null : score - previousScore;

    // Already acted on this review (e.g. a re-run of this tick after the
    // node above changed) — avoid double-advancing.
    const alreadyAdvanced = allNodes.some(
      (n) =>
        (n.role === "content_creator" && n.round_number === roundNumber + 1) ||
        (n.role === "marketing_designer")
    );
    if (alreadyAdvanced) return "running";

    if (score >= ACCEPTANCE_SCORE) {
      const contentArtifact = latestContent.artifact as unknown as PipelineArtifact;
      await createAndStartNode(
        supabase,
        workflowRunId,
        "marketing_designer",
        `Marketing content is approved (score ${score}/100). Content:\n\n${JSON.stringify(contentArtifact, null, 2)}\n\nProduce the visual direction and asset briefs.`
      );
      return "running";
    }

    const exhausted = roundNumber >= MAX_REVIEW_ROUNDS;
    const diminishing = improvement !== null && improvement < DIMINISHING_RETURN_DELTA;
    if (exhausted || diminishing) {
      await updateNode(supabase, latestReview.id, {
        log: [
          {
            message: `Escalated to founder — score ${score}/100 after ${roundNumber} round(s), ${exhausted ? "max rounds reached" : "improvement too small to continue automatically"}.`,
            at: new Date().toISOString(),
          },
        ] as never,
      });
      await supabase.from("workflow_nodes").insert({
        workflow_run_id: workflowRunId,
        role: "founder_approval",
        round_number: roundNumber,
        status: "paused",
      });
      await supabase.from("workflow_runs").update({ status: "paused_for_approval" }).eq("id", workflowRunId);
      return "paused_for_approval";
    }

    await createAndStartNode(
      supabase,
      workflowRunId,
      "content_creator",
      `Revise your draft based on this feedback (score was ${score}/100):\n\n${reviewArtifact.review_feedback}\n\nOriginal content brief:\n${strategistArtifact.content_brief}`,
      roundNumber + 1
    );
    return "running";
  }

  // Nothing started yet — the very first content round.
  if (contentRounds.length === 0) {
    await createAndStartNode(
      supabase,
      workflowRunId,
      "content_creator",
      `Write the marketing content from this brief:\n\n${strategistArtifact.content_brief}`,
      1
    );
    return "running";
  }

  return "running";
}

/**
 * Resumes a run that paused for founder approval (see the escalation
 * branch in advanceMarketingPipeline). Approve carries the latest content
 * forward to the Designer stage regardless of its score — the founder's
 * judgment overrides the automatic threshold, same as a human breaking
 * any other deadlock. Reject stops the run; the founder revises the
 * underlying blueprint and starts a fresh pipeline run rather than this
 * one silently retrying forever.
 */
export async function resolvePipelineApproval(
  supabase: SupabaseClient<Database>,
  workflowRunId: string,
  founderApprovalNodeId: string,
  decision: "approve" | "reject",
  note: string | null,
  decidedBy: string
): Promise<void> {
  await supabase.from("workflow_approvals").insert({
    workflow_node_id: founderApprovalNodeId,
    decision,
    note,
    decided_by: decidedBy,
  });

  if (decision === "reject") {
    await updateNode(supabase, founderApprovalNodeId, { status: "error", error_message: "Rejected by founder." });
    await supabase.from("workflow_runs").update({ status: "failed" }).eq("id", workflowRunId);
    return;
  }

  await updateNode(supabase, founderApprovalNodeId, { status: "complete", completed_at: new Date().toISOString() });

  const { data: allNodes } = await supabase
    .from("workflow_nodes")
    .select("*")
    .eq("workflow_run_id", workflowRunId)
    .order("created_at", { ascending: true });
  const contentRounds = (allNodes ?? []).filter((n) => n.role === "content_creator");
  const latestContent = contentRounds[contentRounds.length - 1];
  if (!latestContent) throw new Error("No content draft to approve.");

  await supabase.from("workflow_runs").update({ status: "running" }).eq("id", workflowRunId);

  const contentArtifact = latestContent.artifact as unknown as PipelineArtifact;
  await createAndStartNode(
    supabase,
    workflowRunId,
    "marketing_designer",
    `The founder manually approved this content despite it not meeting the automatic score threshold. Content:\n\n${JSON.stringify(contentArtifact, null, 2)}\n\nProduce the visual direction and asset briefs.`
  );
}
