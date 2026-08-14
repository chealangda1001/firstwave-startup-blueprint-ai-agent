"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AGENT_MODEL_OPTIONS, AGENT_EFFORT_OPTIONS } from "@/lib/agent-config";

export interface SiteSettingsInput {
  app_name: string;
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  agent_model: string;
  agent_effort: string;
  artifact_effort: string;
  agent_thinking_enabled: boolean;
}

/**
 * Updates the public.site_settings singleton (id=1). RLS ("site_settings:
 * admin update" from migration 0006) is the real enforcement — a non-admin
 * request would be rejected by Postgres even if this code path were somehow
 * reached. Revalidates every route that reads these settings server-side:
 * the marketing homepage, the founder app header, and this admin shell.
 * The blueprint agent itself reads fresh from the DB on every call (no
 * caching), so a model/effort change here takes effect on the very next
 * turn — no redeploy needed.
 */
export async function updateSiteSettings(input: SiteSettingsInput) {
  const trimmed = {
    app_name: input.app_name.trim(),
    hero_title: input.hero_title.trim(),
    hero_subtitle: input.hero_subtitle.trim(),
    hero_description: input.hero_description.trim(),
    agent_model: input.agent_model,
    agent_effort: input.agent_effort,
    artifact_effort: input.artifact_effort,
    agent_thinking_enabled: input.agent_thinking_enabled,
  };

  if (!trimmed.app_name) {
    throw new Error("App name can't be empty.");
  }
  if (!trimmed.hero_title) {
    throw new Error("Hero title can't be empty.");
  }
  if (!AGENT_MODEL_OPTIONS.includes(trimmed.agent_model as never)) {
    throw new Error("Unrecognized agent model.");
  }
  if (!AGENT_EFFORT_OPTIONS.includes(trimmed.agent_effort as never)) {
    throw new Error("Unrecognized agent effort level.");
  }
  if (!AGENT_EFFORT_OPTIONS.includes(trimmed.artifact_effort as never)) {
    throw new Error("Unrecognized artifact effort level.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update(trimmed)
    .eq("id", 1);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}
