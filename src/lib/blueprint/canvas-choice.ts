// Plain constants/types shared between server code (agent.ts, the session
// and dashboard actions) and client components (CanvasPicker) — kept as
// its own file for the same reason as agent-config.ts: anything imported
// from a "server-only" file breaks a client component's build, even a
// pure type or literal.

export type CanvasChoice = "auto" | "lean" | "bmc";

export const CANVAS_CHOICE_OPTIONS: CanvasChoice[] = ["auto", "lean", "bmc"];

export const CANVAS_CHOICE_LABELS: Record<CanvasChoice, string> = {
  auto: "Auto",
  lean: "Lean Canvas",
  bmc: "Business Model Canvas",
};

// The localStorage key the homepage hero picker writes to and the
// dashboard's "+ New session" form reads from, so a choice made before
// signing up carries over into the founder's first session — same
// browser only (there's no session/account yet to persist it against
// server-side, and email confirmation may happen on a different device).
export const CANVAS_CHOICE_STORAGE_KEY = "blueprint-agent:canvas-choice";
