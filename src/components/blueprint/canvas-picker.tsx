"use client";

import { CANVAS_CHOICE_OPTIONS, CANVAS_CHOICE_LABELS, type CanvasChoice } from "@/lib/blueprint/canvas-choice";

/**
 * The base presentational picker — a native <select> styled as a small
 * pill, matching the "Sonnet 5 / Low" model-picker affordance in the chat
 * composer this is deliberately modeled on. Native <select> rather than a
 * custom dropdown: this needs to work identically in three very different
 * contexts (signed-out hero, a plain form, a live session), and a native
 * element needs no extra wiring to behave correctly in any of them.
 *
 * Purely controlled — callers own what "change" means (write to
 * localStorage, submit a form, call a server action).
 */
export function CanvasPicker({
  value,
  onChange,
  disabled,
  className,
}: {
  value: CanvasChoice;
  onChange: (choice: CanvasChoice) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as CanvasChoice)}
      aria-label="Canvas framework"
      className={
        className ??
        "rounded-full border border-black/[.12] bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 outline-none transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.15] dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }
    >
      {CANVAS_CHOICE_OPTIONS.map((choice) => (
        <option key={choice} value={choice}>
          {choice === "auto" ? "Canvas: Auto" : CANVAS_CHOICE_LABELS[choice]}
        </option>
      ))}
    </select>
  );
}
