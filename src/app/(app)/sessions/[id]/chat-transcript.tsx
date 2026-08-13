"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface NavItem {
  id: string;
  role: "user" | "assistant";
  label: string;
}

const NEAR_BOTTOM_THRESHOLD_PX = 80;

/**
 * Wraps the (server-rendered) chat bubbles with scroll behavior: a
 * floating "scroll to latest" button that appears once the founder has
 * scrolled up past recent messages, and a slim right-edge minimap (like
 * ChatGPT's) of tick marks — one per turn — that jump to that point in
 * the conversation.
 *
 * Also keeps the view pinned to the bottom while the newest assistant
 * reply reveals its blocks one at a time (see assistant-message.tsx) —
 * without this, the one-time "scroll to bottom on mount" lands wherever
 * the content happened to end at that instant, not the eventual bottom.
 */
export function ChatTranscript({
  children,
  navItems,
}: {
  children: ReactNode;
  navItems: NavItem[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  function checkScrollPosition() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX;
    stickToBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom);
  }

  // New turn arrived: snap to bottom and resume sticking.
  useEffect(() => {
    stickToBottomRef.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    checkScrollPosition();
  }, [navItems.length]);

  // While content keeps growing (e.g. the newest reply's blocks revealing
  // one at a time), keep the view pinned to the bottom — but only if the
  // founder hasn't deliberately scrolled away to read earlier messages.
  useEffect(() => {
    const content = contentRef.current;
    const el = scrollRef.current;
    if (!content || !el) return;

    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  function scrollToBottom() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  function scrollToMessage(id: string) {
    const target = scrollRef.current?.querySelector(`[data-message-id="${id}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={checkScrollPosition}
        className="flex max-h-[65vh] flex-1 flex-col overflow-y-auto rounded-2xl border border-black/[.08] bg-zinc-50 p-4 dark:border-white/[.1] dark:bg-zinc-900/40"
      >
        <div ref={contentRef} className="flex flex-col gap-3">
          {children}
        </div>
      </div>

      {showScrollToBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest message"
          className="absolute bottom-3 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-black/[.1] bg-white text-zinc-700 shadow-md transition-transform hover:scale-105 dark:border-white/[.15] dark:bg-zinc-800 dark:text-zinc-200"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={2}
            stroke="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m0 0l-6-6m6 6l6-6"
            />
          </svg>
        </button>
      )}

      {navItems.length > 2 && (
        <div className="pointer-events-none fixed top-1/2 right-3 z-10 hidden -translate-y-1/2 flex-col items-end gap-1 md:flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => scrollToMessage(item.id)}
              className="pointer-events-auto h-1.5 w-4 rounded-full bg-black/[.12] transition-all hover:w-6 hover:bg-black/[.35] dark:bg-white/[.15] dark:hover:bg-white/[.5]"
              aria-label={`Jump to: ${item.label}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
