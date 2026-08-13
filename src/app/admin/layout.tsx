import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { signOut } from "@/app/login/actions";

/**
 * Everything under /admin is gated on profiles.is_admin — checked here
 * server-side (belt) on top of the RLS policies from migration 0004
 * (suspenders). A signed-out visitor goes to /login; a signed-in
 * non-admin is bounced to their own dashboard rather than shown a 404
 * (simplest, doesn't need a special "you don't have access" page).
 *
 * Deliberately a completely separate shell from the founder-facing
 * (app) layout — different structure (sidebar vs. centered chat card),
 * different palette (slate/indigo vs. the founder app's zinc/black), no
 * shared nav. Nothing here should read as "the same product surface."
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  const navItems = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/knowledge-base", label: "Knowledge base" },
    { href: "/admin/sessions", label: "Sessions" },
  ];

  return (
    <div className="admin-scope flex min-h-screen w-full bg-slate-50 text-slate-900">
      <aside className="flex w-60 shrink-0 flex-col justify-between border-r border-slate-200 bg-slate-950 text-slate-100">
        <div>
          <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
            <Badge className="rounded-sm bg-indigo-500 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white hover:bg-indigo-500">
              ADMIN
            </Badge>
            <span className="text-sm font-semibold text-slate-100">
              Blueprint Agent
            </span>
          </div>
          <nav className="flex flex-col gap-0.5 px-3 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-900 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-800 px-4 py-4">
          <p className="truncate text-xs text-slate-400">{profile.email}</p>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="w-full rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-900"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
      <Toaster />
    </div>
  );
}
