import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.1] dark:bg-zinc-950">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        {children}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p>
      <span className="font-medium text-zinc-950 dark:text-zinc-50">
        {label}:
      </span>{" "}
      {value}
    </p>
  );
}

function List({ label, items }: { label: string; items?: string[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-zinc-950 dark:text-zinc-50">{label}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
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
    <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <p className="font-medium">Gaps flagged</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {gaps.map((gap, i) => (
          <li key={i}>{gap}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function BlueprintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, domain, status")
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
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No blueprint has been generated for this session yet.
        </p>
        <Link
          href={`/sessions/${id}`}
          className="text-sm underline underline-offset-2"
        >
          ← Back to the conversation
        </Link>
      </div>
    );
  }

  // section_* columns are jsonb — shaped by the model's structured output,
  // loosely typed here on purpose (defensive rendering, not a hard contract).
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href={`/sessions/${id}`}
          className="text-xs text-zinc-500 underline underline-offset-2 dark:text-zinc-500"
        >
          ← Back to the conversation
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          {session.title || session.domain || "Product Blueprint"}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Canvas: {blueprint.canvas_type === "lean" ? "Lean Canvas" : "Business Model Canvas"}
        </p>
      </div>

      <Section title="1. Problem">
        <Field label="Who has this problem" value={s1?.existence} />
        <Field label="Frequency & cost" value={s1?.frequency_and_cost} />
        <Field label="Current workaround" value={s1?.current_solution} />
        <Field label="Why now" value={s1?.why_now} />
        <Gaps gaps={blueprint.section_1_gaps} />
      </Section>

      <Section title="2. Target Users">
        <Field label="Primary user" value={s2?.primary_user} />
        <Field label="Decision maker" value={s2?.decision_maker} />
        <Field label="Tech sophistication" value={s2?.tech_sophistication} />
        <Field label="Real motivation" value={s2?.real_motivation} />
        <Gaps gaps={blueprint.section_2_gaps} />
      </Section>

      <Section title="3. Canvas">
        {Object.entries(canvasFields ?? {}).map(([key, value]) => (
          <Field
            key={key}
            label={key.replace(/_/g, " ")}
            value={value as string}
          />
        ))}
        <Gaps gaps={blueprint.section_3_gaps} />
      </Section>

      <Section title="4. MVP Scope">
        <List label="In scope" items={s4?.in_scope} />
        <List label="Out of scope" items={s4?.out_of_scope} />
      </Section>

      <Section title="5. Success Metrics (90 days)">
        <Field label="Product" value={s5?.product} />
        <Field label="Marketing" value={s5?.marketing} />
        <Field label="Finance" value={s5?.finance} />
      </Section>

      <Section title="6. Risks & Assumptions">
        {s6?.map((risk, i) => (
          <div
            key={i}
            className="rounded-lg border border-black/[.08] p-3 dark:border-white/[.1]"
          >
            <p className="font-medium">{risk.assumption}</p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              If wrong: {risk.risk_if_wrong}
            </p>
            <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {risk.danger_level} danger
            </span>
          </div>
        ))}
      </Section>

      <Section title="7. Roadmap">
        {s7 &&
          (["phase_1", "phase_2", "phase_3"] as const).map((key) => {
            const phase = s7[key];
            if (!phase) return null;
            return (
              <div key={key} className="mb-2">
                <p className="font-medium text-zinc-950 dark:text-zinc-50">
                  {key.replace("_", " ")} — {phase.timing}
                </p>
                <p>{phase.goal}</p>
                <List label="Scope" items={phase.scope} />
              </div>
            );
          })}
      </Section>

      <Section title="8. Open Questions">
        <List label="" items={s8} />
      </Section>

      <Section title="9. Founder / Team Market Fit">
        <p>{s9?.narrative}</p>
      </Section>
    </div>
  );
}
