"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { renameSession, deleteSession } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  in_progress: "In progress",
  complete: "Complete",
  abandoned: "Abandoned",
};

export interface SessionCardData {
  id: string;
  title: string | null;
  domain: string | null;
  canvas_type: string | null;
  status: string;
  current_stage: string;
}

export function SessionCard({ session }: { session: SessionCardData }) {
  const [isPending, startTransition] = useTransition();
  const [isRenaming, setIsRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [title, setTitle] = useState(
    session.title || session.domain || "Untitled blueprint"
  );
  const [error, setError] = useState<string | null>(null);

  function saveRename() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title can't be empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await renameSession(session.id, trimmed);
        setIsRenaming(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not rename.");
      }
    });
  }

  function cancelRename() {
    setTitle(session.title || session.domain || "Untitled blueprint");
    setError(null);
    setIsRenaming(false);
  }

  function confirmDelete() {
    startTransition(async () => {
      try {
        await deleteSession(session.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete.");
        setConfirmingDelete(false);
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-black/[.08] bg-white px-4 py-3 transition-colors hover:border-zinc-950/30 dark:border-white/[.1] dark:bg-zinc-950 dark:hover:border-zinc-50/30">
      <div className="min-w-0 flex-1">
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={title}
              disabled={isPending}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") cancelRename();
              }}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm font-medium text-zinc-950 outline-none focus:border-zinc-950 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-zinc-50"
            />
            <button
              type="button"
              onClick={saveRename}
              disabled={isPending}
              className="text-xs font-medium text-zinc-950 hover:underline dark:text-zinc-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelRename}
              disabled={isPending}
              className="text-xs text-zinc-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <Link href={`/sessions/${session.id}`} className="block">
            <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
              {session.title || session.domain || "Untitled blueprint"}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
              {session.canvas_type
                ? session.canvas_type === "lean"
                  ? "Lean Canvas"
                  : "Business Model Canvas"
                : "Canvas not yet chosen"}{" "}
              · {session.current_stage}
            </p>
          </Link>
        )}
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {STATUS_LABEL[session.status] ?? session.status}
        </span>

        {!isRenaming && (
          <button
            type="button"
            onClick={() => setIsRenaming(true)}
            disabled={isPending}
            title="Rename"
            aria-label="Rename session"
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
              />
            </svg>
          </button>
        )}

        {confirmingDelete ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isPending}
              className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isPending ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={isPending}
              className="text-xs text-zinc-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={isPending}
            title="Delete"
            aria-label="Delete session"
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
              />
            </svg>
          </button>
        )}
      </div>
    </li>
  );
}
