import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function startOfWeek(now: Date) {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardDescription className="text-slate-500">{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums text-slate-900">
          {value}
        </CardTitle>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </CardHeader>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const now = new Date();
  const weekStart = startOfWeek(now).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  const [
    { count: totalSignups },
    { count: sessionsThisWeek },
    { count: sessionsThisMonth },
    { count: sessionsCompleted },
    { count: sessionsTotal },
    { count: blueprintsGenerated },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "complete"),
    supabase.from("sessions").select("*", { count: "exact", head: true }),
    supabase.from("blueprints").select("*", { count: "exact", head: true }),
  ]);

  const total = sessionsTotal ?? 0;
  const completed = sessionsCompleted ?? 0;
  const completionRate =
    total > 0 ? `${Math.round((completed / total) * 100)}%` : "—";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500">
          Read-only counts across the whole product.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total signups" value={totalSignups ?? 0} />
        <StatCard
          label="Sessions started this week"
          value={sessionsThisWeek ?? 0}
          hint="Since Monday, UTC"
        />
        <StatCard
          label="Sessions started this month"
          value={sessionsThisMonth ?? 0}
        />
        <StatCard
          label="Sessions completed"
          value={completed}
          hint={`out of ${total} total`}
        />
        <StatCard label="Completion rate" value={completionRate} />
        <StatCard
          label="Blueprints generated"
          value={blueprintsGenerated ?? 0}
        />
      </div>
    </div>
  );
}
