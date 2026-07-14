import { formatFineClp } from "@/lib/legal/fine";
import { escapeHtml, renderDocument } from "./layout";
import type { ReportData } from "./report-http";

/**
 * Constructor puro del Informe de diagnóstico del cliente: datos → HTML del
 * cuerpo, envuelto en el chrome compartido. Sin I/O; testeable como string.
 * No lleva QR (el informe no es verificable; el certificado sí, en #7).
 */

export interface ReportDict {
  title: string;
  brand: string;
  summaryTitle: string;
  riskLabel: string;
  /** risk_level (crudo) → etiqueta legible. */
  riskLevels: Record<string, string>;
  totalBreachesLabel: string;
  findingsTitle: string;
  tableArea: string;
  tableSeverity: string;
  tableFine: string;
  /** severity (crudo) → etiqueta legible. */
  severityLabels: Record<string, string>;
  /** Texto cuando no hay multa. */
  noFine: string;
  /** Estado vacío (sin brechas). */
  empty: string;
  /** "Generado el". */
  generatedLabel: string;
  footerNote: string;
}

/** Clase CSS de severidad (mismo enum que el resto del sistema). */
function severityClass(severity: string): string {
  const known = ["critico", "alto", "medio", "bajo"];
  return known.includes(severity) ? `sev-${severity}` : "sev-bajo";
}

export function buildDiagnosisReportHtml(
  data: ReportData,
  dict: ReportDict,
  generated: string,
): string {
  const riskText = dict.riskLevels[data.riskLevel] ?? data.riskLevel;

  const summary = `
    <h2>${escapeHtml(dict.summaryTitle)}</h2>
    <p><strong>${escapeHtml(data.companyName)}</strong></p>
    <div class="doc-summary">
      <div class="item">
        <div class="label">${escapeHtml(dict.riskLabel)}</div>
        <div class="value">${escapeHtml(riskText)}</div>
      </div>
      <div class="item">
        <div class="label">${escapeHtml(dict.totalBreachesLabel)}</div>
        <div class="value">${data.totalBreaches}</div>
      </div>
    </div>`;

  let findings: string;
  if (data.breaches.length === 0) {
    findings = `<p class="doc-empty">${escapeHtml(dict.empty)}</p>`;
  } else {
    const rows = data.breaches
      .map((b) => {
        const sevLabel = dict.severityLabels[b.severity] ?? b.severity;
        const fine = formatFineClp(b.fineMinUtm, b.fineMaxUtm) ?? dict.noFine;
        return `<tr>
          <td>${escapeHtml(b.areaLabel)}</td>
          <td class="sev ${severityClass(b.severity)}">${escapeHtml(sevLabel)}</td>
          <td>${escapeHtml(fine)}</td>
        </tr>`;
      })
      .join("");
    findings = `
      <h2>${escapeHtml(dict.findingsTitle)}</h2>
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(dict.tableArea)}</th>
            <th>${escapeHtml(dict.tableSeverity)}</th>
            <th>${escapeHtml(dict.tableFine)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  const bodyHtml = `${summary}${findings}
    <div class="doc-footer">${escapeHtml(dict.footerNote)}</div>`;

  return renderDocument({
    title: dict.title,
    brand: dict.brand,
    bodyHtml,
    meta: { generated: `${dict.generatedLabel} ${generated}`, folio: data.rut },
  });
}
