import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadPdfButton } from "@/app/(app)/sessions/[id]/blueprint/download-pdf-button";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p className="text-sm text-slate-700">
      <span className="font-medium text-slate-900">{label}:</span> {value}
    </p>
  );
}

function List({ label, items }: { label: string; items?: string[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Gaps({ gaps }: { gaps?: string[] | null }) {
  if (!gaps || gaps.length === 0) return null;
  return (
    <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <p className="font-medium">Gaps flagged</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {gaps.map((gap, i) => (
          <li key={i}>{gap}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function AdminBlueprintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, domain, status, profiles(email, full_name)")
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: blueprint } = await supabase
    .from("blueprints")
    .select("*")
    .eq("session_id", id)
    .single();

  if (!blueprint) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/sessions"
          className="text-xs text-slate-500 hover:underline"
        >
          ← Back to sessions
        </Link>
        <p className="text-sm text-slate-500">
          No blueprint artifact found for this session.
        </p>
      </div>
    );
  }

  const s1 = blueprint.section_1_problem as Record<string, string>;
  const s2 = blueprint.section_2_users as Record<string, string>;
  const s3 = blueprint.section_3_canvas as {
    type: "lean" | "bmc";
    fields: Record<string, Record<string, string> | null>;
  };
  const s4 = blueprint.section_4_mvp_scope as {
    in_scope: string[];
    out_of_scope: string[];
  };
  const s5 = blueprint.section_5_success_metrics as Record<string, string>;
  const s6 = blueprint.section_6_risks as Array<{
    assumption: string;
    risk_if_wrong: string;
    danger_level: string;
  }>;
  const s7 = blueprint.section_7_roadmap as Record<
    string,
    { goal: string; timing: string; scope: string[] }
  >;
  const s8 = blueprint.section_8_open_questions as string[];
  const s9 = blueprint.section_9_founder_market_fit as { narrative: string };
  const canvasFields = s3?.fields?.lean ?? s3?.fields?.bmc ?? {};

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/sessions"
            className="text-xs text-slate-500 hover:underline"
          >
            ← Back to sessions
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">
              {session.title || session.domain || "Untitled blueprint"}
            </h1>
            <Badge className="rounded-sm bg-slate-200 text-slate-700 hover:bg-slate-200">
              {blueprint.canvas_type === "lean" ? "Lean Canvas" : "BMC"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            {session.profiles?.full_name || session.profiles?.email}
          </p>
        </div>
        <DownloadPdfButton
          sessionId={id}
          className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
            1. Problem
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Field label="Who has this problem" value={s1?.existence} />
          <Field label="Frequency & cost" value={s1?.frequency_and_cost} />
          <Field label="Current workaround" value={s1?.current_solution} />
          <Field label="Why now" value={s1?.why_now} />
          <Gaps gaps={blueprint.section_1_gaps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
            2. Target Users
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Field label="Primary user" value={s2?.primary_user} />
          <Field label="Decision maker" value={s2?.decision_maker} />
          <Field label="Tech sophistication" value={s2?.tech_sophistication} />
          <Field label="Real motivation" value={s2?.real_motivation} />
          <Gaps gaps={blueprint.section_2_gaps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
            3. Canvas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {Object.entries(canvasFields ?? {}).map(([key, value]) => (
            <Field
              key={key}
              label={key.replace(/_/g, " ")}
              value={value as string}
            />
          ))}
          <Gaps gaps={blueprint.section_3_gaps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
            4. MVP Scope
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <List label="In scope" items={s4?.in_scope} />
          <List label="Out of scope" items={s4?.out_of_scope} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
            5. Success Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Field label="Product" value={s5?.product} />
          <Field label="Marketing" value={s5?.marketing} />
          <Field label="Finance" value={s5?.finance} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
            6. Risks & Assumptions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {s6?.map((risk, i) => (
            <div key={i} className="rounded-md border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-900">
                {risk.assumption}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                If wrong: {risk.risk_if_wrong}
              </p>
              <Badge className="mt-1 rounded-sm bg-slate-100 text-slate-700 hover:bg-slate-100">
                {risk.danger_level} danger
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
            7. Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {s7 &&
            (["phase_1", "phase_2", "phase_3"] as const).map((key) => {
              const phase = s7[key];
              if (!phase) return null;
              return (
                <div key={key}>
                  <p className="text-sm font-medium text-slate-900">
                    {key.replace("_", " ")} — {phase.timing}
                  </p>
                  <p className="text-sm text-slate-600">{phase.goal}</p>
                  <List label="Scope" items={phase.scope} />
                </div>
              );
            })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
            8. Open Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <List label="" items={s8} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-slate-500">
            9. Founder / Team Market Fit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700">{s9?.narrative}</p>
        </CardContent>
      </Card>
    </div>
  );
}
