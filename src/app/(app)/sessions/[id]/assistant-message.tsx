"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageContent } from "./message-content";

// Pause between one bubble finishing and the next starting — reads like a
// person sending several short messages rather than one long one.
const BLOCK_GAP_MS = 500;

// Per-word typing delay, scaled down for longer blocks so a dense paragraph
// still finishes in a reasonable time instead of crawling.
const MIN_WORD_MS = 12;
const MAX_WORD_MS = 42;
const TARGET_BLOCK_MS = 1800;

function formatResponseTime(ms: number): string {
  const seconds = ms / 1000;
  return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`;
}

/** Splits into alternating word/whitespace tokens so a partial join never
 * drops or merges whitespace as the reveal grows. */
function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? [];
}

/**
 * Types out each block word-by-word, moving to the next block only once the
 * current one finishes (plus a short pause) — so a long reply reads like
 * someone composing several messages in sequence, not a paragraph dumped
 * all at once. Only runs when `active` is true (the newest turn); a page
 * refresh renders history instantly instead of replaying the animation.
 */
function useTypewriter(blocks: string[], active: boolean) {
  const tokensByBlock = useMemo(() => blocks.map(tokenize), [blocks]);
  const [blockIndex, setBlockIndex] = useState(active ? 0 : blocks.length);
  const [tokenIndex, setTokenIndex] = useState(0);

  useEffect(() => {
    if (!active || blockIndex >= blocks.length) return;
    const tokens = tokensByBlock[blockIndex];

    if (tokenIndex >= tokens.length) {
      const timer = setTimeout(() => {
        setBlockIndex((i) => i + 1);
        setTokenIndex(0);
      }, BLOCK_GAP_MS);
      return () => clearTimeout(timer);
    }

    const wordCount = tokens.filter((t) => t.trim().length > 0).length || 1;
    const perWordMs = Math.min(
      MAX_WORD_MS,
      Math.max(MIN_WORD_MS, TARGET_BLOCK_MS / wordCount)
    );
    const timer = setTimeout(() => setTokenIndex((i) => i + 1), perWordMs);
    return () => clearTimeout(timer);
  }, [active, blockIndex, tokenIndex, tokensByBlock, blocks.length]);

  return { blockIndex, tokenIndex, tokensByBlock };
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
  const { blockIndex, tokenIndex, tokensByBlock } = useTypewriter(
    blocks,
    animate
  );
  const isDone = blockIndex >= blocks.length;

  return (
    <>
      {blocks.slice(0, isDone ? blocks.length : blockIndex + 1).map((block, i) => {
        const isTyping = !isDone && i === blockIndex;
        const content = isTyping
          ? tokensByBlock[i].slice(0, tokenIndex).join("")
          : block;

        return (
          <div
            key={i}
            style={{ animationFillMode: "backwards" }}
            className={`max-w-[85%] animate-[fadeInUp_0.3s_ease-out] rounded-2xl px-4 py-2.5 text-sm ${bubbleClassName}`}
          >
            <MessageContent content={content} />
            {isTyping && (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-current align-middle opacity-60"
              />
            )}
          </div>
        );
      })}
      {responseTimeMs != null && isDone && (
        <p className="px-1 text-xs text-zinc-400 dark:text-zinc-600">
          Responded in {formatResponseTime(responseTimeMs)}
        </p>
      )}
    </>
  );
}
