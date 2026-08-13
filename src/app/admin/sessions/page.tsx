import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<string, string> = {
  complete: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  in_progress: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  abandoned: "bg-slate-200 text-slate-700 hover:bg-slate-200",
};

export default async function AdminSessionsPage() {
  const supabase = await createClient();

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(
      "id, status, current_stage, canvas_type, title, domain, created_at, updated_at, profiles(email, full_name)"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Sessions</h1>
        <p className="text-sm text-slate-500">
          Read-only — every founder&apos;s session, across every account.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load sessions: {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Founder</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Canvas</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead className="text-right">Blueprint</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-slate-400"
                >
                  No sessions yet.
                </TableCell>
              </TableRow>
            )}
            {sessions?.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="text-sm text-slate-700">
                  {session.profiles?.full_name || session.profiles?.email || "—"}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-sm font-medium text-slate-900">
                  {session.title || session.domain || "Untitled blueprint"}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {session.canvas_type === "lean"
                    ? "Lean"
                    : session.canvas_type === "bmc"
                      ? "BMC"
                      : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">
                  {session.current_stage}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`rounded-sm font-medium ${
                      STATUS_VARIANT[session.status] ?? STATUS_VARIANT.abandoned
                    }`}
                  >
                    {session.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {new Date(session.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  {session.status === "complete" ? (
                    <Link
                      href={`/admin/sessions/${session.id}/blueprint`}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      View →
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-300">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
