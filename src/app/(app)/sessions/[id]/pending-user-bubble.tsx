"use client";

import { usePendingMessage } from "./pending-message-context";
import { MessageContent } from "./message-content";

/**
 * The optimistic echo of whatever the founder just sent — appears the
 * instant Send is clicked (see ReplyComposer), rising into place with the
 * same fadeInUp motion used for assistant bubbles, and is gone again the
 * moment the real message has landed and taken its place in the
 * server-rendered transcript above.
 */
export function PendingUserBubble() {
  const { pendingMessage, userBubbleClassName } = usePendingMessage();

  if (!pendingMessage) return null;

  return (
    <div
      style={{ animationFillMode: "backwards" }}
      className={`max-w-[85%] animate-[fadeInUp_0.25s_ease-out] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${userBubbleClassName}`}
    >
      <MessageContent content={pendingMessage} />
    </div>
  );
}
