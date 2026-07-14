# Infra de generación de documentos (HTML→PDF + QR) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la infraestructura reutilizable de generación de documentos PDF (HTML→PDF con Chromium headless + helper de QR verificable) y entregar el primer documento real: el Informe de diagnóstico del cliente, descargable por cliente (portal) y consultor (/app).

**Architecture:** El render es el único módulo con navegador (`renderPdf`); los constructores de documento son funciones puras (datos → HTML string autocontenido con CSS inline), testeables sin Chromium. Los loaders obtienen los datos (cliente vía RLS gated a pagado; consultor vía service-role tras verificar rol) y un helper compartido arma la `Response` PDF. Dos rutas GET exponen la descarga; un botón cliente la dispara. Sin almacenamiento (on-demand).

**Tech Stack:** Next.js 16 (App Router, route handlers), `puppeteer-core` + `@sparticuz/chromium` (PDF serverless en Vercel), `qrcode` (QR), next-intl (i18n), Supabase (RLS + service-role), Vitest + Playwright.

## Global Constraints

- Prosa/código: español en prosa, inglés en identificadores/claves/flags.
- Validar en servidor; no confiar en el cliente. RLS en datos de usuario; secretos fuera del cliente y del repo.
- Externalizar textos de UI (i18n); no hardcodear strings de UI.
- **On-demand, sin storage** de PDFs (no bucket, no tabla de metadata).
- Motor PDF: **Chromium headless** (`puppeteer-core` + `@sparticuz/chromium`). Sin servicios externos de PDF (datos personales no salen a terceros).
- El consultor **no** tiene policy RLS sobre `company_diagnoses`/`diagnosis_breaches`: su loader usa **service-role** tras verificar `profiles.role ∈ {consultant, admin}` (patrón de `lib/diagnosis/persist.server.ts`).
- El cliente accede solo gated a pagado (`service_paid_at`), reusando el modelo de #3.
- Rutas de descarga: `export const runtime = "nodejs"`, `export const dynamic = "force-dynamic"`, `export const maxDuration = 60`.
- El QR se construye y prueba como helper reutilizable; **no** se cablea un QR en el informe de #4 (se usa de verdad en #7). No poner un QR de adorno.
- Commits solo como `Cromilakis <ipcromilakis@gmail.com>`, sin trailers de coautoría.

---

### Task 1: Helper de QR (`lib/documents/qr.ts`) + dependencia `qrcode`

**Files:**
- Create: `lib/documents/qr.ts`
- Create: `test/documents-qr.test.ts`
- Modify: `package.json` (deps)

**Interfaces:**
- Produces:
  - `qrDataUri(url: string): Promise<string>` — data URI PNG (`data:image/png;base64,…`).
  - `verifyUrl(code: string, baseUrl?: string): string` — `${base}/verify/${code}`; `base` por defecto desde `process.env.NEXT_PUBLIC_APP_URL`, fallback `"https://dpc.kromi.cl"`; sin doble slash.

- [ ] **Step 1: Instalar dependencia**

```bash
pnpm add qrcode
pnpm add -D @types/qrcode
```

- [ ] **Step 2: Escribir el test que falla**

`test/documents-qr.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { qrDataUri, verifyUrl } from "../lib/documents/qr";

describe("verifyUrl", () => {
  it("arma la URL de verificación con la base dada", () => {
    expect(verifyUrl("DPC-CA-2026-X7K4QZ", "https://dpc.kromi.cl")).toBe(
      "https://dpc.kromi.cl/verify/DPC-CA-2026-X7K4QZ",
    );
  });

  it("no duplica la barra final de la base", () => {
    expect(verifyUrl("ABC", "https://dpc.kromi.cl/")).toBe(
      "https://dpc.kromi.cl/verify/ABC",
    );
  });
});

describe("qrDataUri", () => {
  it("devuelve un data URI PNG base64 no vacío", async () => {
    const uri = await qrDataUri("https://dpc.kromi.cl/verify/ABC");
    expect(uri.startsWith("data:image/png;base64,")).toBe(true);
    expect(uri.length).toBeGreaterThan("data:image/png;base64,".length + 100);
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `pnpm test documents-qr`
Expected: FAIL (módulo `lib/documents/qr` no existe).

- [ ] **Step 4: Implementar**

`lib/documents/qr.ts`:
```ts
import QRCode from "qrcode";

/**
 * Helper de QR verificable para documentos DPC. `verifyUrl` arma la URL pública
 * de verificación (`/verify/[code]`); `qrDataUri` la codifica como data URI PNG
 * embebible en el HTML del documento. Reutilizable; se usa de verdad en el
 * certificado (#7). No se cablea en el informe de #4.
 */

const DEFAULT_BASE_URL = "https://dpc.kromi.cl";

export function verifyUrl(code: string, baseUrl?: string): string {
  const base = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
  return `${base}/verify/${code}`;
}

export async function qrDataUri(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });
}
```

- [ ] **Step 5: Verificar que pasa**

Run: `pnpm test documents-qr`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/documents/qr.ts test/documents-qr.test.ts package.json pnpm-lock.yaml
git commit -m "feat(documents): helper de QR verificable (qrDataUri + verifyUrl)"
```

---

### Task 2: Chrome del documento (`lib/documents/layout.ts`)

**Files:**
- Create: `lib/documents/layout.ts`
- Create: `test/documents-layout.test.ts`

**Interfaces:**
- Produces:
  - `escapeHtml(value: string): string` — escapa `& < > " '`.
  - `interface DocumentMeta { generated: string; folio?: string }`
  - `interface DocumentChrome { title: string; brand: string; bodyHtml: string; meta: DocumentMeta; code?: string; qrDataUri?: string; verifyLabel?: string }`
  - `renderDocument(chrome: DocumentChrome): string` — HTML autocontenido (`<!DOCTYPE html>…`) con `<style>` inline; incluye el bloque código+QR solo si `code` y `qrDataUri` están presentes.

- [ ] **Step 1: Escribir el test que falla**

`test/documents-layout.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { escapeHtml, renderDocument } from "../lib/documents/layout";

describe("escapeHtml", () => {
  it("escapa los caracteres peligrosos", () => {
    expect(escapeHtml(`<b>"a" & 'b'</b>`)).toBe(
      "&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;",
    );
  });
});

describe("renderDocument", () => {
  const base = {
    title: "Informe de diagnóstico",
    brand: "DPC · Data Protection Compliance",
    bodyHtml: "<p>cuerpo</p>",
    meta: { generated: "Generado el 14 de julio de 2026", folio: "76.086.428-5" },
  };

  it("produce un documento HTML autocontenido con título y cuerpo", () => {
    const html = renderDocument(base);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<style>");
    expect(html).toContain("Informe de diagnóstico");
    expect(html).toContain("<p>cuerpo</p>");
    expect(html).toContain("Generado el 14 de julio de 2026");
  });

  it("omite el bloque de verificación cuando no hay código/QR", () => {
    const html = renderDocument(base);
    expect(html).not.toContain("data:image/png;base64");
    expect(html).not.toContain("doc-verify");
  });

  it("incluye el bloque código+QR cuando se entregan", () => {
    const html = renderDocument({
      ...base,
      code: "DPC-CA-2026-X7K4QZ",
      qrDataUri: "data:image/png;base64,AAAA",
      verifyLabel: "Documento verificable en línea",
    });
    expect(html).toContain("doc-verify");
    expect(html).toContain("DPC-CA-2026-X7K4QZ");
    expect(html).toContain("data:image/png;base64,AAAA");
    expect(html).toContain("Documento verificable en línea");
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test documents-layout`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar**

`lib/documents/layout.ts`:
```ts
/**
 * Chrome compartido de los documentos PDF: cabecera de marca, cuerpo, pie con
 * fecha de generación y folio, y un bloque OPCIONAL de código + QR (para el
 * certificado, #7). Devuelve HTML autocontenido con CSS inline (no depende del
 * pipeline Tailwind de la app); Chromium lo imprime a PDF. Función pura.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface DocumentMeta {
  /** Texto ya formateado, p. ej. "Generado el 14 de julio de 2026". */
  generated: string;
  /** Folio/identificador corto opcional (p. ej. RUT). */
  folio?: string;
}

export interface DocumentChrome {
  title: string;
  brand: string;
  /** HTML del cuerpo, ya escapado por el constructor del documento. */
  bodyHtml: string;
  meta: DocumentMeta;
  /** Código verificable opcional (para #7). */
  code?: string;
  /** Data URI del QR opcional (para #7). */
  qrDataUri?: string;
  /** Etiqueta del bloque de verificación (i18n). */
  verifyLabel?: string;
}

const STYLES = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #1b1f24;
    font-size: 12px;
    line-height: 1.5;
  }
  .doc { padding: 48px 44px; }
  .doc-header {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 2px solid #1b1f24; padding-bottom: 14px; margin-bottom: 28px;
  }
  .doc-brand { font-size: 11px; letter-spacing: 0.4px; color: #5b6570; text-transform: uppercase; }
  .doc-title { font-size: 22px; font-weight: 600; margin: 0 0 4px; }
  .doc-meta { font-size: 10px; color: #5b6570; text-align: right; }
  .doc-body h2 { font-size: 14px; font-weight: 600; margin: 24px 0 10px; }
  .doc-summary { display: flex; gap: 28px; margin-bottom: 8px; }
  .doc-summary .item { }
  .doc-summary .label { font-size: 10px; color: #5b6570; text-transform: uppercase; letter-spacing: 0.4px; }
  .doc-summary .value { font-size: 16px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e3e6ea; vertical-align: top; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: #5b6570; font-weight: 600; }
  .sev { font-weight: 600; }
  .sev-critico { color: #772322; }
  .sev-alto { color: #705500; }
  .sev-medio, .sev-bajo { color: #5b6570; }
  .doc-empty { color: #5b6570; font-style: italic; }
  .doc-verify {
    display: flex; align-items: center; gap: 16px;
    margin-top: 32px; padding-top: 16px; border-top: 1px solid #e3e6ea;
  }
  .doc-verify img { width: 84px; height: 84px; }
  .doc-verify .code { font-family: "Courier New", monospace; font-size: 13px; font-weight: 700; }
  .doc-footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e3e6ea; font-size: 10px; color: #5b6570; }
`;

export function renderDocument(chrome: DocumentChrome): string {
  const { title, brand, bodyHtml, meta, code, qrDataUri, verifyLabel } = chrome;

  const verifyBlock =
    code && qrDataUri
      ? `<div class="doc-verify">
           <img src="${qrDataUri}" alt="" />
           <div>
             ${verifyLabel ? `<div>${escapeHtml(verifyLabel)}</div>` : ""}
             <div class="code">${escapeHtml(code)}</div>
           </div>
         </div>`
      : "";

  const folio = meta.folio
    ? `<div>${escapeHtml(meta.folio)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>${STYLES}</style>
</head>
<body>
  <div class="doc">
    <div class="doc-header">
      <div>
        <div class="doc-brand">${escapeHtml(brand)}</div>
        <h1 class="doc-title">${escapeHtml(title)}</h1>
      </div>
      <div class="doc-meta">
        <div>${escapeHtml(meta.generated)}</div>
        ${folio}
      </div>
    </div>
    <div class="doc-body">${bodyHtml}</div>
    ${verifyBlock}
  </div>
</body>
</html>`;
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `pnpm test documents-layout`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/documents/layout.ts test/documents-layout.test.ts
git commit -m "feat(documents): chrome del documento PDF (renderDocument + escapeHtml)"
```

---

### Task 3: Tipos/HTTP compartidos + constructor del informe

**Files:**
- Create: `lib/documents/report-http.ts`
- Create: `lib/documents/diagnosis-report.ts`
- Create: `test/documents-report.test.ts`

**Interfaces:**
- Consumes: `renderDocument`, `escapeHtml` (Task 2); `formatFineClp` (`lib/legal/fine.ts`); `DiagnosisBreachRow` (type-only, `lib/portal/load-diagnosis.server.ts`).
- Produces (`report-http.ts`):
  - `type ReportError = "no_paid" | "not_found" | "unauthorized" | "unavailable"`
  - `interface ReportData { companyName: string; rut: string; riskLevel: string; totalBreaches: number; breaches: DiagnosisBreachRow[] }`
  - `type ReportResult = { ok: true; data: ReportData } | { ok: false; error: ReportError }`
  - `const REPORT_ERROR_STATUS: Record<ReportError, number>`
  - `reportFilename(rut: string): string`
- Produces (`diagnosis-report.ts`):
  - `interface ReportDict { … }` (ver código)
  - `buildDiagnosisReportHtml(data: ReportData, dict: ReportDict, generated: string): string`

- [ ] **Step 1: Escribir el test que falla**

`test/documents-report.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { REPORT_ERROR_STATUS, reportFilename } from "../lib/documents/report-http";
import { buildDiagnosisReportHtml, type ReportDict } from "../lib/documents/diagnosis-report";
import type { ReportData } from "../lib/documents/report-http";

const dict: ReportDict = {
  title: "Informe de diagnóstico",
  brand: "DPC · Data Protection Compliance",
  summaryTitle: "Resumen",
  riskLabel: "Nivel de riesgo",
  riskLevels: { alto: "Alto", medio: "Medio", bajo: "Bajo" },
  totalBreachesLabel: "Brechas detectadas",
  findingsTitle: "Detalle de brechas",
  tableArea: "Área",
  tableSeverity: "Severidad",
  tableFine: "Multa",
  severityLabels: { critico: "Crítico", alto: "Alto", medio: "Medio", bajo: "Bajo" },
  noFine: "—",
  empty: "No se detectaron brechas en tu diagnóstico.",
  generatedLabel: "Generado el",
  footerNote: "Documento generado automáticamente por la plataforma DPC.",
};

const data: ReportData = {
  companyName: "Clínica Andes SpA",
  rut: "76.086.428-5",
  riskLevel: "alto",
  totalBreaches: 1,
  breaches: [
    {
      id: "b1",
      breachCode: "B-SEG-003",
      area: "SEG",
      areaLabel: "Seguridad de la información",
      severity: "critico",
      articles: ["Art. 14 quáter"],
      fineMinUtm: 100,
      fineMaxUtm: 5000,
      description: "No existen registros de auditoría.",
    },
  ],
};

describe("REPORT_ERROR_STATUS / reportFilename", () => {
  it("mapea cada error a su código HTTP", () => {
    expect(REPORT_ERROR_STATUS.no_paid).toBe(403);
    expect(REPORT_ERROR_STATUS.unauthorized).toBe(403);
    expect(REPORT_ERROR_STATUS.not_found).toBe(404);
    expect(REPORT_ERROR_STATUS.unavailable).toBe(503);
  });

  it("arma un nombre de archivo saneado desde el RUT", () => {
    expect(reportFilename("76.086.428-5")).toBe("informe-diagnostico-76086428-5.pdf");
  });
});

describe("buildDiagnosisReportHtml", () => {
  it("incluye empresa, resumen, fecha y la fila de la brecha con multa", () => {
    const html = buildDiagnosisReportHtml(data, dict, "14 de julio de 2026");
    expect(html).toContain("Clínica Andes SpA");
    expect(html).toContain("Generado el 14 de julio de 2026");
    expect(html).toContain("Seguridad de la información");
    expect(html).toContain("Crítico");
    expect(html).toContain("$6.729.400"); // 100 UTM (UTM_CLP=67294)
    expect(html).toContain("Alto"); // nivel de riesgo
  });

  it("degrada a estado vacío cuando no hay brechas", () => {
    const html = buildDiagnosisReportHtml(
      { ...data, totalBreaches: 0, breaches: [] },
      dict,
      "14 de julio de 2026",
    );
    expect(html).toContain("No se detectaron brechas en tu diagnóstico.");
    expect(html).not.toContain("<table");
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `pnpm test documents-report`
Expected: FAIL (módulos no existen).

- [ ] **Step 3: Implementar `report-http.ts`**

`lib/documents/report-http.ts`:
```ts
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
```

- [ ] **Step 4: Implementar `diagnosis-report.ts`**

`lib/documents/diagnosis-report.ts`:
```ts
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
```

- [ ] **Step 5: Verificar que pasa**

Run: `pnpm test documents-report`
Expected: PASS (4 tests). (Confirma que `UTM_CLP` en `lib/legal` es 67294; 100×67294 = 6.729.400.)

- [ ] **Step 6: Commit**

```bash
git add lib/documents/report-http.ts lib/documents/diagnosis-report.ts test/documents-report.test.ts
git commit -m "feat(documents): tipos HTTP del informe + constructor puro del informe de diagnóstico"
```

---

### Task 4: Servicio de render (`lib/documents/render.server.ts`) + config

**Files:**
- Create: `lib/documents/render.server.ts`
- Modify: `next.config.ts` (agregar `serverExternalPackages`)
- Modify: `package.json` (deps)

**Interfaces:**
- Produces: `renderPdf(html: string): Promise<Buffer>` — lanza Chromium headless, `setContent(html)`, devuelve el PDF A4 con fondo impreso.

**Nota de verificación:** este módulo usa navegador y no lleva unit test; se ejercita en la E2E (Task 8). Aquí la verificación es `tsc` + `lint` + un smoke manual que el implementer corre y pega en el reporte.

- [ ] **Step 1: Instalar dependencias**

```bash
pnpm add puppeteer-core @sparticuz/chromium
```

- [ ] **Step 2: Implementar el servicio**

`lib/documents/render.server.ts`:
```ts
import "server-only";
import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/**
 * Render HTML→PDF con Chromium headless. Único módulo con navegador.
 * Resolución del ejecutable, en orden:
 *   1. PUPPETEER_EXECUTABLE_PATH (dev/CI explícito).
 *   2. Chrome/Edge instalado en Windows (desarrollo local).
 *   3. Binario de @sparticuz/chromium (Vercel / serverless Linux).
 */

const WINDOWS_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

function localExecutablePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.platform === "win32") {
    for (const candidate of WINDOWS_CANDIDATES) {
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

export async function renderPdf(html: string): Promise<Buffer> {
  const executablePath = localExecutablePath() ?? (await chromium.executablePath());
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 3: Declarar los paquetes como externos del server**

En `next.config.ts`, dentro del objeto `nextConfig` (junto a `outputFileTracingIncludes`), agregar:
```ts
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
```

- [ ] **Step 4: Verificar tipos, lint y smoke de render**

```bash
pnpm exec tsc --noEmit
pnpm lint
```
Expected: sin errores.

Smoke manual (requiere Chrome/Edge instalado; en esta máquina Windows lo detecta solo):
```bash
node --input-type=module -e "import('./lib/documents/render.server.ts').then(async(m)=>{const b=await m.renderPdf('<!DOCTYPE html><html><body><h1>hola</h1></body></html>');console.log('bytes',b.length,'head',b.subarray(0,4).toString());}).catch(e=>{console.error(e);process.exit(1)})"
```
> Si `node` no resuelve el import de TS directamente, usar en su lugar la E2E de Task 8 como prueba del render y anotarlo en el reporte. Expected del smoke: `head %PDF`.

- [ ] **Step 5: Commit**

```bash
git add lib/documents/render.server.ts next.config.ts package.json pnpm-lock.yaml
git commit -m "feat(documents): servicio de render HTML→PDF con Chromium headless"
```

---

### Task 5: Loaders de datos + respond helper

**Files:**
- Create: `lib/documents/load-report-data.server.ts`
- Create: `lib/documents/respond-with-report.server.ts`

**Interfaces:**
- Consumes: `loadClientDiagnosis` (`lib/portal/load-diagnosis.server.ts`), `createClient` (`lib/supabase/server`), `createAdminClient` (`lib/supabase/admin`), `renderPdf` (Task 4), `buildDiagnosisReportHtml`/`ReportDict` (Task 3), `REPORT_ERROR_STATUS`/`reportFilename`/`ReportResult`/`ReportData` (Task 3), `DiagnosisBreachRow` (`lib/portal/load-diagnosis.server`).
- Produces:
  - `loadClientReportData(): Promise<ReportResult>` — sesión + gate pagado (vía `company_client_view`) + diagnóstico activo del cliente (RLS).
  - `loadCompanyReportData(companyId: string): Promise<ReportResult>` — rol consultor/admin + lectura service-role por `companyId`.
  - `respondWithReportPdf(result: ReportResult, dict: ReportDict, generated: string): Promise<Response>`.

- [ ] **Step 1: Implementar los loaders**

`lib/documents/load-report-data.server.ts`:
```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  loadClientDiagnosis,
  type DiagnosisBreachRow,
} from "@/lib/portal/load-diagnosis.server";
import type { ReportResult } from "./report-http";

const SEVERITY_ORDER: Record<string, number> = { critico: 0, alto: 1, medio: 2, bajo: 3 };

function mapBreach(row: {
  id: string;
  breach_code: string;
  area: string;
  area_label: string;
  severity: string;
  articles: string[] | null;
  fine_min_utm: number | null;
  fine_max_utm: number | null;
  description: string;
}): DiagnosisBreachRow {
  return {
    id: row.id,
    breachCode: row.breach_code,
    area: row.area,
    areaLabel: row.area_label,
    severity: row.severity,
    articles: row.articles ?? [],
    fineMinUtm: row.fine_min_utm,
    fineMaxUtm: row.fine_max_utm,
    description: row.description,
  };
}

function sortBreaches(rows: DiagnosisBreachRow[]): DiagnosisBreachRow[] {
  return rows.sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      a.areaLabel.localeCompare(b.areaLabel),
  );
}

/** Informe del CLIENTE: sesión + pago + diagnóstico activo (RLS acota a su empresa). */
export async function loadClientReportData(): Promise<ReportResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: company } = await supabase
      .from("company_client_view")
      .select("name, rut, service_paid_at")
      .maybeSingle();
    if (!company) return { ok: false, error: "unauthorized" };
    if (!company.service_paid_at) return { ok: false, error: "no_paid" };

    const { diagnosisId, breaches } = await loadClientDiagnosis();
    if (!diagnosisId) return { ok: false, error: "not_found" };

    const { data: diag } = await supabase
      .from("company_diagnoses")
      .select("risk_level, total_breaches")
      .eq("id", diagnosisId)
      .maybeSingle();

    return {
      ok: true,
      data: {
        companyName: company.name,
        rut: company.rut,
        riskLevel: diag?.risk_level ?? "",
        totalBreaches: diag?.total_breaches ?? breaches.length,
        breaches,
      },
    };
  } catch (cause) {
    console.error("[documents] loadClientReportData falló:", cause);
    return { ok: false, error: "unavailable" };
  }
}

/** Informe para el CONSULTOR: verifica rol y lee por service-role (sin RLS de diagnóstico). */
export async function loadCompanyReportData(companyId: string): Promise<ReportResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile || (profile.role !== "consultant" && profile.role !== "admin")) {
      return { ok: false, error: "unauthorized" };
    }

    const admin = createAdminClient();
    const { data: company } = await admin
      .from("companies")
      .select("name, rut")
      .eq("id", companyId)
      .maybeSingle();
    if (!company) return { ok: false, error: "not_found" };

    const { data: diagnosis } = await admin
      .from("company_diagnoses")
      .select("id, risk_level, total_breaches")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!diagnosis) return { ok: false, error: "not_found" };

    const { data: rows } = await admin
      .from("diagnosis_breaches")
      .select(
        "id, breach_code, area, area_label, severity, articles, fine_min_utm, fine_max_utm, description",
      )
      .eq("diagnosis_id", diagnosis.id);

    return {
      ok: true,
      data: {
        companyName: company.name,
        rut: company.rut,
        riskLevel: diagnosis.risk_level,
        totalBreaches: diagnosis.total_breaches,
        breaches: sortBreaches((rows ?? []).map(mapBreach)),
      },
    };
  } catch (cause) {
    console.error("[documents] loadCompanyReportData falló:", cause);
    return { ok: false, error: "unavailable" };
  }
}
```

- [ ] **Step 2: Implementar el respond helper**

`lib/documents/respond-with-report.server.ts`:
```ts
import "server-only";
import { buildDiagnosisReportHtml, type ReportDict } from "./diagnosis-report";
import { renderPdf } from "./render.server";
import { REPORT_ERROR_STATUS, reportFilename, type ReportResult } from "./report-http";

/**
 * Arma la Response del informe: estado de error → JSON + código HTTP; éxito →
 * HTML del informe → PDF → application/pdf con Content-Disposition. Un fallo de
 * render se degrada a 503 (nunca a un PDF vacío).
 */
export async function respondWithReportPdf(
  result: ReportResult,
  dict: ReportDict,
  generated: string,
): Promise<Response> {
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: REPORT_ERROR_STATUS[result.error] });
  }
  try {
    const html = buildDiagnosisReportHtml(result.data, dict, generated);
    const pdf = await renderPdf(html);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportFilename(result.data.rut)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    console.error("[documents] respondWithReportPdf: render falló:", cause);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
```

- [ ] **Step 3: Verificar tipos y lint**

```bash
pnpm exec tsc --noEmit
pnpm lint
```
Expected: sin errores. (El comportamiento se prueba en la E2E de Task 8.)

- [ ] **Step 4: Commit**

```bash
git add lib/documents/load-report-data.server.ts lib/documents/respond-with-report.server.ts
git commit -m "feat(documents): loaders del informe (cliente + consultor) y respond helper PDF"
```

---

### Task 6: Rutas de descarga + contexto i18n del documento

**Files:**
- Create: `lib/documents/report-context.server.ts`
- Create: `app/portal/evaluaciones/informe/route.ts`
- Create: `app/app/companies/[id]/informe/route.ts`
- Create: `messages/app/documents.json`

**Interfaces:**
- Consumes: `loadClientReportData`/`loadCompanyReportData`/`respondWithReportPdf` (Task 5), `ReportDict` (Task 3), `getTranslations` (next-intl/server).
- Produces: `buildReportContext(): Promise<{ dict: ReportDict; generated: string }>`.

- [ ] **Step 1: Crear el namespace i18n del documento**

`messages/app/documents.json`:
```json
{
  "documents": {
    "report": {
      "title": "Informe de diagnóstico",
      "brand": "DPC · Data Protection Compliance",
      "summaryTitle": "Resumen",
      "riskLabel": "Nivel de riesgo",
      "riskLevels": {
        "alto": "Alto",
        "medio": "Medio",
        "bajo": "Bajo"
      },
      "totalBreachesLabel": "Brechas detectadas",
      "findingsTitle": "Detalle de brechas",
      "tableArea": "Área",
      "tableSeverity": "Severidad",
      "tableFine": "Multa potencial",
      "severityLabels": {
        "critico": "Crítico",
        "alto": "Alto",
        "medio": "Medio",
        "bajo": "Bajo"
      },
      "noFine": "—",
      "empty": "No se detectaron brechas en tu diagnóstico.",
      "generatedLabel": "Generado el",
      "footerNote": "Documento generado automáticamente por la plataforma DPC. Refleja el diagnóstico vigente al momento de su emisión."
    }
  }
}
```

- [ ] **Step 2: Implementar el contexto compartido**

`lib/documents/report-context.server.ts`:
```ts
import "server-only";
import { getTranslations } from "next-intl/server";
import type { ReportDict } from "./diagnosis-report";

/**
 * Arma el diccionario del informe (namespace i18n `documents.report`) y la
 * fecha de generación formateada (es-CL, zona de Chile). Compartido por las
 * rutas del cliente y del consultor.
 */
export async function buildReportContext(): Promise<{ dict: ReportDict; generated: string }> {
  const t = await getTranslations("documents.report");
  const dict: ReportDict = {
    title: t("title"),
    brand: t("brand"),
    summaryTitle: t("summaryTitle"),
    riskLabel: t("riskLabel"),
    riskLevels: t.raw("riskLevels") as Record<string, string>,
    totalBreachesLabel: t("totalBreachesLabel"),
    findingsTitle: t("findingsTitle"),
    tableArea: t("tableArea"),
    tableSeverity: t("tableSeverity"),
    tableFine: t("tableFine"),
    severityLabels: t.raw("severityLabels") as Record<string, string>,
    noFine: t("noFine"),
    empty: t("empty"),
    generatedLabel: t("generatedLabel"),
    footerNote: t("footerNote"),
  };
  const generated = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date());
  return { dict, generated };
}
```

- [ ] **Step 3: Implementar la ruta del cliente**

`app/portal/evaluaciones/informe/route.ts`:
```ts
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
```

- [ ] **Step 4: Implementar la ruta del consultor**

`app/app/companies/[id]/informe/route.ts`:
```ts
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
```

- [ ] **Step 5: Verificar tipos, lint y build**

```bash
pnpm exec tsc --noEmit
pnpm lint
```
Expected: sin errores. (Las rutas se prueban en la E2E de Task 8.)

- [ ] **Step 6: Commit**

```bash
git add lib/documents/report-context.server.ts app/portal/evaluaciones/informe/route.ts app/app/companies/[id]/informe/route.ts messages/app/documents.json
git commit -m "feat(documents): rutas de descarga del informe (portal + /app) e i18n del documento"
```

---

### Task 7: Botón de descarga + cableado en portal y /app

**Files:**
- Create: `components/documents/download-report-button.tsx`
- Create: `test/documents-download-button.test.tsx`
- Modify: `messages/es.json` (namespace `common.downloadReport`)
- Modify: `app/portal/evaluaciones/page.tsx` (botón cuando hay brechas)
- Modify: `app/app/companies/[id]/page.tsx` (botón en la ficha)

**Interfaces:**
- Consumes: `Button` (`@/components/ui`), `useTranslations` (next-intl).
- Produces: `DownloadReportButton({ href, variant? }: { href: string; variant?: "primary" | "secondary" })`.

- [ ] **Step 1: Añadir los textos de UI del botón**

En `messages/es.json`, dentro del objeto `"common"`, agregar la clave:
```json
    "downloadReport": {
      "label": "Descargar informe",
      "downloading": "Generando informe…",
      "errors": {
        "no_paid": "Completa tu pago para descargar el informe.",
        "not_found": "Aún no hay un diagnóstico para generar el informe.",
        "unauthorized": "Tu sesión no tiene acceso a este informe.",
        "unavailable": "No se pudo generar el informe. Intenta nuevamente."
      }
    }
```
> Insertar respetando el JSON existente (coma entre claves). Verificar con `node -e "JSON.parse(require('fs').readFileSync('messages/es.json','utf8'))"`.

- [ ] **Step 2: Escribir el test que falla**

`test/documents-download-button.test.tsx`:
```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { DownloadReportButton } from "../components/documents/download-report-button";

const messages = {
  common: {
    downloadReport: {
      label: "Descargar informe",
      downloading: "Generando informe…",
      errors: {
        no_paid: "Completa tu pago para descargar el informe.",
        not_found: "Aún no hay un diagnóstico para generar el informe.",
        unauthorized: "Tu sesión no tiene acceso a este informe.",
        unavailable: "No se pudo generar el informe. Intenta nuevamente.",
      },
    },
  },
};

function renderButton() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DownloadReportButton href="/portal/evaluaciones/informe" />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DownloadReportButton", () => {
  it("muestra la etiqueta de descarga", () => {
    renderButton();
    expect(screen.getByRole("button", { name: "Descargar informe" })).toBeTruthy();
  });

  it("muestra el mensaje de error cuando la respuesta no es ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "no_paid" }),
      }),
    );
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(
        screen.getByText("Completa tu pago para descargar el informe."),
      ).toBeTruthy(),
    );
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `pnpm test documents-download-button`
Expected: FAIL (componente no existe).

- [ ] **Step 4: Implementar el botón**

`components/documents/download-report-button.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

/**
 * Botón de descarga de documento PDF: hace fetch de la ruta, y si responde ok
 * dispara la descarga del blob; si no, traduce el error (`no_paid`, `not_found`,
 * `unauthorized`, `unavailable`). Nunca descarga un archivo roto.
 */

const KNOWN_ERRORS = ["no_paid", "not_found", "unauthorized", "unavailable"] as const;
type KnownError = (typeof KNOWN_ERRORS)[number];

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^"]+)"?/.exec(header);
  return match ? match[1]! : null;
}

export function DownloadReportButton({
  href,
  variant = "secondary",
}: {
  href: string;
  variant?: "primary" | "secondary";
}) {
  const t = useTranslations("common.downloadReport");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<KnownError | null>(null);

  async function onClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) {
        let key: KnownError = "unavailable";
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error && (KNOWN_ERRORS as readonly string[]).includes(body.error)) {
            key = body.error as KnownError;
          }
        } catch {
          // respuesta sin JSON: se queda en "unavailable".
        }
        setError(key);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        filenameFromDisposition(res.headers.get("Content-Disposition")) ??
        "informe-diagnostico.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Button variant={variant} onClick={onClick} disabled={loading}>
        {loading ? t("downloading") : t("label")}
      </Button>
      {error ? (
        <p role="alert" className="text-caption leading-caption text-danger-red">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Verificar que pasa**

Run: `pnpm test documents-download-button`
Expected: PASS (2 tests).

- [ ] **Step 6: Cablear en el portal de Evaluaciones**

En `app/portal/evaluaciones/page.tsx`:
- Agregar el import: `import { DownloadReportButton } from "@/components/documents/download-report-button";`
- En la rama `paid && breaches.length > 0` (el bloque `<ul>…`), envolver o anteponer el botón. Concretamente, reemplazar el bloque final `) : (` … `<ul …>` para incluir, antes de la `<ul>`, un encabezado con el botón:

Reemplazar:
```tsx
      ) : (
        <ul className="flex flex-col gap-12">
```
por:
```tsx
      ) : (
        <>
          <div className="mb-16 flex justify-end">
            <DownloadReportButton href="/portal/evaluaciones/informe" />
          </div>
          <ul className="flex flex-col gap-12">
```
y cerrar el fragmento: cambiar el cierre `</ul>` final (antes de `)}`) por:
```tsx
          </ul>
        </>
```

- [ ] **Step 7: Cablear en la ficha de empresa (/app)**

En `app/app/companies/[id]/page.tsx`:
- Agregar el import: `import { DownloadReportButton } from "@/components/documents/download-report-button";`
- Localizar el `PageHeader` del resumen de empresa y colocar el botón como acción del header. Si `PageHeader` acepta `children`/`actions`, usarlo; si no, insertar el botón inmediatamente después del `<PageHeader … />`:
```tsx
      <div className="mb-24 flex justify-end">
        <DownloadReportButton href={`/app/companies/${id}/informe`} />
      </div>
```
> Usar el identificador del id de empresa disponible en la página (la variable derivada de `params`/`companyIdSchema`). Si en esa página el id se llama distinto (p. ej. `companyId`), usar ese nombre.

- [ ] **Step 8: Verificar tipos, lint y unit**

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test documents-download-button
```
Expected: sin errores; 2 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add components/documents/download-report-button.tsx test/documents-download-button.test.tsx messages/es.json app/portal/evaluaciones/page.tsx "app/app/companies/[id]/page.tsx"
git commit -m "feat(documents): botón de descarga del informe en portal y ficha de empresa"
```

---

### Task 8: E2E de descarga del informe

**Files:**
- Create: `e2e/documents-report.spec.ts`

**Interfaces:**
- Consumes: patrón de seed de `e2e/portal-evaluaciones.spec.ts` (service-role, RUT único, cliente pagado). Añade el seed de un consultor (auth user + fila en `profiles`).

**Requisito de entorno:** Chromium/Chrome/Edge disponible para el render (esta máquina Windows lo detecta solo; en CI, `PUPPETEER_EXECUTABLE_PATH`).

- [ ] **Step 1: Escribir la E2E**

`e2e/documents-report.spec.ts`:
```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { computeRutDv, formatRut, isDummyRut } from "@/lib/companies/rut";

/**
 * E2E — descarga del Informe de diagnóstico (PDF).
 * Siembra, vía service-role contra el Supabase LOCAL:
 *   - un cliente PAGADO con diagnóstico activo + brecha (descarga por /portal).
 *   - un consultor (auth user + profiles.role='consultant') que descarga el
 *     informe de esa empresa por /app.
 * Verifica bytes %PDF y application/pdf; y que el cliente NO pagado recibe 403.
 */

const RUN_ID = Date.now();
const PAID_EMAIL = `e2e-doc-paid-${RUN_ID}@dpc.local`;
const UNPAID_EMAIL = `e2e-doc-unpaid-${RUN_ID}@dpc.local`;
const CONSULTANT_EMAIL = `e2e-doc-consultant-${RUN_ID}@dpc.local`;
const PASSWORD = "e2e-doc-2026";

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function getAdminClient(): SupabaseClient {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("[documents-report.spec] faltan env NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function generateUniqueRut(offset: number): string {
  for (let attempt = 0; attempt < 5; attempt++) {
    const body = String(1_000_000 + ((RUN_ID + offset + attempt) % 8_999_999)).padStart(7, "0");
    if (isDummyRut(body)) continue;
    const dv = computeRutDv(body);
    return formatRut(`${body}${dv}`);
  }
  throw new Error("[documents-report.spec] no se pudo generar un RUT único no-dummy");
}

async function createAuthUser(admin: SupabaseClient, email: string): Promise<string> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (!error) return created.user.id;
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw new Error(`[documents-report.spec] no se pudo recuperar ${email}`);
  await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true });
  return existing.id;
}

async function seedClient(
  admin: SupabaseClient,
  { email, rutOffset, paid }: { email: string; rutOffset: number; paid: boolean },
): Promise<string> {
  const userId = await createAuthUser(admin, email);
  const rut = generateUniqueRut(rutOffset);
  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: `E2E Doc ${paid ? "Pagado" : "NoPagado"} ${RUN_ID}`,
      rut,
      phase: "diagnostico",
      ...(paid ? { service_paid_at: new Date().toISOString() } : {}),
    })
    .select("id")
    .single();
  if (companyError) throw new Error(`[documents-report.spec] insert companies: ${companyError.message}`);
  const companyId = company.id as string;

  await admin.from("company_members").upsert(
    { user_id: userId, company_id: companyId, status: "active" },
    { onConflict: "user_id" },
  );

  const { data: diagnosis, error: diagError } = await admin
    .from("company_diagnoses")
    .insert({
      company_id: companyId,
      source: "self_service",
      answers: {},
      risk_level: "alto",
      total_breaches: 1,
      status: "active",
    })
    .select("id")
    .single();
  if (diagError) throw new Error(`[documents-report.spec] insert diagnoses: ${diagError.message}`);

  await admin.from("diagnosis_breaches").insert({
    diagnosis_id: diagnosis.id,
    breach_code: "B-SEG-003",
    area: "SEG",
    area_label: "Seguridad de la información",
    severity: "critico",
    articles: ["Art. 14 quáter"],
    fine_min_utm: 100,
    fine_max_utm: 5000,
    description: "No existen registros de auditoría.",
  });

  return companyId;
}

async function seedConsultant(admin: SupabaseClient): Promise<void> {
  const userId = await createAuthUser(admin, CONSULTANT_EMAIL);
  await admin.from("profiles").upsert(
    { user_id: userId, full_name: "E2E Consultor", role: "consultant" },
    { onConflict: "user_id" },
  );
}

async function login(page: import("@playwright/test").Page, email: string, url: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(url);
}

let paidCompanyId = "";

test.describe("Documentos — informe de diagnóstico", () => {
  test.beforeAll(async () => {
    const admin = getAdminClient();
    paidCompanyId = await seedClient(admin, { email: PAID_EMAIL, rutOffset: 11, paid: true });
    await seedClient(admin, { email: UNPAID_EMAIL, rutOffset: 12, paid: false });
    await seedConsultant(admin);
  });

  test("cliente pagado descarga el informe en PDF", async ({ page }) => {
    await login(page, PAID_EMAIL, /\/portal$/);
    const res = await page.request.get("/portal/evaluaciones/informe");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    const body = await res.body();
    expect(body.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  test("cliente no pagado recibe 403", async ({ page }) => {
    await login(page, UNPAID_EMAIL, /\/portal$/);
    const res = await page.request.get("/portal/evaluaciones/informe");
    expect(res.status()).toBe(403);
  });

  test("consultor descarga el informe de la empresa en PDF", async ({ page }) => {
    await login(page, CONSULTANT_EMAIL, /\/app/);
    const res = await page.request.get(`/app/companies/${paidCompanyId}/informe`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
    const body = await res.body();
    expect(body.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
```

- [ ] **Step 2: Correr la E2E**

```bash
pnpm test:e2e documents-report
```
Expected: 3 tests PASS. Si el render falla por no encontrar navegador, exportar `PUPPETEER_EXECUTABLE_PATH` a un Chrome/Edge instalado y reintentar.

- [ ] **Step 3: Commit**

```bash
git add e2e/documents-report.spec.ts
git commit -m "test(e2e): descarga del informe de diagnóstico (cliente pagado, no pagado 403, consultor)"
```

---

## Notas de cierre

- No hay migraciones nuevas en #4.
- Pendiente de despliegue (del usuario): verificar memoria/`maxDuration` de la función de render en Vercel tras el primer deploy; `@sparticuz/chromium` provee el binario en serverless.
- El QR queda como infra probada; se cablea al certificado en #7.
