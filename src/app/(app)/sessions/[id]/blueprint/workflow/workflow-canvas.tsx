"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { tickWorkflow, decideFounderApproval } from "./actions";
import type { Database } from "@/types/database.types";

type WorkflowNode = Database["public"]["Tables"]["workflow_nodes"]["Row"];
type WorkflowRunStatus = Database["public"]["Enums"]["workflow_run_status"];

const ROLE_LABEL: Record<string, string> = {
  marketing_strategist: "Marketing Strategist",
  content_creator: "Content Creator",
  marketing_strategist_review: "Strategist Review",
  founder_approval: "Founder Approval",
  marketing_designer: "Marketing Designer",
  scheduler_launch_ops: "Scheduler / Launch Ops",
};

const STATUS_STYLE: Record<string, { dot: string; border: string; bg: string }> = {
  waiting: { dot: "bg-zinc-400", border: "border-zinc-300 dark:border-zinc-700", bg: "bg-white dark:bg-zinc-950" },
  running: { dot: "bg-blue-500 animate-pulse", border: "border-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
  complete: { dot: "bg-emerald-500", border: "border-emerald-300 dark:border-emerald-800", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  paused: { dot: "bg-amber-500", border: "border-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  error: { dot: "bg-red-500", border: "border-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
};

const POLL_INTERVAL_MS = 4_000;

function nodeStatus(node: WorkflowNode): keyof typeof STATUS_STYLE {
  return (node.status as keyof typeof STATUS_STYLE) ?? "waiting";
}

function nodeTitle(node: WorkflowNode): string {
  const base = ROLE_LABEL[node.role] ?? node.role;
  return node.round_number > 1 ? `${base} · round ${node.round_number}` : base;
}

function lastLogLine(node: WorkflowNode): string | null {
  const log = node.log as unknown as Array<{ message: string }> | null;
  if (!log || log.length === 0) return null;
  return log[log.length - 1]?.message ?? null;
}

/**
 * The n8n-style visual canvas: pipeline stages rendered as connected nodes
 * in execution order (workflow_nodes is already ordered by created_at,
 * which is the pipeline's real sequence — no separate layout algorithm
 * needed for a linear pipeline like this one). Polls tickWorkflow on an
 * interval while the run is active; each tick's revalidatePath (in
 * actions.ts) plus this component's router.refresh() is what pulls fresh
 * node state down from the server component above, rather than this
 * component fetching nodes itself.
 */
export function WorkflowCanvas({
  sessionId,
  workflowRunId,
  initialStatus,
  initialNodes,
}: {
  sessionId: string;
  workflowRunId: string;
  initialStatus: WorkflowRunStatus;
  initialNodes: WorkflowNode[];
}) {
  const router = useRouter();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isTicking, setIsTicking] = useState(false);

  useEffect(() => {
    if (initialStatus !== "running") return;
    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled) return;
      setIsTicking(true);
      try {
        await tickWorkflow(sessionId, workflowRunId);
        if (!cancelled) router.refresh();
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Pipeline check failed.");
        }
      } finally {
        if (!cancelled) setIsTicking(false);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatus, workflowRunId, sessionId]);

  const selectedNode = initialNodes.find((n) => n.id === selectedNodeId) ?? null;
  const pendingApproval = initialNodes.find((n) => n.role === "founder_approval" && n.status === "paused");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
        <RunStatusBadge status={initialStatus} ticking={isTicking} />
      </div>

      {/* The canvas itself — a horizontal flow of nodes with connecting
          lines, wrapping on narrow viewports. Each node is a clickable
          card; the connecting line's color reflects whether execution
          has reached that point yet. */}
      <div className="flex flex-wrap items-stretch gap-x-2 gap-y-4 overflow-x-auto rounded-2xl border border-black/[.06] bg-zinc-50 p-6 dark:border-white/[.08] dark:bg-zinc-900/40">
        {initialNodes.map((node, i) => (
          <div key={node.id} className="flex items-center">
            {i > 0 && <ConnectorLine active={nodeStatus(node) !== "waiting"} />}
            <NodeCard
              node={node}
              selected={node.id === selectedNodeId}
              onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
            />
          </div>
        ))}
      </div>

      {pendingApproval && (
        <ApprovalPanel
          sessionId={sessionId}
          workflowRunId={workflowRunId}
          node={pendingApproval}
        />
      )}

      {selectedNode && <NodeDetailPanel node={selectedNode} />}
    </div>
  );
}

function RunStatusBadge({ status, ticking }: { status: WorkflowRunStatus; ticking: boolean }) {
  const label: Record<WorkflowRunStatus, string> = {
    running: ticking ? "Running — checking for updates…" : "Running",
    paused_for_approval: "Paused — awaiting your decision",
    complete: "Complete",
    failed: "Failed",
  };
  return <span>{label[status]}</span>;
}

function ConnectorLine({ active }: { active: boolean }) {
  return (
    <svg width="32" height="2" className="mx-1 shrink-0" aria-hidden="true">
      <line
        x1="0"
        y1="1"
        x2="32"
        y2="1"
        strokeWidth="2"
        className={active ? "stroke-emerald-400" : "stroke-zinc-300 dark:stroke-zinc-700"}
      />
    </svg>
  );
}

function NodeCard({
  node,
  selected,
  onClick,
}: {
  node: WorkflowNode;
  selected: boolean;
  onClick: () => void;
}) {
  const style = STATUS_STYLE[nodeStatus(node)];
  const log = lastLogLine(node);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-52 shrink-0 flex-col gap-1.5 rounded-xl border px-3.5 py-3 text-left transition-shadow ${style.border} ${style.bg} ${
        selected ? "ring-2 ring-zinc-950 dark:ring-zinc-50" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{nodeTitle(node)}</span>
      </div>
      <p className="line-clamp-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
        {log ?? node.error_message ?? "Waiting to start…"}
      </p>
    </button>
  );
}

function NodeDetailPanel({ node }: { node: WorkflowNode }) {
  const artifact = node.artifact as Record<string, unknown> | null;
  return (
    <div className="rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-950">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{nodeTitle(node)}</h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">Status: {node.status}</p>
      {node.error_message && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {node.error_message}
        </p>
      )}
      {artifact && (
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          {Object.entries(artifact)
            .filter(([key]) => !["log_message", "status", "confidence"].includes(key))
            .map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                  {key.replace(/_/g, " ")}
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                  {Array.isArray(value)
                    ? value.map((v, i) => <p key={i}>• {typeof v === "string" ? v : JSON.stringify(v)}</p>)
                    : typeof value === "string"
                      ? value
                      : JSON.stringify(value, null, 2)}
                </dd>
              </div>
            ))}
        </dl>
      )}
    </div>
  );
}

function ApprovalPanel({
  sessionId,
  workflowRunId,
  node,
}: {
  sessionId: string;
  workflowRunId: string;
  node: WorkflowNode;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function decide(decision: "approve" | "reject") {
    setIsPending(true);
    try {
      await decideFounderApproval(sessionId, workflowRunId, node.id, decision, note);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record your decision.");
    } finally {
      setIsPending(false);
    }
  }

  const log = lastLogLine(node);

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950">
      <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        The Strategist/Content revision loop needs your call
      </h3>
      {log && <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">{log}</p>}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note — why you're approving or rejecting"
        rows={2}
        className="mt-3 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 dark:border-amber-800 dark:bg-zinc-950"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("approve")}
          className="rounded-full bg-amber-900 px-4 py-2 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
        >
          Approve — continue to Design
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("reject")}
          className="rounded-full border border-amber-400 px-4 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900"
        >
          Reject — stop this run
        </button>
      </div>
    </div>
  );
}
