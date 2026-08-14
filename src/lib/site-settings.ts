import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SiteSettings {
  app_name: string;
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  agent_model: string;
  agent_effort: string;
  artifact_model: string;
  artifact_effort: string;
  agent_thinking_enabled: boolean;
}

// Matches the column defaults in migrations 0006, 0018, and 0021 — used
// only if the singleton row is somehow missing (fresh DB before the seed
// insert ran, or the read fails), so the app never renders blank hero copy
// or calls the LLM with an undefined model. artifact_model defaults to
// Opus, not Sonnet — see migration 0021: the blueprint-synthesis schema is
// too large for Sonnet 5's structured-output grammar compiler.
const FALLBACK: SiteSettings = {
  app_name: "Blueprint Agent",
  hero_title: "Turn a raw idea into a structured product blueprint",
  hero_subtitle:
    "A 20–30 minute conversation with an AI agent that pushes back on vague answers.",
  hero_description:
    "Get a 9-section blueprint — problem, users, business model, and more — ready to share with engineering, marketing, and finance.",
  agent_model: "claude-sonnet-5",
  agent_effort: "medium",
  artifact_model: "claude-opus-5",
  artifact_effort: "high",
  agent_thinking_enabled: false,
};

/**
 * Reads the public.site_settings singleton (id=1) — the admin-editable app
 * name, landing page hero copy, and blueprint agent model/effort settings.
 * Publicly readable via RLS (migration 0006), so this is safe to call for
 * signed-out visitors too. Falls back to the shipped defaults on any error
 * so a settings-row hiccup never blanks out the homepage, the browser tab
 * title, or leaves the agent calling the LLM with an undefined model.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select(
      "app_name, hero_title, hero_subtitle, hero_description, agent_model, agent_effort, artifact_model, artifact_effort, agent_thinking_enabled"
    )
    .eq("id", 1)
    .single();

  return data ?? FALLBACK;
}
