import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "./actions";
import { ReplyComposer, type QuickReply } from "./reply-composer";
import { MessageContent } from "./message-content";
import { AssistantMessage } from "./assistant-message";
import { ChatTranscript, type NavItem } from "./chat-transcript";
import { splitMarkdownBlocks } from "@/lib/blueprint/split-blocks";

const ROLE_STYLE: Record<string, string> = {
  assistant:
    "self-start bg-white border border-black/[.08] text-zinc-900 dark:bg-zinc-950 dark:border-white/[.1] dark:text-zinc-100",
  user: "self-end bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950",
};

function excerpt(text: string, max = 42) {
  const oneLine = text.replace(/[*_#>`\n]/g, " ").replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

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

  const { data: allMessages } = await supabase
    .from("session_messages")
    .select(
      "id, role, content, stage, created_at, quick_replies, quick_replies_multi_select"
    )
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const isComplete = session.status === "complete";
  const boundSendMessage = sendMessage.bind(null, id);

  // log_message is an internal status line the agent emits per turn — it's
  // not part of the conversation for the founder to read back later, so it
  // never renders as a permanent chat bubble (the composer's transient
  // "working…" indicator covers the same "what is it doing" purpose while
  // an answer is in flight, and disappears the moment the real reply lands).
  const messages = (allMessages ?? []).filter((m) => m.role !== "log");

  // Quick replies only make sense on the most recent turn — once the
  // conversation has moved on, earlier questions are already answered.
  const lastMessage = messages[messages.length - 1];
  const quickReplies: QuickReply[] | null =
    lastMessage?.role === "assistant" && lastMessage.quick_replies
      ? (lastMessage.quick_replies as unknown as QuickReply[])
      : null;
  const quickRepliesMultiSelect =
    lastMessage?.role === "assistant"
      ? Boolean(lastMessage.quick_replies_multi_select)
      : false;

  const navItems: NavItem[] = messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    label: excerpt(m.content),
  }));

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

      <ChatTranscript navItems={navItems}>
        {messages.map((message) => {
          const bubbleClassName = `leading-relaxed ${
            ROLE_STYLE[message.role] ?? ROLE_STYLE.assistant
          }`;

          return (
            <div
              key={message.id}
              data-message-id={message.id}
              className="flex flex-col gap-3"
            >
              {message.role === "assistant" ? (
                <AssistantMessage
                  blocks={splitMarkdownBlocks(message.content)}
                  animate={message.id === lastMessage?.id}
                  bubbleClassName={bubbleClassName}
                />
              ) : (
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${bubbleClassName}`}
                >
                  <MessageContent content={message.content} />
                </div>
              )}
            </div>
          );
        })}
      </ChatTranscript>

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
