"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteSettings } from "@/lib/site-settings";
import { renderBlueprintHtml } from "@/lib/blueprint/pdf-template";
import { renderCanvasPosterHtml } from "@/lib/blueprint/canvas-poster-template";
import { renderHtmlToPdf } from "@/lib/blueprint/generate-pdf";
import type { Database } from "@/types/database.types";

type PdfKind = "report" | "canvas_poster";

type BlueprintRow = Database["public"]["Tables"]["blueprints"]["Row"];

// Long enough to comfortably cover the click-to-download round trip, short
// enough that a leaked link stops working on its own — these PDFs live in
// a private bucket specifically so nothing is reachable without one.
const SIGNED_URL_TTL_SECONDS = 60 * 10;

interface SessionInfo {
  id: string;
  founder_id: string;
  title: string | null;
  domain: string | null;
}

/**
 * Real enforcement for both exports below: a founder may only touch their
 * own session, an admin may touch any (oversight, read-only in spirit —
 * generating a PDF doesn't mutate the founder's data). Everything after
 * this uses the service-role client, so this check is the only gate.
 */
async function assertCanAccessSession(sessionId: string): Promise<SessionInfo> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, founder_id, title, domain")
    .eq("id", sessionId)
    .single();

  if (!session) {
    throw new Error("Session not found.");
  }

  if (session.founder_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      throw new Error("You don't have access to this session.");
    }
  }

  return session;
}

async function generateAndStorePdf(
  session: SessionInfo,
  blueprint: BlueprintRow,
  kind: PdfKind
): Promise<string> {
  const admin = createAdminClient();
  const { app_name } = await getSiteSettings();
  const productName = session.title || session.domain || "Product Blueprint";

  let html: string;
  let landscape: boolean;

  if (kind === "canvas_poster") {
    const s3 = blueprint.section_3_canvas as {
      type: "lean" | "bmc";
      fields: Record<string, Record<string, string> | null>;
    };
    const canvasType = s3?.type ?? blueprint.canvas_type ?? "lean";
    const fields = (s3?.fields?.[canvasType] ?? {}) as Record<string, string>;

    html = renderCanvasPosterHtml({
      appName: app_name,
      productName,
      canvasType,
      fields,
    });
    landscape = true;
  } else {
    const { data: founderProfile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", session.founder_id)
      .single();

    html = renderBlueprintHtml({
      appName: app_name,
      productName,
      founderName: founderProfile?.full_name || founderProfile?.email || "Founder",
      generatedOn: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      blueprint,
    });
    landscape = false;
  }

  const pdfBuffer = await renderHtmlToPdf(html, { landscape });

  const storagePath = `${session.founder_id}/${session.id}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("blueprint-pdfs")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: insertError } = await admin.from("blueprint_pdfs").insert({
    blueprint_id: blueprint.id,
    storage_path: storagePath,
    kind,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return storagePath;
}

async function signPdfUrl(storagePath: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("blueprint-pdfs")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create a download link.");
  }

  return data.signedUrl;
}

async function loadBlueprint(sessionId: string): Promise<BlueprintRow> {
  const admin = createAdminClient();
  const { data: blueprint } = await admin
    .from("blueprints")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (!blueprint) {
    throw new Error("No blueprint has been generated for this session yet.");
  }

  return blueprint;
}

/**
 * The PDF a founder gets on a normal "Download" click — reuses the most
 * recently generated PDF of this `kind` for this blueprint if it exists
 * (the underlying blueprint content is static once the interview ends, so
 * regenerating on every click would just be a slow no-op) and only renders
 * a fresh one the first time. `kind` defaults to the full written report;
 * pass "canvas_poster" for the printable one-page Lean Canvas / BMC.
 */
export async function getBlueprintPdfUrl(
  sessionId: string,
  kind: PdfKind = "report"
): Promise<string> {
  const session = await assertCanAccessSession(sessionId);
  const admin = createAdminClient();
  const blueprint = await loadBlueprint(sessionId);

  const { data: existing } = await admin
    .from("blueprint_pdfs")
    .select("storage_path")
    .eq("blueprint_id", blueprint.id)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const storagePath =
    existing?.storage_path ??
    (await generateAndStorePdf(session, blueprint, kind));

  return signPdfUrl(storagePath);
}

/**
 * Forces a brand-new PDF of this `kind` (new row, new storage object — old
 * ones are never overwritten, per docs/ROADMAP.md) instead of reusing the
 * cached one.
 */
export async function regenerateBlueprintPdf(
  sessionId: string,
  kind: PdfKind = "report"
): Promise<string> {
  const session = await assertCanAccessSession(sessionId);
  const blueprint = await loadBlueprint(sessionId);

  const storagePath = await generateAndStorePdf(session, blueprint, kind);
  return signPdfUrl(storagePath);
}
