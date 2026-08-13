import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "./actions";

const ROLE_STYLE: Record<string, string> = {
  assistant:
    "self-start bg-white border border-black/[.08] text-zinc-900 dark:bg-zinc-950 dark:border-white/[.1] dark:text-zinc-100",
  user: "self-end bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950",
  log: "self-start bg-transparent border border-dashed border-black/[.15] text-zinc-500 text-xs italic dark:border-white/[.2] dark:text-zinc-500",
};

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, domain, canvas_type, status, current_stage")
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("session_messages")
    .select("id, role, content, stage, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const isComplete = session.status === "complete";
  const boundSendMessage = sendMessage.bind(null, id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          {session.title || session.domain || "Untitled blueprint"}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Stage: {session.current_stage} · Status: {session.status}
        </p>
      </div>

      {isComplete && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <span>Your blueprint is ready.</span>
          <Link
            href={`/sessions/${id}/blueprint`}
            className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            View blueprint →
          </Link>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-black/[.08] bg-zinc-50 p-4 dark:border-white/[.1] dark:bg-zinc-900/40">
        {messages?.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              ROLE_STYLE[message.role] ?? ROLE_STYLE.assistant
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      {!isComplete && (
        <form action={boundSendMessage} className="mt-4 flex items-end gap-2">
          <textarea
            name="content"
            required
            rows={2}
            placeholder="Type your answer…"
            className="flex-1 resize-none rounded-xl border border-black/[.12] bg-white px-3 py-2 text-sm outline-none focus:border-zinc-950 dark:border-white/[.15] dark:bg-zinc-950 dark:focus:border-zinc-50"
          />
          <button
            type="submit"
            className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
