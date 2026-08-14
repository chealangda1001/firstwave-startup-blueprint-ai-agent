"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { getBlueprintPdfUrl } from "./actions";

/**
 * The first click renders the PDF server-side (Puppeteer — a few seconds);
 * every click after that reuses the cached one and is near-instant (see
 * getBlueprintPdfUrl). Opens in a new tab rather than a same-tab
 * navigation so the founder never loses their place in the app.
 *
 * `kind` picks which PDF variant: the full written report, or the
 * one-page printable canvas poster (Lean Canvas / BMC) meant to be pinned
 * on a wall.
 */
const DEFAULT_CLASSNAME =
  "rounded-full bg-zinc-950 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200";

export function DownloadPdfButton({
  sessionId,
  kind = "report",
  label,
  pendingLabel,
  className,
}: {
  sessionId: string;
  kind?: "report" | "canvas_poster";
  label?: string;
  pendingLabel?: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    // Open the tab synchronously, in direct response to the click — a
    // browser's popup blocker allows that, but not a window.open() called
    // later from inside the async action below, once the click is no
    // longer "live". Navigate that already-open tab once the real URL
    // (PDF generation can take several seconds) comes back.
    const pdfTab = window.open("about:blank", "_blank", "noopener,noreferrer");
    if (pdfTab) {
      pdfTab.document.write(
        "<title>Preparing your PDF…</title><body style='font-family:sans-serif;color:#71717a;display:flex;height:100vh;align-items:center;justify-content:center'>Preparing your PDF…</body>"
      );
    }

    startTransition(async () => {
      try {
        const url = await getBlueprintPdfUrl(sessionId, kind);
        if (pdfTab) {
          pdfTab.location.href = url;
        } else {
          // Popup was blocked despite the synchronous open (some browsers
          // still block it, or the user has a stricter setting) — fall
          // back to a same-tab navigation rather than silently failing.
          window.location.href = url;
        }
      } catch (err) {
        pdfTab?.close();
        toast.error(
          err instanceof Error ? err.message : "Could not generate the PDF."
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={className ?? DEFAULT_CLASSNAME}
    >
      {isPending ? pendingLabel ?? "Preparing PDF…" : label ?? "Download PDF"}
    </button>
  );
}
