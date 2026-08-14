import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { MessageContent } from "@/app/(app)/sessions/[id]/message-content";
import { stageLabel, statusLabel } from "@/lib/blueprint/labels";

const STATUS_VARIANT: Record<string, string> = {
  complete: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  in_progress: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  abandoned: "bg-slate-200 text-slate-700 hover:bg-slate-200",
};

const ROLE_STYLE: Record<string, string> = {
  assistant: "self-start border border-slate-200 bg-white text-slate-900",
  user: "self-end bg-slate-900 text-white",
};

/**
 * Read-only transcript for oversight — relies on the "session_messages:
 * admin select all" RLS policy (migration 0004) for access, same as the
 * sessions list this links from. Deliberately no reply box, no quick
 * replies, no typing animation: an admin is reading a record, not
 * continuing someone else's conversation.
 */
export default async function AdminSessionTranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, title, domain, canvas_type, status, current_stage, created_at, profiles(email, full_name)"
    )
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: allMessages } = await supabase
    .from("session_messages")
    .select("id, role, content, created_at, response_time_ms")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  // Same rule as the founder-facing view: log rows are internal step
  // narration, not part of the conversation itself.
  const messages = (allMessages ?? []).filter((m) => m.role !== "log");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/sessions"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            ← All sessions
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {session.title || session.domain || "Untitled blueprint"}
          </h1>
          <p className="text-sm text-slate-500">
            {session.profiles?.full_name || session.profiles?.email || "—"} ·{" "}
            {stageLabel(session.current_stage)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            className={`rounded-sm font-medium ${
              STATUS_VARIANT[session.status] ?? STATUS_VARIANT.abandoned
            }`}
          >
            {statusLabel(session.status)}
          </Badge>
          {session.status === "complete" && (
            <Link
              href={`/admin/sessions/${id}/blueprint`}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              View blueprint →
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-6">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            No messages in this session yet.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex max-w-[75%] flex-col gap-1 rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              ROLE_STYLE[message.role] ?? ROLE_STYLE.assistant
            }`}
          >
            <MessageContent content={message.content} />
            <span
              className={`text-[10px] ${
                message.role === "user" ? "text-slate-400" : "text-slate-400"
              }`}
            >
              {new Date(message.created_at).toLocaleString()}
              {message.response_time_ms != null &&
                ` · responded in ${(message.response_time_ms / 1000).toFixed(1)}s`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
