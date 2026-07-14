import { buildReportContext } from "@/lib/documents/report-context.server";
import { loadClientReportData } from "@/lib/documents/load-report-data.server";
import { respondWithReportPdf } from "@/lib/documents/respond-with-report.server";

/**
 * GET /portal/evaluaciones/informe — descarga el Informe de diagnóstico del
 * cliente (gated a pagado, RLS acota a su empresa). Regenera on-demand.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(): Promise<Response> {
  const [result, { dict, generated }] = await Promise.all([
    loadClientReportData(),
    buildReportContext(),
  ]);
  return respondWithReportPdf(result, dict, generated);
}
