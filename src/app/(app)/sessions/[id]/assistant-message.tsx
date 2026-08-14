"use client";

import { useEffect, useState } from "react";
import { MessageContent } from "./message-content";

const REVEAL_GAP_MS = 700;

/**
 * Renders a long assistant reply as several short bubbles instead of one
 * wall of text. When `animate` is true (only the newest turn, so a page
 * refresh doesn't replay the whole history), bubbles appear one at a time
 * with a short gap — reads like a person typing several messages instead
 * of a bot dumping a paragraph.
 */
function formatResponseTime(ms: number): string {
  const seconds = ms / 1000;
  return seconds < 10
    ? `${seconds.toFixed(1)}s`
    : `${Math.round(seconds)}s`;
}

export function AssistantMessage({
  blocks,
  animate,
  bubbleClassName,
  responseTimeMs,
}: {
  blocks: string[];
  animate: boolean;
  bubbleClassName: string;
  responseTimeMs?: number | null;
}) {
  const [visibleCount, setVisibleCount] = useState(animate ? 1 : blocks.length);

  useEffect(() => {
    if (!animate || visibleCount >= blocks.length) return;
    const timer = setTimeout(() => {
      setVisibleCount((count) => count + 1);
    }, REVEAL_GAP_MS);
    return () => clearTimeout(timer);
  }, [animate, visibleCount, blocks.length]);

  return (
    <>
      {blocks.slice(0, visibleCount).map((block, i) => (
        <div
          key={i}
          style={{ animationFillMode: "backwards" }}
          className={`max-w-[85%] animate-[fadeInUp_0.3s_ease-out] rounded-2xl px-4 py-2.5 text-sm ${bubbleClassName}`}
        >
          <MessageContent content={block} />
        </div>
      ))}
      {responseTimeMs != null && visibleCount >= blocks.length && (
        <p className="px-1 text-xs text-zinc-400 dark:text-zinc-600">
          Responded in {formatResponseTime(responseTimeMs)}
        </p>
      )}
    </>
  );
}
