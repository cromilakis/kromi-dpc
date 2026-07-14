import type { DiagnosisBreachRow } from "@/lib/portal/load-diagnosis.server";

/**
 * Tipos y helpers HTTP compartidos del informe (sin server-only ni navegador,
 * para poder testearlos y usarlos desde las rutas y el respond helper).
 */

export type ReportError = "no_paid" | "not_found" | "unauthorized" | "unavailable";

export interface ReportData {
  companyName: string;
  rut: string;
  riskLevel: string;
  totalBreaches: number;
  breaches: DiagnosisBreachRow[];
}

export type ReportResult =
  | { ok: true; data: ReportData }
  | { ok: false; error: ReportError };

export const REPORT_ERROR_STATUS: Record<ReportError, number> = {
  unauthorized: 403,
  no_paid: 403,
  not_found: 404,
  unavailable: 503,
};

/** Nombre de archivo saneado (solo alfanumérico, punto y guion). */
export function reportFilename(rut: string): string {
  const safe = rut.replace(/[^0-9kK-]/g, "");
  return `informe-diagnostico-${safe}.pdf`;
}
