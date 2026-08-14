"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateAdminUserInput {
  email: string;
  password: string;
  full_name: string;
}

/**
 * The real enforcement for every action in this file — the admin client
 * (service role) bypasses RLS entirely, so unlike the rest of the app this
 * check IS the security boundary, not a defense-in-depth belt on top of
 * RLS. Every export below calls this first.
 */
async function assertIsAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    throw new Error("Admin access required.");
  }

  return user;
}

/**
 * Promotes or demotes an existing account. Uses the service-role client
 * because there's no "admin can update another profile's is_admin" RLS
 * policy — assertIsAdmin() above is what makes that safe.
 */
export async function setUserAdmin(userId: string, isAdmin: boolean) {
  const actor = await assertIsAdmin();

  if (userId === actor.id && !isAdmin) {
    throw new Error("You can't remove your own admin access.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/users");
}

/**
 * Creates a brand-new account that's already email-confirmed (no
 * verification link sent or required — email_confirm: true) and already an
 * admin. The password is whatever the creating admin typed in; there's no
 * self-service invite flow, so they're expected to hand the credentials to
 * the new admin directly.
 */
export async function createAdminUser(input: CreateAdminUserInput) {
  await assertIsAdmin();

  const email = input.email.trim().toLowerCase();
  const fullName = input.full_name.trim();

  if (!email) {
    throw new Error("Email can't be empty.");
  }
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  // handle_new_user() (migration 0001) creates the profiles row
  // synchronously as part of the auth.users insert above — safe to update
  // it immediately.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ is_admin: true })
    .eq("id", data.user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/admin/users");
}
