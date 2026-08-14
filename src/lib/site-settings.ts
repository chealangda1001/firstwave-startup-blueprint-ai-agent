import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SiteSettings {
  app_name: string;
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
}

// Matches the column defaults in migration 0006 — used only if the
// singleton row is somehow missing (fresh DB before the seed insert ran,
// or the read fails), so the app never renders blank hero copy.
const FALLBACK: SiteSettings = {
  app_name: "Blueprint Agent",
  hero_title: "Turn a raw idea into a structured product blueprint",
  hero_subtitle:
    "A 20–30 minute conversation with an AI agent that pushes back on vague answers.",
  hero_description:
    "Get a 9-section blueprint — problem, users, business model, and more — ready to share with engineering, marketing, and finance.",
};

/**
 * Reads the public.site_settings singleton (id=1) — the admin-editable app
 * name and landing page hero copy. Publicly readable via RLS (migration
 * 0006), so this is safe to call for signed-out visitors too. Falls back to
 * the shipped defaults on any error so a settings-row hiccup never blanks
 * out the homepage or the browser tab title.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("app_name, hero_title, hero_subtitle, hero_description")
    .eq("id", 1)
    .single();

  return data ?? FALLBACK;
}
