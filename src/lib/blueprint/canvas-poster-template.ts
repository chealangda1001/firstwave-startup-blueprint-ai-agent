import "server-only";
import type { LeanCanvasFields, BmcFields } from "@/types/blueprint";

export interface CanvasPosterInput {
  appName: string;
  productName: string;
  canvasType: "lean" | "bmc";
  fields: Record<string, string>;
}

function escapeHtml(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Grid areas mirror the standard printed Lean Canvas / Business Model
// Canvas layout (see docs reference screenshot) — this is deliberately a
// *different* grid from the compact one embedded in the full report PDF
// (pdf-template.ts): this one is tuned to fill a whole landscape page as a
// wall-poster, not to sit inside a multi-section document.
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

/**
 * Renders the founder's canvas as a single landscape wall-poster page —
 * "print this and pin it above your desk" per the request — as opposed to
 * renderBlueprintHtml's compact canvas grid buried inside section 3 of the
 * full multi-page report. Same self-contained-HTML-string approach for the
 * same reason (Puppeteer loads it directly, no app shell).
 */
export function renderCanvasPosterHtml({
  appName,
  productName,
  canvasType,
  fields,
}: CanvasPosterInput): string {
  const layout = canvasType === "lean" ? LEAN_LAYOUT : BMC_LAYOUT;
  const canvasName = canvasType === "lean" ? "Lean Canvas" : "Business Model Canvas";

  const cells = layout
    .map(
      ({ key, label, area }) => `
      <div class="cell cell-${area}">
        <p class="cell-label">${escapeHtml(label)}</p>
        <p class="cell-body">${escapeHtml(fields?.[key] || "—")}</p>
      </div>
    `
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(productName)} — ${escapeHtml(canvasName)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #18181b;
    margin: 0;
    height: 190mm;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-bottom: 6mm;
    margin-bottom: 4mm;
    border-bottom: 2px solid #18181b;
  }
  .product-name { font-size: 20pt; font-weight: 800; margin: 0; letter-spacing: -0.01em; }
  .canvas-name {
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #f97316;
    margin: 0;
  }
  .app-name { font-size: 8.5pt; color: #a1a1aa; margin: 0; }

  .grid {
    flex: 1;
    display: grid;
    gap: 3mm;
    min-height: 0;
  }
  .grid-lean {
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(2, 1fr) auto;
    grid-template-areas:
      "problem uvp uvp advantage segments"
      "solution uvp uvp channels segments"
      "cost cost metrics revenue revenue";
  }
  .grid-bmc {
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(2, 1fr) auto;
    grid-template-areas:
      "partners activities uvp relationships segments"
      "partners resources uvp channels segments"
      "cost cost cost revenue revenue";
  }

  .cell {
    border: 1.5px solid #27272a;
    border-radius: 3mm;
    padding: 3mm;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .cell-problem { grid-area: problem; }
  .cell-solution { grid-area: solution; }
  .cell-metrics { grid-area: metrics; background: #fff7ed; }
  .cell-uvp { grid-area: uvp; background: #fafafa; }
  .cell-advantage { grid-area: advantage; }
  .cell-channels { grid-area: channels; }
  .cell-segments { grid-area: segments; }
  .cell-cost { grid-area: cost; background: #fff7ed; }
  .cell-revenue { grid-area: revenue; background: #fff7ed; }
  .cell-partners { grid-area: partners; }
  .cell-activities { grid-area: activities; }
  .cell-resources { grid-area: resources; }
  .cell-relationships { grid-area: relationships; }

  .cell-label {
    font-size: 8.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #6d28d9;
    margin: 0 0 2mm;
    flex-shrink: 0;
  }
  .cell-body {
    font-size: 8.5pt;
    line-height: 1.35;
    margin: 0;
    white-space: pre-wrap;
    overflow: hidden;
  }

  footer {
    margin-top: 4mm;
    text-align: right;
    font-size: 7.5pt;
    color: #a1a1aa;
  }
</style>
</head>
<body>
  <header>
    <div>
      <p class="canvas-name">${escapeHtml(canvasName)}</p>
      <h1 class="product-name">${escapeHtml(productName)}</h1>
    </div>
    <p class="app-name">Generated by ${escapeHtml(appName)}</p>
  </header>

  <div class="grid ${canvasType === "lean" ? "grid-lean" : "grid-bmc"}">
    ${cells}
  </div>

  <footer>${escapeHtml(appName)}</footer>
</body>
</html>`;
}
