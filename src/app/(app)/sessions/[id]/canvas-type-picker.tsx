"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CanvasPicker } from "@/components/blueprint/canvas-picker";
import { setCanvasType } from "./actions";
import type { CanvasChoice } from "@/lib/blueprint/canvas-choice";

/**
 * The live, in-session version of the canvas picker — calls setCanvasType
 * immediately on change, same pattern as a model-choice picker switching
 * mid-conversation. Switching after Section 3 has started restarts it
 * under the new framework (see canvasLockText in agent.ts); this
 * component itself doesn't need to know that, it just fires the change
 * and lets the next turn's system prompt handle the consequence.
 */
export function CanvasTypePicker({
  sessionId,
  initialChoice,
}: {
  sessionId: string;
  initialChoice: CanvasChoice;
}) {
  const [choice, setChoice] = useState<CanvasChoice>(initialChoice);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: CanvasChoice) {
    const previous = choice;
    setChoice(next);
    startTransition(async () => {
      try {
        await setCanvasType(sessionId, next);
      } catch (err) {
        setChoice(previous);
        toast.error(
          err instanceof Error ? err.message : "Could not change the canvas framework."
        );
      }
    });
  }

  return (
    <CanvasPicker value={choice} onChange={handleChange} disabled={isPending} />
  );
}
