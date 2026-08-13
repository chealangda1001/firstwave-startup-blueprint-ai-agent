/**
 * Deterministic Stage 0 → Q1.1 opener, used when a new session is created.
 *
 * Phase 2 has no LLM wired up yet (that's Phase 3), so a session opens with
 * this fixed script rather than a domain-aware introduction. It matches the
 * STAGE 0 / Q1.1 language in docs/blueprint-agent-system-prompt.md.
 */

export const STAGE_0_OPENING = `I'm your blueprint partner for this session. We'll go through three core areas together: the problem you're solving, who exactly you're solving it for, and how your business works. I'll ask you questions, push back when I think you're being too vague, and at the end I'll produce a structured blueprint document you can share with your team.

This usually takes 20–30 minutes. I'll ask one question at a time.`;

export const Q1_1_EXISTENCE_TEST = `Let's start with the problem. Describe one specific person who has this problem right now — not a type of person, one real or realistic individual. What are they doing today, manually or badly, because your product doesn't exist yet?`;

export const PHASE_3_PLACEHOLDER_NOTE = `Noted — thanks. The agent's follow-up reasoning (quality gates, pushback, and section generation) plugs in during Phase 3. For now your answer has been saved to this session's transcript.`;
