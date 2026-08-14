"use client";

import { useEffect, useState, useTransition } from "react";

export interface QuickReply {
  label: string;
  value: string;
}

// A normal turn is one model call and usually lands well under this. Past
// it, we're most likely in the slower path: the interview just wrapped and
// the agent is drafting the full blueprint (a second, heavier call) — so the
// phrase below is a real, timing-based signal, not a scripted animation.
const LONG_WAIT_MS = 12_000;

/**
 * Two honest phases, not a fabricated sequence: there's exactly one thing
 * happening server-side (a single model call) until it isn't — a wait that
 * runs past LONG_WAIT_MS is the tell that the heavier blueprint-drafting
 * call kicked in, so the copy switches to reflect that likelihood.
 */
function useWorkingPhrase(active: boolean) {
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setLongWait(true), LONG_WAIT_MS);
    return () => {
      clearTimeout(timer);
      setLongWait(false);
    };
  }, [active]);

  return longWait
    ? "Putting your blueprint together — this one takes a bit longer…"
    : "The agent is thinking about your answer…";
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

/**
 * Reply input: optional tappable quick-reply chips (for bounded/categorical
 * questions) above the always-present free-text box. Picking a chip submits
 * that answer immediately, unless multiSelect is set, in which case chips
 * toggle and a "Continue" button submits the combined selection.
 */
export function ReplyComposer({
  sendMessage,
  quickReplies,
  multiSelect,
}: {
  sendMessage: (formData: FormData) => void | Promise<void>;
  quickReplies: QuickReply[] | null;
  multiSelect: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const workingPhrase = useWorkingPhrase(isPending);

  function submitValue(value: string) {
    const formData = new FormData();
    formData.set("content", value);
    startTransition(() => {
      sendMessage(formData);
    });
  }

  function toggle(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  function submitSelected() {
    const chosen = (quickReplies ?? []).filter((q) => selected.has(q.value));
    if (chosen.length === 0) return;
    submitValue(chosen.map((q) => q.value).join(" "));
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {isPending && (
        <div className="flex items-center gap-2 self-start rounded-2xl border border-dashed border-black/[.15] px-4 py-2 text-xs italic text-zinc-500 dark:border-white/[.2] dark:text-zinc-500">
          <Spinner />
          <span>{workingPhrase}</span>
        </div>
      )}

      {quickReplies && quickReplies.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {quickReplies.map((q) => {
            const isSelected = selected.has(q.value);
            return (
              <button
                key={q.value}
                type="button"
                disabled={isPending}
                onClick={() =>
                  multiSelect ? toggle(q.value) : submitValue(q.value)
                }
                aria-pressed={multiSelect ? isSelected : undefined}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  isSelected
                    ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                    : "border-black/[.15] bg-white text-zinc-800 hover:border-zinc-950/40 dark:border-white/[.2] dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-50/40"
                }`}
              >
                {q.label}
              </button>
            );
          })}
          {multiSelect && (
            <button
              type="button"
              disabled={isPending || selected.size === 0}
              onClick={submitSelected}
              className="rounded-full bg-zinc-950 px-3.5 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950"
            >
              Continue
            </button>
          )}
        </div>
      )}

      <form
        action={(formData) => {
          startTransition(() => {
            sendMessage(formData);
          });
        }}
        className="flex items-end gap-2"
      >
        <textarea
          name="content"
          required
          rows={2}
          disabled={isPending}
          placeholder={
            quickReplies && quickReplies.length > 0
              ? "Or type your own answer…"
              : "Type your answer…"
          }
          className="flex-1 resize-none rounded-xl border border-black/[.12] bg-white px-3 py-2 text-sm outline-none focus:border-zinc-950 disabled:opacity-60 dark:border-white/[.15] dark:bg-zinc-950 dark:focus:border-zinc-50"
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex min-w-[92px] items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {isPending ? (
            <>
              <Spinner />
              Sending…
            </>
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
}
