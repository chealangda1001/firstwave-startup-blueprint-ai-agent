"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SiteSettingsInput {
  app_name: string;
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
}

/**
 * Updates the public.site_settings singleton (id=1). RLS ("site_settings:
 * admin update" from migration 0006) is the real enforcement — a non-admin
 * request would be rejected by Postgres even if this code path were somehow
 * reached. Revalidates every route that reads these settings server-side:
 * the marketing homepage, the founder app header, and this admin shell.
 */
export async function updateSiteSettings(input: SiteSettingsInput) {
  const trimmed = {
    app_name: input.app_name.trim(),
    hero_title: input.hero_title.trim(),
    hero_subtitle: input.hero_subtitle.trim(),
    hero_description: input.hero_description.trim(),
  };

  if (!trimmed.app_name) {
    throw new Error("App name can't be empty.");
  }
  if (!trimmed.hero_title) {
    throw new Error("Hero title can't be empty.");
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
