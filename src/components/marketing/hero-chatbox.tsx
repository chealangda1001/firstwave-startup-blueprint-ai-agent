"use client";

import { useState } from "react";
import { SignupModal } from "./signup-modal";
import { CanvasPicker } from "@/components/blueprint/canvas-picker";
import {
  CANVAS_CHOICE_STORAGE_KEY,
  type CanvasChoice,
} from "@/lib/blueprint/canvas-choice";

/**
 * A working-looking chat box in the hero, autofocused so the cursor is
 * already blinking when the page loads — the "start typing your idea
 * right now" nudge that Gemini/Lovable-style landing pages use, instead of
 * a plain CTA button. There's no session behind it for a signed-out
 * visitor yet, so submitting (Enter or the send button) opens the signup
 * modal rather than pretending to respond — the typed text stays visible
 * behind the modal, same as Lovable's own pattern, so it reads as "sign up
 * to continue this" rather than "your message vanished."
 *
 * The canvas picker here writes straight to localStorage — there's no
 * session (or account) yet to attach the choice to. The dashboard's
 * "+ New session" form reads that same key so the choice carries through
 * to the founder's first real session, same-browser only (email
 * confirmation can happen on a different device, which this can't help).
 */
export function HeroChatbox({ appName }: { appName: string }) {
  const [value, setValue] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [canvasChoice, setCanvasChoice] = useState<CanvasChoice>("auto");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setModalOpen(true);
  }

  function handleCanvasChange(choice: CanvasChoice) {
    setCanvasChoice(choice);
    try {
      window.localStorage.setItem(CANVAS_CHOICE_STORAGE_KEY, choice);
    } catch {
      // Private browsing / storage disabled — the picker still works for
      // this page load, it just won't carry through to signup.
    }
  }

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <form
          onSubmit={handleSubmit}
          className="flex w-full items-center gap-2 rounded-full border border-white/[.12] bg-white/[.06] py-2.5 pr-2.5 pl-5 backdrop-blur-sm transition-colors focus-within:border-white/25"
        >
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            placeholder={`Ask ${appName} to turn your idea into a plan…`}
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500 sm:text-base"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            aria-label="Start"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-950 transition-opacity disabled:opacity-30"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
            </svg>
          </button>
        </form>

        <div className="pl-1">
          <CanvasPicker
            value={canvasChoice}
            onChange={handleCanvasChange}
            className="rounded-full border border-white/[.15] bg-white/[.06] px-3 py-1 text-xs font-medium text-zinc-300 outline-none transition-colors hover:bg-white/[.1] dark:border-white/[.15]"
          />
        </div>
      </div>

      <SignupModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
