import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/site-settings";
import { PrintButton } from "./print-button";
import type { LeanCanvasFields, BmcFields } from "@/types/blueprint";

// Mirrors the standard printed Lean Canvas / Business Model Canvas layout
// (see docs reference) — same grid this project's canvas poster PDF used
// to render via Puppeteer. Now it's just this page, printed straight from
// the browser: the poster's data is a plain DB read with no fresh LLM call
// at render time, so Puppeteer never bought anything here but the exact
// class of production fragility this project kept tripping over
// (@sparticuz/chromium binary tracing, Vercel function timeouts, ...).
const LEAN_LAYOUT: Array<{ key: keyof LeanCanvasFields; label: string; area: string }> = [
  { key: "problem", label: "Problem", area: "problem" },
  { key: "solution", label: "Solution", area: "solution" },
  { key: "key_metrics", label: "Key Metrics", area: "metrics" },
  { key: "unique_value_proposition", label: "Unique Value Proposition", area: "uvp" },
  { key: "unfair_advantage", label: "Unfair Advantage", area: "advantage" },
  { key: "channels", label: "Channels", area: "channels" },
  { key: "customer_segments", label: "Customer Segments", area: "segments" },
  { key: "cost_structure", label: "Cost Structure", area: "cost" },
  { key: "revenue_streams", label: "Revenue Streams", area: "revenue" },
];

const BMC_LAYOUT: Array<{ key: keyof BmcFields; label: string; area: string }> = [
  { key: "key_partners", label: "Key Partners", area: "partners" },
  { key: "key_activities", label: "Key Activities", area: "activities" },
  { key: "key_resources", label: "Key Resources", area: "resources" },
  { key: "value_propositions", label: "Value Propositions", area: "uvp" },
  { key: "customer_relationships", label: "Customer Relationships", area: "relationships" },
  { key: "customer_segments", label: "Customer Segments", area: "segments" },
  { key: "channels", label: "Channels", area: "channels" },
  { key: "cost_structure", label: "Cost Structure", area: "cost" },
  { key: "revenue_streams", label: "Revenue Streams", area: "revenue" },
];

export default async function CanvasPosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, domain")
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: blueprint } = await supabase
    .from("blueprints")
    .select("canvas_type, section_3_canvas")
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

  const { app_name } = await getSiteSettings();

  const s3 = blueprint.section_3_canvas as {
    type: "lean" | "bmc";
    fields: Record<string, Record<string, string> | null>;
  };
  const canvasType = s3?.type ?? blueprint.canvas_type ?? "lean";
  const fields = (s3?.fields?.[canvasType] ?? {}) as Record<string, string>;
  const canvasName = canvasType === "lean" ? "Lean Canvas" : "Business Model Canvas";
  const productName = session.title || session.domain || "Product Blueprint";
  const layout = canvasType === "lean" ? LEAN_LAYOUT : BMC_LAYOUT;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-8 print:max-w-none print:gap-0 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/sessions/${id}/blueprint`}
          className="text-xs text-zinc-500 underline underline-offset-2 dark:text-zinc-500"
        >
          ← Back to the blueprint
        </Link>
        <PrintButton />
      </div>

      {/* The printable poster itself — everything inside here is what
          ends up on paper. Landscape A4, laid out with @page below so it
          fills a single sheet regardless of on-screen viewport width. */}
      <div className="canvas-poster rounded-2xl border border-black/[.08] bg-white p-8 dark:border-white/[.1] dark:bg-zinc-950 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black">
        <header className="mb-4 flex items-baseline justify-between border-b-2 border-zinc-950 pb-3 dark:border-zinc-50 print:border-black">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
              {canvasName}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 print:text-black">
              {productName}
            </h1>
          </div>
          <p className="text-xs text-zinc-400">Generated by {app_name}</p>
        </header>

        <div
          className={`canvas-grid grid gap-2 ${
            canvasType === "lean" ? "canvas-grid-lean" : "canvas-grid-bmc"
          }`}
        >
          {layout.map(({ key, label, area }) => (
            <div
              key={area}
              className={`canvas-cell canvas-${area} flex min-h-[110px] flex-col rounded-md border border-zinc-300 p-3 dark:border-zinc-700 print:border-zinc-400`}
            >
              <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-violet-700 dark:text-violet-400 print:text-black">
                {label}
              </p>
              <p className="whitespace-pre-wrap text-xs leading-snug text-zinc-800 dark:text-zinc-200 print:text-black">
                {fields?.[key] || "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Plain <style> tag, not Tailwind, for the two things Tailwind's
          utility classes can't express: named grid-template-areas, and
          the @page print rule (paper size/orientation/margins are a print
          document property, not an element style). */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
        }
        .canvas-grid-lean {
          grid-template-columns: repeat(5, 1fr);
          grid-template-rows: repeat(2, 1fr) auto;
          grid-template-areas:
            "problem uvp uvp advantage segments"
            "solution uvp uvp channels segments"
            "cost cost metrics revenue revenue";
        }
        .canvas-grid-bmc {
          grid-template-columns: repeat(5, 1fr);
          grid-template-rows: repeat(2, 1fr) auto;
          grid-template-areas:
            "partners activities uvp relationships segments"
            "partners resources uvp channels segments"
            "cost cost cost revenue revenue";
        }
        .canvas-problem { grid-area: problem; }
        .canvas-solution { grid-area: solution; }
        .canvas-metrics { grid-area: metrics; }
        .canvas-uvp { grid-area: uvp; }
        .canvas-advantage { grid-area: advantage; }
        .canvas-channels { grid-area: channels; }
        .canvas-segments { grid-area: segments; }
        .canvas-cost { grid-area: cost; }
        .canvas-revenue { grid-area: revenue; }
        .canvas-partners { grid-area: partners; }
        .canvas-activities { grid-area: activities; }
        .canvas-resources { grid-area: resources; }
        .canvas-relationships { grid-area: relationships; }
      `}</style>
    </div>
  );
}
