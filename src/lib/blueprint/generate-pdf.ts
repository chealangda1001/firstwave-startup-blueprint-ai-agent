import "server-only";
import { existsSync } from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";

// Common local Chrome/Chromium install locations, checked in order — only
// consulted outside Vercel (see launchBrowser). Override with
// PUPPETEER_EXECUTABLE_PATH if a developer's Chrome lives somewhere else.
const LOCAL_CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

function findLocalChrome(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const found = LOCAL_CHROME_CANDIDATES.find(existsSync);
  if (!found) {
    throw new Error(
      "No local Chrome found for PDF generation. Install Google Chrome, " +
        "or set PUPPETEER_EXECUTABLE_PATH to a Chromium binary."
    );
  }
  return found;
}

/**
 * Deliberately puppeteer-core everywhere, never the full `puppeteer`
 * package — puppeteer-core ships no browser of its own, so it stays tiny
 * and Next.js's serverless bundle tracing never has a ~300MB Chromium
 * download to sweep in, even as dead code. On Vercel (VERCEL is set in
 * every one of its runtimes), @sparticuz/chromium supplies a binary built
 * for that specific serverless environment; locally, this points at
 * whatever Chrome is already installed on the developer's machine.
 */
async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  return puppeteer.launch({
    executablePath: findLocalChrome(),
    headless: true,
  });
}

/**
 * Renders a self-contained HTML string (see pdf-template.ts) to a PDF
 * buffer. No navigation, no external resources — setContent + waitUntil is
 * enough since the HTML has no images/fonts to fetch.
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // "load" is enough — this HTML is fully self-contained (inline CSS, no
    // external images/fonts/scripts to wait on).
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
