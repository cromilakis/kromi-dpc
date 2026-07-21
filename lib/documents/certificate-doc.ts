import { escapeHtml } from "./layout";

/**
 * Certificado DPC en PDF (sub-proyecto #7): documento verificable con QR a
 * /verify/[code] (el bloque código+QR lo agrega renderDocument). Constructor
 * puro; los datos vienen del snapshot de `certificates`.
 */

export interface CertificateDocData {
  companyName: string;
  rut: string;
  sectorName: string | null;
  code: string;
  issuedAt: string;
  validUntil: string;
  revalidatedAt: string | null;
  sha256Hash: string;
}

export interface CertificateDict {
  grantedTo: string;
  scopeText: string;
  codeLabel: string;
  issuedLabel: string;
  validUntilLabel: string;
  revalidatedLabel: string;
  sectorLabel: string;
  hashLabel: string;
  disclaimer: string;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function buildCertificateHtml(
  data: CertificateDocData,
  dict: CertificateDict,
): string {
  const rows: Array<[string, string]> = [
    [dict.codeLabel, data.code],
    [dict.issuedLabel, formatDate(data.issuedAt)],
    [dict.validUntilLabel, formatDate(data.validUntil)],
  ];
  if (data.revalidatedAt) rows.push([dict.revalidatedLabel, formatDate(data.revalidatedAt)]);
  if (data.sectorName) rows.push([dict.sectorLabel, data.sectorName]);

  return `
<p style="margin-top:24px">${escapeHtml(dict.grantedTo)}</p>
<p style="font-size:30px;font-weight:600;margin:6px 0 2px">${escapeHtml(data.companyName)}</p>
<p style="color:#5b6570;margin:0 0 20px">RUT ${escapeHtml(data.rut)}</p>

<p style="max-width:64ch">${escapeHtml(dict.scopeText)}</p>

<table style="max-width:460px">
  ${rows
    .map(
      ([label, value]) =>
        `<tr><th style="width:190px">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("")}
</table>

<p style="margin-top:20px;font-size:10px;color:#5b6570">${escapeHtml(dict.hashLabel)}</p>
<p style="font-family:'Courier New',monospace;font-size:10px;word-break:break-all;margin-top:2px">${escapeHtml(data.sha256Hash)}</p>

<div class="doc-footer">${escapeHtml(dict.disclaimer)}</div>`;
}
