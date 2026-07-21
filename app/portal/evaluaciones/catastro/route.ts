import { getTranslations } from "next-intl/server";
import {
  buildComplianceDossierHtml,
  type DossierDict,
  type DossierEvidence,
} from "@/lib/documents/compliance-dossier";
import { renderDocument } from "@/lib/documents/layout";
import { loadClientReportData } from "@/lib/documents/load-report-data.server";
import { renderPdf } from "@/lib/documents/render.server";
import { REPORT_ERROR_STATUS } from "@/lib/documents/report-http";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /portal/evaluaciones/catastro — Catastro de cumplimiento del cliente
 * (documento final del sub-proyecto #7): brechas, resoluciones, documentos
 * tipo y evidencias con su estado de revisión. Gated a pagado, RLS;
 * regenerado on-demand.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(): Promise<Response> {
  const [result, t] = await Promise.all([
    loadClientReportData(),
    getTranslations("documents.dossier"),
  ]);
  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: REPORT_ERROR_STATUS[result.error] },
    );
  }

  // Evidencias por brecha (RLS evidences_client_select acota a su empresa).
  const supabase = await createClient();
  const breachIds = result.data.breaches.map((breach) => breach.id);
  const evidences: DossierEvidence[] = [];
  if (breachIds.length > 0) {
    const { data: rows } = await supabase
      .from("evidences")
      .select("breach_id, name, status, version")
      .in("breach_id", breachIds)
      .order("created_at", { ascending: true });
    for (const row of rows ?? []) {
      if (!row.breach_id) continue;
      evidences.push({
        breachId: row.breach_id,
        name: row.name,
        status: row.status,
        version: row.version,
      });
    }
  }

  const dict: DossierDict = {
    intro: t("intro"),
    summary: t("summary"),
    resolvedLabel: t("resolvedLabel"),
    openLabel: t("openLabel"),
    resolvedOn: t("resolvedOn"),
    severityLabels: t.raw("severityLabels") as Record<string, string>,
    evidenceStatuses: t.raw("evidenceStatuses") as Record<string, string>,
    documentsTitle: t("documentsTitle"),
    evidencesTitle: t("evidencesTitle"),
    noEvidence: t("noEvidence"),
    empty: t("empty"),
    footerNote: t("footerNote"),
  };
  const generated = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date());

  try {
    const html = renderDocument({
      title: t("title"),
      brand: t("brand"),
      bodyHtml: buildComplianceDossierHtml(result.data, evidences, dict),
      meta: {
        generated: t("generatedLabel", { date: generated }),
        folio: result.data.rut || undefined,
      },
    });
    const pdf = await renderPdf(html);
    const safeRut = result.data.rut.replace(/[^0-9kK-]/g, "") || "empresa";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="catastro-cumplimiento-${safeRut}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    console.error("[documents] render del catastro falló:", cause);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
