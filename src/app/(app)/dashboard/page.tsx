import { createClient } from "@/lib/supabase/server";
import { SessionCard } from "./session-card";
import { NewSessionForm } from "./new-session-form";

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
        <NewSessionForm />
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
            <SessionCard key={session.id} session={session} />
          ))}
        </ul>
      )}
    </div>
  );
}
