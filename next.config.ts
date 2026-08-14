import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ships a binary asset (node_modules/@sparticuz/chromium/bin)
  // that PDF generation (src/lib/blueprint/generate-pdf.ts) resolves by
  // relative path at runtime. Without this, Next's server bundler relocates
  // the package into its own chunk graph and that path stops existing in
  // the deployed function, throwing "input directory ... does not exist" —
  // this keeps it (and puppeteer-core) untouched in node_modules instead.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
