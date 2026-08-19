"use client";

/**
 * A plain window.print() trigger — this is the entire "export" mechanism
 * for the canvas poster now (see page.tsx). No server round trip, no
 * Puppeteer: the browser's own print dialog handles paper size, margins,
 * and "Save as PDF" vs. an actual printer, all things a founder printing
 * this to pin on a wall is better placed to choose than we are.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
