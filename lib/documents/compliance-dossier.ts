import { escapeHtml } from "./layout";
import type { ReportData } from "./report-http";
import { getTemplate } from "./templates/registry";
import { getBreachMitigation } from "@/lib/legal/breach-mitigation";

/**
 * Catastro de cumplimiento (documento final, sub-proyecto #7): por cada brecha
 * del diagnóstico activo — estado de resolución, fecha, documentos tipo
 * aplicables y evidencias subidas con su estado de revisión. Es el expediente
 * que acompaña a la certificación. Constructor puro.
 */

export interface DossierEvidence {
  breachId: string;
  name: string;
  status: string;
  version: number;
}

export interface DossierDict {
  intro: string;
  summary: string;
  resolvedLabel: string;
  openLabel: string;
  resolvedOn: string;
  severityLabels: Record<string, string>;
  evidenceStatuses: Record<string, string>;
  documentsTitle: string;
  evidencesTitle: string;
  noEvidence: string;
  empty: string;
  footerNote: string;
}

export function buildComplianceDossierHtml(
  data: ReportData,
  evidences: readonly DossierEvidence[],
  dict: DossierDict,
): string {
  if (data.breaches.length === 0) {
    return `<p class="doc-empty">${escapeHtml(dict.empty)}</p>`;
  }

  const resolved = data.breaches.filter((b) => b.resolutionStatus === "resolved");
  const byBreach = new Map<string, DossierEvidence[]>();
  for (const evidence of evidences) {
    const list = byBreach.get(evidence.breachId) ?? [];
    list.push(evidence);
    byBreach.set(evidence.breachId, list);
  }

  const formatDate = (iso: string): string =>
    new Intl.DateTimeFormat("es-CL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "America/Santiago",
    }).format(new Date(iso));

  const sections = data.breaches
    .map((breach, index) => {
      const isResolved = breach.resolutionStatus === "resolved";
      const severity = dict.severityLabels[breach.severity] ?? breach.severity;
      const state = isResolved
        ? breach.resolvedAt
          ? `${dict.resolvedLabel} · ${dict.resolvedOn} ${formatDate(breach.resolvedAt)}`
          : dict.resolvedLabel
        : dict.openLabel;

      const mitigation = getBreachMitigation(breach.breachCode);
      const documents = (mitigation?.templateIds ?? [])
        .map((id) => getTemplate(id))
        .filter((template) => template !== null)
        .map((template) => `<li>${escapeHtml(template.title)}</li>`)
        .join("");

      const breachEvidences = byBreach.get(breach.id) ?? [];
      const evidenceRows = breachEvidences
        .map(
          (evidence) =>
            `<tr><td>${escapeHtml(evidence.name)}</td><td>${escapeHtml(
              dict.evidenceStatuses[evidence.status] ?? evidence.status,
            )}</td><td>v${evidence.version}</td></tr>`,
        )
        .join("");

      return `
<h2>${index + 1}. ${escapeHtml(breach.areaLabel)} · <span class="sev sev-${escapeHtml(breach.severity)}">${escapeHtml(severity)}</span></h2>
<p><strong>${escapeHtml(state)}</strong></p>
<p>${escapeHtml(breach.description)}</p>
${documents ? `<p><strong>${escapeHtml(dict.documentsTitle)}</strong></p><ul>${documents}</ul>` : ""}
<p><strong>${escapeHtml(dict.evidencesTitle)}</strong></p>
${
  evidenceRows
    ? `<table style="max-width:520px">${evidenceRows}</table>`
    : `<p class="doc-empty">${escapeHtml(dict.noEvidence)}</p>`
}`;
    })
    .join("");

  return `
<p>${escapeHtml(dict.intro)}</p>
<div class="doc-summary">
  <div class="item"><div class="label">${escapeHtml(dict.summary)}</div>
  <div class="value">${resolved.length} / ${data.breaches.length}</div></div>
</div>
${sections}
<div class="doc-footer">${escapeHtml(dict.footerNote)}</div>`;
}
