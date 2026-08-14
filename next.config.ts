import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ships a binary asset (node_modules/@sparticuz/chromium/bin)
  // that PDF generation (src/lib/blueprint/generate-pdf.ts) resolves by
  // relative path at runtime. Two separate things need to know about it:
  // serverExternalPackages keeps the package untouched in node_modules
  // instead of relocating it into Next's own chunk graph, but Vercel's
  // *output file tracing* is a separate step that decides which files
  // actually ship in the deployed function — chromium.executablePath()
  // reads the bin/ folder dynamically (fs calls, not a static import), so
  // the tracer can't discover it on its own and silently leaves it out
  // without this explicit include.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
