import { buildReportContext } from "@/lib/documents/report-context.server";
import { loadCompanyReportData } from "@/lib/documents/load-report-data.server";
import { respondWithReportPdf } from "@/lib/documents/respond-with-report.server";

/**
 * GET /app/companies/[id]/informe — descarga el Informe de diagnóstico de una
 * empresa (consultor/admin; lectura service-role tras verificar rol).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const [result, { dict, generated }] = await Promise.all([
    loadCompanyReportData(id),
    buildReportContext(),
  ]);
  return respondWithReportPdf(result, dict, generated);
}
