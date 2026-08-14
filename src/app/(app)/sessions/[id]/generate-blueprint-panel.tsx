"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateBlueprintForSession } from "./actions";

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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

// Blueprint synthesis is one high-effort model call over the full
// transcript — genuinely slower than a conversational turn, not an error
// state. Past this point the copy says so explicitly instead of leaving
// the founder guessing whether it's stuck.
const LONG_WAIT_MS = 15_000;

/**
 * Renders in place of the reply composer the instant a session lands on
 * status "generating" (see page.tsx) — fires the actual synthesis call on
 * mount and keeps an honest, live "still working" message on screen for
 * exactly as long as it takes, instead of the founder watching the
 * closing chat reply arrive and then... nothing, with no visible sign the
 * real work (turning the whole interview into the 9-section blueprint) is
 * even happening.
 */
export function GenerateBlueprintPanel({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [longWait, setLongWait] = useState(false);
  const [failed, setFailed] = useState(false);
  const startedRef = useRef(false);
  const router = useRouter();

  function run() {
    setFailed(false);
    startTransition(async () => {
      try {
        await generateBlueprintForSession(sessionId);
        // Re-fetches the session server-side — status is now "complete",
        // so the page swaps this panel for the "Your blueprint is ready"
        // banner on its own.
        router.refresh();
      } catch (err) {
        setFailed(true);
        toast.error(
          err instanceof Error
            ? err.message
            : "Something went wrong generating your blueprint."
        );
      }
    });
  }

  useEffect(() => {
    // Guards against React's dev-mode double-effect and any remount
    // firing this twice — generateBlueprintForSession is itself
    // idempotent (upsert on session_id), so a duplicate call wouldn't
    // corrupt anything, just waste a model call.
    if (startedRef.current) return;
    startedRef.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPending) return;
    const timer = setTimeout(() => setLongWait(true), LONG_WAIT_MS);
    return () => {
      clearTimeout(timer);
      setLongWait(false);
    };
  }, [isPending]);

  if (failed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950 dark:text-amber-200">
        <span>Something went wrong generating your blueprint.</span>
        <button
          type="button"
          onClick={run}
          className="shrink-0 rounded-full bg-amber-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/[.08] bg-white px-4 py-3 text-sm text-zinc-700 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-300">
      <Spinner />
      <span>
        {longWait
          ? "Still putting it together — the full 9-section blueprint takes a bit longer than a normal reply."
          : "Turning your interview into your product blueprint…"}
      </span>
    </div>
  );
}
