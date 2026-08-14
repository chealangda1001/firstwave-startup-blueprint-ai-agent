import "server-only";
import type { Database } from "@/types/database.types";
import type {
  LeanCanvasFields,
  BmcFields,
  Section6Risk,
  RoadmapPhase,
} from "@/types/blueprint";

type BlueprintRow = Database["public"]["Tables"]["blueprints"]["Row"];

export interface PdfTemplateInput {
  appName: string;
  productName: string;
  founderName: string;
  generatedOn: string;
  blueprint: BlueprintRow;
}

function escapeHtml(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function field(label: string, value?: string | null) {
  if (!value) return "";
  return `<p class="field"><span class="field-label">${escapeHtml(label)}:</span> ${escapeHtml(value)}</p>`;
}

function list(label: string, items?: string[] | null) {
  if (!items || items.length === 0) return "";
  return `
    <div class="field">
      ${label ? `<p class="field-label">${escapeHtml(label)}</p>` : ""}
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function gaps(items?: string[] | null) {
  if (!items || items.length === 0) return "";
  return `
    <div class="gaps">
      <p class="gaps-label">Gaps flagged</p>
      <ul>${items.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul>
    </div>
  `;
}

const LEAN_CANVAS_LAYOUT: Array<{ key: keyof LeanCanvasFields; label: string; area: string }> = [
  { key: "problem", label: "Problem", area: "problem" },
  { key: "solution", label: "Solution", area: "solution" },
  { key: "unique_value_proposition", label: "Unique Value Proposition", area: "uvp" },
  { key: "unfair_advantage", label: "Unfair Advantage", area: "advantage" },
  { key: "customer_segments", label: "Customer Segments", area: "segments" },
  { key: "key_metrics", label: "Key Metrics", area: "metrics" },
  { key: "channels", label: "Channels", area: "channels" },
  { key: "cost_structure", label: "Cost Structure", area: "cost" },
  { key: "revenue_streams", label: "Revenue Streams", area: "revenue" },
];

const BMC_LAYOUT: Array<{ key: keyof BmcFields; label: string; area: string }> = [
  { key: "key_partners", label: "Key Partners", area: "partners" },
  { key: "key_activities", label: "Key Activities", area: "activities" },
  { key: "value_propositions", label: "Value Propositions", area: "uvp" },
  { key: "customer_relationships", label: "Customer Relationships", area: "relationships" },
  { key: "customer_segments", label: "Customer Segments", area: "segments" },
  { key: "key_resources", label: "Key Resources", area: "resources" },
  { key: "channels", label: "Channels", area: "channels" },
  { key: "cost_structure", label: "Cost Structure", area: "cost" },
  { key: "revenue_streams", label: "Revenue Streams", area: "revenue" },
];

function canvasGrid(
  type: "lean" | "bmc",
  fields: Record<string, string> | undefined
) {
  const layout = type === "lean" ? LEAN_CANVAS_LAYOUT : BMC_LAYOUT;
  const cells = layout
    .map(
      ({ key, label, area }) => `
      <div class="canvas-cell canvas-${area}">
        <p class="canvas-cell-label">${escapeHtml(label)}</p>
        <p class="canvas-cell-body">${escapeHtml(fields?.[key] ?? "—")}</p>
      </div>
    `
    )
    .join("");

  const gridClass = type === "lean" ? "canvas-grid-lean" : "canvas-grid-bmc";
  return `<div class="canvas-grid ${gridClass}">${cells}</div>`;
}

/**
 * Builds the full standalone HTML document Puppeteer renders to PDF. Not a
 * React component — this needs to be one self-contained string with inline
 * CSS, since Puppeteer just loads it as a page, with no app shell, no
 * Tailwind build step, no client JS.
 */
export function renderBlueprintHtml({
  appName,
  productName,
  founderName,
  generatedOn,
  blueprint,
}: PdfTemplateInput): string {
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
  const s6 = (blueprint.section_6_risks as unknown as Section6Risk[]) ?? [];
  const s7 = blueprint.section_7_roadmap as unknown as Record<
    string,
    RoadmapPhase
  >;
  const s8 = (blueprint.section_8_open_questions as unknown as string[]) ?? [];
  const s9 = blueprint.section_9_founder_market_fit as { narrative: string };

  const canvasType = s3?.type ?? blueprint.canvas_type;
  const canvasFields = (s3?.fields?.[canvasType] ?? {}) as Record<string, string>;
  const canvasName = canvasType === "lean" ? "Lean Canvas" : "Business Model Canvas";

  const risksHtml = s6
    .map(
      (risk) => `
      <div class="risk-card">
        <p class="risk-assumption">${escapeHtml(risk.assumption)}</p>
        <p class="risk-detail">If wrong: ${escapeHtml(risk.risk_if_wrong)}</p>
        <span class="risk-badge risk-${escapeHtml(risk.danger_level)}">${escapeHtml(risk.danger_level)} danger</span>
      </div>
    `
    )
    .join("");

  const roadmapHtml = (["phase_1", "phase_2", "phase_3"] as const)
    .map((key) => {
      const phase = s7?.[key];
      if (!phase) return "";
      return `
        <div class="roadmap-phase">
          <p class="roadmap-phase-title">${escapeHtml(key.replace("_", " "))} — ${escapeHtml(phase.timing)}</p>
          <p>${escapeHtml(phase.goal)}</p>
          ${list("Scope", phase.scope)}
        </div>
      `;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(productName)} — Product Blueprint</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #18181b;
    font-size: 11pt;
    line-height: 1.55;
    margin: 0;
  }
  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    page-break-after: always;
  }
  .cover-eyebrow {
    font-size: 10pt;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #71717a;
    margin: 0 0 24px;
  }
  .cover-title { font-size: 30pt; font-weight: 700; margin: 0 0 16px; line-height: 1.15; }
  .cover-canvas { font-size: 13pt; color: #3f3f46; margin: 0 0 48px; }
  .cover-meta { font-size: 10pt; color: #71717a; }
  .cover-meta p { margin: 2px 0; }

  section { page-break-inside: avoid; margin-bottom: 22px; }
  h2 {
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #71717a;
    border-bottom: 1px solid #e4e4e7;
    padding-bottom: 6px;
    margin: 0 0 12px;
  }
  .field { margin: 0 0 8px; }
  .field-label { font-weight: 600; color: #18181b; }
  ul { margin: 4px 0; padding-left: 18px; }
  li { margin-bottom: 3px; }

  .gaps {
    margin-top: 8px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 9.5pt;
  }
  .gaps-label { font-weight: 600; color: #92400e; margin: 0 0 4px; }
  .gaps ul { color: #92400e; }

  .canvas-grid {
    display: grid;
    gap: 6px;
    page-break-inside: avoid;
  }
  .canvas-grid-lean {
    grid-template-columns: repeat(5, 1fr);
    grid-template-areas:
      "problem uvp uvp advantage segments"
      "problem solution solution advantage segments"
      "metrics metrics channels channels segments"
      "cost cost cost revenue revenue";
  }
  .canvas-grid-bmc {
    grid-template-columns: repeat(5, 1fr);
    grid-template-areas:
      "partners activities uvp relationships segments"
      "partners resources uvp channels segments"
      "cost cost cost revenue revenue";
  }
  .canvas-cell {
    border: 1px solid #e4e4e7;
    border-radius: 4px;
    padding: 8px;
    min-height: 60px;
  }
  .canvas-problem { grid-area: problem; }
  .canvas-solution { grid-area: solution; }
  .canvas-uvp { grid-area: uvp; }
  .canvas-advantage { grid-area: advantage; }
  .canvas-segments { grid-area: segments; }
  .canvas-metrics { grid-area: metrics; }
  .canvas-channels { grid-area: channels; }
  .canvas-cost { grid-area: cost; }
  .canvas-revenue { grid-area: revenue; }
  .canvas-partners { grid-area: partners; }
  .canvas-activities { grid-area: activities; }
  .canvas-relationships { grid-area: relationships; }
  .canvas-resources { grid-area: resources; }
  .canvas-cell-label {
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #71717a;
    margin: 0 0 3px;
  }
  .canvas-cell-body { font-size: 8.5pt; margin: 0; white-space: pre-wrap; }

  .risk-card {
    border: 1px solid #e4e4e7;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 8px;
  }
  .risk-assumption { font-weight: 600; margin: 0 0 4px; }
  .risk-detail { color: #52525b; margin: 0 0 6px; }
  .risk-badge {
    display: inline-block;
    font-size: 8.5pt;
    font-weight: 600;
    text-transform: capitalize;
    padding: 2px 8px;
    border-radius: 999px;
    background: #f4f4f5;
    color: #3f3f46;
  }
  .risk-high { background: #fee2e2; color: #991b1b; }
  .risk-medium { background: #fef3c7; color: #92400e; }
  .risk-low { background: #dcfce7; color: #166534; }

  .roadmap-phase { margin-bottom: 12px; }
  .roadmap-phase-title { font-weight: 600; text-transform: capitalize; margin: 0 0 2px; }

  footer {
    position: fixed;
    bottom: -12mm;
    left: 0;
    right: 0;
    font-size: 8pt;
    color: #a1a1aa;
    text-align: center;
  }
</style>
</head>
<body>

  <div class="cover">
    <p class="cover-eyebrow">${escapeHtml(appName)} — Product Blueprint</p>
    <h1 class="cover-title">${escapeHtml(productName)}</h1>
    <p class="cover-canvas">${escapeHtml(canvasName)}</p>
    <div class="cover-meta">
      <p>Prepared for ${escapeHtml(founderName)}</p>
      <p>${escapeHtml(generatedOn)}</p>
    </div>
  </div>

  <section>
    <h2>1. Problem</h2>
    ${field("Who has this problem", s1?.existence)}
    ${field("Frequency & cost", s1?.frequency_and_cost)}
    ${field("Current workaround", s1?.current_solution)}
    ${field("Why now", s1?.why_now)}
    ${gaps(blueprint.section_1_gaps)}
  </section>

  <section>
    <h2>2. Target Users</h2>
    ${field("Primary user", s2?.primary_user)}
    ${field("Decision maker", s2?.decision_maker)}
    ${field("Tech sophistication", s2?.tech_sophistication)}
    ${field("Real motivation", s2?.real_motivation)}
    ${gaps(blueprint.section_2_gaps)}
  </section>

  <section>
    <h2>3. ${escapeHtml(canvasName)}</h2>
    ${canvasGrid(canvasType, canvasFields)}
    ${gaps(blueprint.section_3_gaps)}
  </section>

  <section>
    <h2>4. MVP Scope</h2>
    ${list("In scope", s4?.in_scope)}
    ${list("Out of scope", s4?.out_of_scope)}
  </section>

  <section>
    <h2>5. Success Metrics (90 days)</h2>
    ${field("Product", s5?.product)}
    ${field("Marketing", s5?.marketing)}
    ${field("Finance", s5?.finance)}
  </section>

  <section>
    <h2>6. Risks &amp; Assumptions</h2>
    ${risksHtml}
  </section>

  <section>
    <h2>7. Roadmap</h2>
    ${roadmapHtml}
  </section>

  <section>
    <h2>8. Open Questions</h2>
    ${list("", s8)}
  </section>

  <section>
    <h2>9. Founder / Team Market Fit</h2>
    <p>${escapeHtml(s9?.narrative)}</p>
  </section>

</body>
</html>`;
}
