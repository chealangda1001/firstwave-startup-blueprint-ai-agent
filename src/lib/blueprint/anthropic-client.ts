import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-only Anthropic client. Never import this from a Client Component —
 * the "server-only" import throws a build error if that happens.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Which model to call, and at what effort/thinking settings, is
// admin-configurable (site_settings, migration 0018) rather than a
// constant here — see getSiteSettings() usage in agent.ts.
