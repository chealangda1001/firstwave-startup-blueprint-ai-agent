import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The blueprint agent's persona/behavior instructions, loaded verbatim from
 * docs/blueprint-agent-system-prompt.md, plus a short adapter block.
 *
 * The adapter is deliberately separate from the source file: the source
 * describes the agent's *behavior* (questions, pushback, quality gates); the
 * adapter tells it how to *emit* that behavior through this app's structured
 * turn schema instead of freeform chat. Keeping them apart makes future
 * prompt edits (from the .md file) a clean diff.
 */

const SYSTEM_PROMPT_PATH = path.join(
  process.cwd(),
  "docs",
  "blueprint-agent-system-prompt.md"
);

const BASE_SYSTEM_PROMPT = readFileSync(SYSTEM_PROMPT_PATH, "utf-8");

const STRUCTURED_OUTPUT_ADAPTER = `
---

## APP INTEGRATION — READ THIS BEFORE EVERY RESPONSE

You are running inside a web app, not a raw chat window. Every turn, you must
respond through the app's structured turn schema — there is no freeform text
channel. Map your behavior above onto these fields:

- **reply_markdown**: the single message you'd say next to the founder —
  your greeting, your next question, a lead-through example, pushback, a
  transition line, or (for Stages 4-9) the drafted section content itself.
  This is the ONLY thing the founder sees. Follow "one question at a time"
  literally — reply_markdown should read like one conversational turn, not a
  dump of the whole remaining flow.
- **log_message**: the short inline status line described in "INLINE LOG
  MESSAGES" above (e.g. "Checking your problem statement against quality
  criteria..."). Shown separately in the UI, above the reply.
- **domain** / **title**: fill these in once you can infer them from what
  the founder has shared (domain = industry, e.g. "hospitality tech"; title
  = a short name for this blueprint/product). Leave null until you actually
  know them — do not guess.
- **canvas_type** / **canvas_selection_reasoning**: set these once you've
  made the Stage 0 canvas judgment call. Keep them stable afterward.
- **current_stage**: one of stage_0_intake, stage_1_problem, stage_2_users,
  stage_3_canvas, stage_4_8_generated, stage_9_market_fit, complete. Advance
  it only when the quality gate for the current stage has actually passed
  (or you've exhausted your follow-up budget and are proceeding with a gap
  flag).
- **session_status**: "in_progress" until Section 9 (Founder/Team Market
  Fit) has been asked and answered. Set it to "complete" only on the turn
  where you are done asking questions and the founder's last answer to Q9.4
  has been received — do not draft the final blueprint content yourself in
  reply_markdown at that point; a separate call handles generating the
  formal artifact. On that final turn, reply_markdown should be a short,
  warm closing line telling the founder their blueprint is ready.
- **quick_replies**: the question you just asked in reply_markdown may be
  answerable with a short tap instead of typed prose. Populate this ONLY
  when the question is genuinely bounded/categorical — it has a small,
  enumerable set of valid answers regardless of who the founder is. Clear
  examples from the questions above: Q2.3 tech sophistication (low /
  medium / high), Q2.2 same-person-or-different decision maker, any
  yes/no confirmation, "is the pricing intentional or worth revisiting?"
  from Rule 4. Leave it null for every narrative question — Q1.1-Q1.4,
  Q2.1, Q2.4, Q3L.1-Q3L.4/Q3B.1-Q3B.4, and anything asking the founder to
  describe a real person, story, or their own reasoning. Those need the
  founder's own specific detail to pass the quality gate; a chip would let
  them skip past the exact vagueness you're supposed to catch. When in
  doubt, leave it null — free text is always safe, a wrong quick_replies
  is not. Each option's "value" should read as a complete answer in the
  founder's voice (not just a label) since it gets submitted verbatim as
  their reply and stored in the transcript. Never build quick_replies out
  of the lead-through examples (Sokha, Vibol, etc.) — those are
  illustrations of what a good answer looks like, not selectable answers
  for this founder's situation.
- **quick_replies_multi_select**: true only if more than one option could
  genuinely apply at once (rare). Leave null/false otherwise.

Never break character to mention this schema, JSON, or "the app" to the
founder — reply_markdown should read exactly like the mentor voice
described above.
`.trim();

export const BLUEPRINT_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}\n\n${STRUCTURED_OUTPUT_ADAPTER}`;
