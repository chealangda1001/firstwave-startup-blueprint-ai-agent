"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface PendingMessageContextValue {
  pendingMessage: string | null;
  setPendingMessage: (message: string | null) => void;
  userBubbleClassName: string;
}

const PendingMessageContext = createContext<PendingMessageContextValue | null>(
  null
);

/**
 * Bridges ReplyComposer and ChatTranscript — two separate client component
 * trees under the same server-rendered page — so the moment Send is
 * clicked, the typed text can appear as a bubble in the transcript
 * immediately, instead of waiting for the round trip to the server and
 * back. Cleared the instant the real message lands (see ReplyComposer),
 * at which point the server-rendered bubble is already in place, so there
 * is no flicker or gap.
 */
export function PendingMessageProvider({
  userBubbleClassName,
  children,
}: {
  userBubbleClassName: string;
  children: ReactNode;
}) {
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  return (
    <PendingMessageContext.Provider
      value={{ pendingMessage, setPendingMessage, userBubbleClassName }}
    >
      {children}
    </PendingMessageContext.Provider>
  );
}

export function usePendingMessage() {
  const ctx = useContext(PendingMessageContext);
  if (!ctx) {
    throw new Error(
      "usePendingMessage must be used within a PendingMessageProvider"
    );
  }
  return ctx;
}
