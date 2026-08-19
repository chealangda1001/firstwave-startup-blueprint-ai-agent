import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMessage, retryLastTurn } from "./actions";
import { ReplyComposer, type QuickReply } from "./reply-composer";
import { MessageContent } from "./message-content";
import { AssistantMessage } from "./assistant-message";
import { ChatTranscript, type NavItem } from "./chat-transcript";
import { splitMarkdownBlocks } from "@/lib/blueprint/split-blocks";
import { stageLabel, statusLabel } from "@/lib/blueprint/labels";
import { PendingMessageProvider } from "./pending-message-context";
import { PendingUserBubble } from "./pending-user-bubble";
import { GenerateBlueprintPanel } from "./generate-blueprint-panel";
import { CanvasTypePicker } from "./canvas-type-picker";
import type { CanvasChoice } from "@/lib/blueprint/canvas-choice";

// Route segment config, not a plain export — this is what actually raises
// the Vercel function timeout for Server Actions invoked from this page
// (a "use server" file itself can only export async functions, so this
// can't live in actions.ts). Default is 10s on Hobby.
//
// Raised from 60 to 280 after a real production failure: 60s was hit
// exactly — Vercel logs showed "Task timed out after 60 seconds" mid
// blueprint synthesis. That's a hard kill, not a JS exception, so
// generateBlueprintForSession's own try/catch (which resets status back
// to in_progress on failure) never got the chance to run — the session
// was left stuck on "generating" forever with no recovery path. 280s is
// comfortably under Vercel's serverless ceiling and gives real headroom
// for the two parallel synthesis calls on a long, detailed transcript.
export const maxDuration = 280;

const ROLE_STYLE: Record<string, string> = {
  assistant:
    "self-start bg-white border border-black/[.08] text-zinc-900 dark:bg-zinc-950 dark:border-white/[.1] dark:text-zinc-100",
  user: "self-end bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950",
};

function excerpt(text: string, max = 42) {
  const oneLine = text.replace(/[*_#>`\n]/g, " ").replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

// Isolated so the impure Date.now() call happens in a plain function, not
// directly in the page component's render body.
function isWithinMs(isoTimestamp: string, windowMs: number): boolean {
  return Date.now() - new Date(isoTimestamp).getTime() < windowMs;
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
    .select(
      "id, title, domain, canvas_type, canvas_type_locked, status, current_stage"
    )
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: allMessages } = await supabase
    .from("session_messages")
    .select(
      "id, role, content, stage, created_at, quick_replies, quick_replies_multi_select, response_time_ms"
    )
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const isComplete = session.status === "complete";
  const isGenerating = session.status === "generating";
  const canvasChoice: CanvasChoice = session.canvas_type_locked
    ? (session.canvas_type as "lean" | "bmc")
    : "auto";
  const boundSendMessage = sendMessage.bind(null, id);
  const boundRetryLastTurn = retryLastTurn.bind(null, id);

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

  // Only the message from the turn that *just* happened should type itself
  // out — a reload (or coming back later) re-fetches the same "last
  // message" from the DB, but by then it's old news and should render
  // instantly, not replay the typing animation. "Just happened" is decided
  // by age, not identity: a live send always renders within a second or
  // two of the row's created_at, while any genuine reload happens well
  // after the reply was already read.
  const ANIMATE_WINDOW_MS = 15_000;
  const isFreshlyArrived =
    lastMessage?.role === "assistant" &&
    isWithinMs(lastMessage.created_at, ANIMATE_WINDOW_MS);

  // A last message still sitting on "user" means the founder's answer never
  // got a reply — the agent call failed (or the app crashed) and nothing
  // else moves the conversation forward. Gated by age so a reload during a
  // still-in-flight (not yet failed) request doesn't show a premature
  // retry — RETRY_AFTER_MS is comfortably past how long even a slow normal
  // turn takes.
  const RETRY_AFTER_MS = 25_000;
  const needsRetry =
    lastMessage?.role === "user" &&
    !isWithinMs(lastMessage.created_at, RETRY_AFTER_MS);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {session.title || session.domain || "Untitled blueprint"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            {stageLabel(session.current_stage)} · {statusLabel(session.status)}
          </p>
        </div>
        {!isComplete && !isGenerating && (
          <CanvasTypePicker sessionId={id} initialChoice={canvasChoice} />
        )}
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

      <PendingMessageProvider userBubbleClassName={ROLE_STYLE.user}>
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
                    animate={message.id === lastMessage?.id && isFreshlyArrived}
                    bubbleClassName={bubbleClassName}
                    responseTimeMs={message.response_time_ms}
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
          {/* ReplyComposer is what clears the optimistic pending bubble
              once a turn lands (see its mount effect) — but it unmounts
              entirely, rather than remounting, once the session reaches
              "generating"/"complete", so it never gets the chance to clear
              this. Gating rendering here the same way ReplyComposer's own
              visibility is gated prevents the now-persisted message from
              briefly appearing twice: once for real in the transcript
              above, once as a stale optimistic echo down here. */}
          {!isComplete && !isGenerating && <PendingUserBubble />}
        </ChatTranscript>

        {isGenerating && <GenerateBlueprintPanel sessionId={id} />}

        {!isComplete && !isGenerating && (
          <ReplyComposer
            key={lastMessage?.id}
            sendMessage={boundSendMessage}
            retryLastTurn={boundRetryLastTurn}
            needsRetry={needsRetry}
            quickReplies={quickReplies}
            multiSelect={quickRepliesMultiSelect}
          />
        )}
      </PendingMessageProvider>
    </div>
  );
}
