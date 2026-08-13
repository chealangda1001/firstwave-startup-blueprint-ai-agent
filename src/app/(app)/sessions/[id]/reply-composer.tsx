"use client";

import { useState, useTransition } from "react";

export interface QuickReply {
  label: string;
  value: string;
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
          className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Send
        </button>
      </form>
    </div>
  );
}
