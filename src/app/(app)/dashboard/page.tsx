import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createSession } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  in_progress: "In progress",
  complete: "Complete",
  abandoned: "Abandoned",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, title, domain, canvas_type, status, current_stage, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            Your blueprints
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Start a new session or pick up where you left off.
          </p>
        </div>
        <form action={createSession}>
          <button
            type="submit"
            className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            + New session
          </button>
        </form>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Could not load your sessions: {error.message}
        </p>
      )}

      {sessions && sessions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-black/[.12] px-6 py-12 text-center text-sm text-zinc-500 dark:border-white/[.15] dark:text-zinc-500">
          No sessions yet. Start one above — it takes about 20–30 minutes.
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/sessions/${session.id}`}
                className="flex items-center justify-between rounded-xl border border-black/[.08] bg-white px-4 py-3 transition-colors hover:border-zinc-950/30 dark:border-white/[.1] dark:bg-zinc-950 dark:hover:border-zinc-50/30"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                    {session.title || session.domain || "Untitled blueprint"}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                    {session.canvas_type
                      ? session.canvas_type === "lean"
                        ? "Lean Canvas"
                        : "Business Model Canvas"
                      : "Canvas not yet chosen"}{" "}
                    · {session.current_stage}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {STATUS_LABEL[session.status] ?? session.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
