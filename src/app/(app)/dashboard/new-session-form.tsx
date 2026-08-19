"use client";

import { useSyncExternalStore, useState } from "react";
import { createSession } from "./actions";
import { CanvasPicker } from "@/components/blueprint/canvas-picker";
import {
  CANVAS_CHOICE_STORAGE_KEY,
  type CanvasChoice,
} from "@/lib/blueprint/canvas-choice";

function subscribe() {
  // localStorage only ever changes here via this component's own picker,
  // in this tab — no cross-tab sync needed, so an empty unsubscribe is
  // correct, not a shortcut.
  return () => {};
}

function getSnapshot(): CanvasChoice {
  try {
    const stored = window.localStorage.getItem(CANVAS_CHOICE_STORAGE_KEY);
    return stored === "lean" || stored === "bmc" ? stored : "auto";
  } catch {
    return "auto";
  }
}

function getServerSnapshot(): CanvasChoice {
  return "auto";
}

/**
 * Wraps createSession in a client component only so the canvas choice can
 * be read from localStorage before submit — carrying forward whatever the
 * founder picked on the homepage hero, same-browser, before they even had
 * an account. useSyncExternalStore (not useState+useEffect) reads it: the
 * server has no localStorage, so the initial render must render "auto"
 * either way to avoid a hydration mismatch, and this is exactly what that
 * hook is for — an external store that differs between server and client.
 *
 * Still a real <form action={createSession}> underneath, so it works with
 * JS disabled too (just always submits "auto" in that case).
 */
export function NewSessionForm() {
  const storedChoice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Local override so picking a value here updates immediately, rather
  // than waiting on a localStorage write this component doesn't own.
  const [override, setOverride] = useState<CanvasChoice | null>(null);
  const choice = override ?? storedChoice;

  function handleChange(next: CanvasChoice) {
    setOverride(next);
    try {
      window.localStorage.setItem(CANVAS_CHOICE_STORAGE_KEY, next);
    } catch {
      // Private browsing / storage disabled — the override state above
      // still makes the picker itself work correctly for this page visit.
    }
  }

  return (
    <form action={createSession} className="flex items-center gap-2">
      <input type="hidden" name="canvas_choice" value={choice} />
      <CanvasPicker value={choice} onChange={handleChange} />
      <button
        type="submit"
        className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        + New session
      </button>
    </form>
  );
}
