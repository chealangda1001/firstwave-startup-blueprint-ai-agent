import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Service-role client — bypasses RLS entirely, and is the only way to reach
 * Supabase's Admin API (auth.admin.createUser, etc.). Never expose this to
 * the browser and never call it without an explicit is_admin check first
 * (see assertIsAdmin in app/admin/users/actions.ts) — unlike every other
 * client in this app, RLS provides zero protection here, so that check is
 * the entire enforcement layer for whatever uses this.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
