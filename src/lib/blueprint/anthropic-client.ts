import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-only Anthropic client. Never import this from a Client Component —
 * the "server-only" import throws a build error if that happens.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Model used for every blueprint-agent call. */
export const BLUEPRINT_MODEL = "claude-opus-5";
