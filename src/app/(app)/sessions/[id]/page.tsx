import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "./actions";
import { ReplyComposer, type QuickReply } from "./reply-composer";
import { MessageContent } from "./message-content";

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
    .select(
      "id, role, content, stage, created_at, quick_replies, quick_replies_multi_select"
    )
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const isComplete = session.status === "complete";
  const boundSendMessage = sendMessage.bind(null, id);

  // Quick replies only make sense on the most recent turn — once the
  // conversation has moved on, earlier questions are already answered.
  const lastMessage = messages?.[messages.length - 1];
  const quickReplies: QuickReply[] | null =
    lastMessage?.role === "assistant" && lastMessage.quick_replies
      ? (lastMessage.quick_replies as unknown as QuickReply[])
      : null;
  const quickRepliesMultiSelect =
    lastMessage?.role === "assistant"
      ? Boolean(lastMessage.quick_replies_multi_select)
      : false;

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
            <MessageContent content={message.content} />
          </div>
        ))}
      </div>

      {!isComplete && (
        <ReplyComposer
          key={lastMessage?.id}
          sendMessage={boundSendMessage}
          quickReplies={quickReplies}
          multiSelect={quickRepliesMultiSelect}
        />
      )}
    </div>
  );
}
