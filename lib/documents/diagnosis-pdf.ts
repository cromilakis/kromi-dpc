/**
 * Constructor del PDF del diagnóstico (función pura HTML→string; Chromium lo
 * imprime a PDF en render.server.ts). Estructura:
 *   - Página 1: PORTADA (oscura, de marca).
 *   - Índice de brechas (hasta 10 por página; el resto continúa en páginas nuevas).
 *   - PRESENTACIÓN (alcance y objetivo).
 *   - Una BRECHA por página con su propuesta de mitigación.
 * CSS inline (no depende del pipeline Tailwind). Paleta monocroma KPC; el rojo
 * solo marca severidad crítica (color con significado).
 */

export type PdfSeverity = "critico" | "alto" | "medio" | "bajo";

export interface PdfAction {
  title: string;
  detail: string;
  evidence: string;
}

export interface PdfBreach {
  description: string;
  severity: PdfSeverity;
  severityLabel: string;
  /** Meta de cierre. Vacío si la brecha no tiene plan mapeado. */
  objective: string;
  actions: PdfAction[];
}

export interface DiagnosisPdfData {
  /** Fecha ya formateada, p. ej. "23 de julio de 2026". */
  generated: string;
  riskLabel: string;
  totalBreaches: number;
  /** Data URI (base64) del logo KPC para el header de las páginas claras. */
  logoDataUri: string;
  /** Nombre de la empresa diagnosticada (opcional). */
  companyName?: string;
  breaches: PdfBreach[];
}

const INDEX_ITEMS_PER_PAGE = 10;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SEVERITY_COLOR: Record<PdfSeverity, string> = {
  critico: "#8a1f1a",
  alto: "#8a6d1a",
  medio: "#3a3d42",
  bajo: "#6b6f76",
};

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 0; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1c1d1f;
    font-size: 12px;
    line-height: 1.55;
  }
  .serif { font-family: Georgia, "Times New Roman", serif; }
  .page {
    position: relative;
    min-height: 297mm;
    padding: 26mm 22mm;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }

  /* ---------- Portada oscura ---------- */
  .cover {
    background: #1c1d1f; color: #fff;
    display: flex; flex-direction: column; justify-content: space-between;
    overflow: hidden;
  }
  .cover .dots {
    position: absolute; inset: 0;
    background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px);
    background-size: 22px 22px;
  }
  .cover > * { position: relative; }
  .wordmark { display: flex; align-items: center; gap: 16px; }
  .wordmark .mark { font-weight: 800; font-size: 40px; letter-spacing: -1.5px; color: #fff; }
  .wordmark .div { width: 1px; height: 42px; background: rgba(255,255,255,.28); }
  .wordmark .namewrap { display: inline-flex; flex-direction: column; }
  .wordmark .kromi { font-size: 26px; color: #fff; line-height: 1; }
  .wordmark .pc { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
                  color: rgba(255,255,255,.55); margin-top: 4px; }
  .cover-mid { margin: 88px 0 auto; }
  .cover-eyebrow { font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
                   color: rgba(255,255,255,.55); font-weight: 600; }
  .cover-title { font-size: 40px; line-height: 1.08; letter-spacing: -.6px;
                 color: #fff; margin-top: 18px; font-weight: 500; max-width: 16ch; }
  .cover-sub { font-size: 13px; letter-spacing: .5px; text-transform: uppercase;
               color: rgba(255,255,255,.6); font-weight: 600; margin-top: 20px; }
  .cover-sub-bottom { margin-top: auto; margin-bottom: 18px; }
  .cover-company { margin-top: 30px; font-size: 15px; color: rgba(255,255,255,.85); }
  .cover-company span { display: block; font-size: 10px; letter-spacing: 1px;
                        text-transform: uppercase; color: rgba(255,255,255,.5);
                        margin-bottom: 4px; }
  .cover-company strong { color: #fff; font-weight: 600; font-size: 24px; }
  .cover-foot { display: flex; justify-content: space-between; align-items: flex-end;
                border-top: 1px solid rgba(255,255,255,.14); padding-top: 18px; }
  .cover-foot .stat { font-size: 12px; color: rgba(255,255,255,.8); }
  .cover-foot .stat strong { color: #fff; }
  .cover-foot .date { font-size: 11px; color: rgba(255,255,255,.5); text-align: right; }

  /* ---------- Header de marca (índice / presentación / brechas) ---------- */
  .hd { display: flex; align-items: center; justify-content: space-between;
        border-bottom: 1px solid #e6e6e8; padding-bottom: 12px; margin-bottom: 30px; }
  .hd img { height: 28px; width: auto; }
  .hd .tag-r { font-size: 10px; letter-spacing: .4px; text-transform: uppercase;
               color: #6b6f76; font-weight: 600; }
  .page-h { font-size: 24px; letter-spacing: -.4px; color: #1c1d1f; font-weight: 500; }

  /* ---------- Índice ---------- */
  ol.toc { list-style: none; margin-top: 24px; }
  ol.toc li { display: flex; align-items: baseline; gap: 14px;
              padding: 12px 0; border-bottom: 1px solid #eeeeef; }
  .toc-num { flex: 0 0 auto; width: 26px; font-size: 12px; font-weight: 700;
             color: #b9bcc1; font-variant-numeric: tabular-nums; }
  .toc-desc { flex: 1 1 auto; color: #1c1d1f; font-size: 12.5px; line-height: 1.4; }
  .toc-sev { flex: 0 0 auto; font-size: 9.5px; font-weight: 700; letter-spacing: .3px;
             text-transform: uppercase; padding: 2px 8px; border-radius: 999px; }
  .toc-pg { flex: 0 0 auto; width: 52px; text-align: right; font-size: 11px;
            color: #9a9ea4; font-variant-numeric: tabular-nums; }

  /* ---------- Presentación ---------- */
  .pres p { color: #3a3d42; font-size: 12.5px; margin-top: 16px; max-width: 64ch; }
  .box { margin-top: 30px; border: 1px solid #e6e6e8; border-radius: 10px;
         padding: 18px 20px; display: flex; gap: 44px; }
  .box .k { font-size: 10px; letter-spacing: .4px; text-transform: uppercase;
            color: #6b6f76; font-weight: 600; }
  .box .v { font-size: 22px; color: #1c1d1f; font-weight: 600; margin-top: 4px; }
  .foot-note { margin-top: 28px; padding-top: 18px; border-top: 1px solid #e6e6e8;
               font-size: 10.5px; color: #6b6f76; }

  /* ---------- Brecha ---------- */
  .b-index { font-size: 11px; letter-spacing: .4px; text-transform: uppercase;
             color: #6b6f76; font-weight: 600; }
  .b-title { font-size: 18px; line-height: 1.3; color: #1c1d1f; margin-top: 6px;
             font-weight: 600; }
  .tag { display: inline-block; margin-top: 12px; font-size: 10px; font-weight: 700;
         letter-spacing: .3px; text-transform: uppercase; padding: 3px 9px;
         border-radius: 999px; }
  .sec { font-size: 10px; letter-spacing: .4px; text-transform: uppercase;
         color: #6b6f76; font-weight: 600; margin-top: 24px; }
  .obj { color: #3a3d42; margin-top: 6px; }
  .meta { margin-top: 14px; font-size: 11px; color: #6b6f76; }
  .meta strong { color: #1c1d1f; }
  ol.actions { list-style: none; margin-top: 10px; }
  ol.actions li { display: flex; gap: 12px; margin-top: 14px; }
  .num { flex: 0 0 auto; width: 20px; height: 20px; border-radius: 999px;
         background: #f2f2f3; color: #3a3d42; font-size: 11px; font-weight: 700;
         display: flex; align-items: center; justify-content: center; }
  .act-title { color: #1c1d1f; font-weight: 600; }
  .act-detail { color: #3a3d42; margin-top: 2px; }
  .act-ev { color: #6b6f76; font-size: 11px; margin-top: 4px; }
  .noplan { color: #6b6f76; margin-top: 8px; }
`;

function header(logo: string, right: string): string {
  return `<div class="hd"><img src="${logo}" alt="KPC" /><span class="tag-r">${escapeHtml(right)}</span></div>`;
}

function severityTag(b: PdfBreach, extraClass: string): string {
  const color = SEVERITY_COLOR[b.severity];
  return `<span class="${extraClass}" style="color:${color};background:${color}1a;">${escapeHtml(b.severityLabel)}</span>`;
}

function coverPage(d: DiagnosisPdfData): string {
  const company = d.companyName?.trim()
    ? `<p class="cover-company"><span>Preparado para</span><strong>${escapeHtml(d.companyName.trim())}</strong></p>`
    : "";
  return `
  <section class="page cover">
    <div class="dots"></div>
    <div class="wordmark">
      <span class="mark">KPC</span>
      <span class="div"></span>
      <span class="namewrap">
        <span class="kromi serif">Kromi</span>
        <span class="pc">Privacy Center</span>
      </span>
    </div>
    <div class="cover-mid">
      <p class="cover-eyebrow">Informe de autoevaluación</p>
      <h1 class="serif cover-title">Diagnóstico de protección de datos</h1>
      ${company}
    </div>
    <p class="cover-sub cover-sub-bottom">Ley 21.719 · Kromi Privacy Center</p>
    <div class="cover-foot">
      <div class="stat">
        <strong>${d.totalBreaches}</strong> brechas detectadas &nbsp;·&nbsp;
        Nivel de exposición: <strong>${escapeHtml(d.riskLabel)}</strong>
      </div>
      <div class="date">Generado el ${escapeHtml(d.generated)}</div>
    </div>
  </section>`;
}

function indexPages(d: DiagnosisPdfData, firstBreachPage: number): string {
  const total = d.breaches.length;
  const numPages = Math.ceil(total / INDEX_ITEMS_PER_PAGE);
  let html = "";
  for (let p = 0; p < numPages; p++) {
    const start = p * INDEX_ITEMS_PER_PAGE;
    const slice = d.breaches.slice(start, start + INDEX_ITEMS_PER_PAGE);
    const rows = slice
      .map((b, j) => {
        const i = start + j;
        return `
        <li>
          <span class="toc-num">${String(i + 1).padStart(2, "0")}</span>
          <span class="toc-desc">${escapeHtml(b.description)}</span>
          ${severityTag(b, "toc-sev")}
          <span class="toc-pg">Pág. ${firstBreachPage + i}</span>
        </li>`;
      })
      .join("");
    const label = numPages > 1 ? `Índice · ${p + 1}/${numPages}` : "Índice";
    html += `
    <section class="page">
      ${header(d.logoDataUri, label)}
      ${p === 0 ? '<h2 class="serif page-h">Contenido</h2>' : ""}
      <ol class="toc">${rows}</ol>
    </section>`;
  }
  return html;
}

function presentationPage(d: DiagnosisPdfData): string {
  const forWho = d.companyName?.trim()
    ? ` de <strong>${escapeHtml(d.companyName.trim())}</strong>`
    : "";
  return `
  <section class="page pres">
    ${header(d.logoDataUri, "Presentación")}
    <h2 class="serif page-h">Sobre este informe</h2>
    <p>Este informe resume el diagnóstico de cumplimiento${forWho} frente a la Ley 21.719 de Protección de Datos Personales, generado a partir de las respuestas entregadas durante la autoevaluación en el Privacy Center.</p>
    <p><strong>Alcance y objetivo.</strong> Es un panorama preliminar y referencial, basado en las respuestas entregadas; no constituye una auditoría ni una asesoría legal formal. Su propósito es mostrar, de forma clara y accionable, qué brechas existen y cómo cerrarlas.</p>
    <p>En las páginas siguientes se detalla, para cada brecha detectada, su propuesta de mitigación: la meta de cierre, las acciones concretas, la prioridad, el esfuerzo y el plazo estimado. Cada propuesta puede aplicarse de forma autónoma; si se requiere acompañamiento en la implementación, el equipo de Kromi Privacy Center está disponible.</p>
    <div class="box">
      <div><div class="k">Brechas detectadas</div><div class="v">${d.totalBreaches}</div></div>
      <div><div class="k">Nivel de exposición</div><div class="v">${escapeHtml(d.riskLabel)}</div></div>
    </div>
    <div class="foot-note">
      Generado el ${escapeHtml(d.generated)} · KPC — Kromi Privacy Center.<br/>
      Documento referencial, no vinculante. Las referencias legales requieren validación profesional.
    </div>
  </section>`;
}

function breachPage(b: PdfBreach, index: number, total: number, logo: string): string {
  const body =
    b.actions.length > 0
      ? `
        <p class="sec">Meta</p>
        <p class="obj">${escapeHtml(b.objective)}</p>
        <p class="sec">Acciones</p>
        <ol class="actions">
          ${b.actions
            .map(
              (a, i) => `
            <li>
              <span class="num">${i + 1}</span>
              <div>
                <div class="act-title">${escapeHtml(a.title)}</div>
                <div class="act-detail">${escapeHtml(a.detail)}</div>
                <div class="act-ev">Respaldo: ${escapeHtml(a.evidence)}</div>
              </div>
            </li>`,
            )
            .join("")}
        </ol>`
      : `<p class="noplan">${escapeHtml(b.objective)}</p>`;

  return `
  <section class="page">
    ${header(logo, `Brecha ${index} de ${total}`)}
    <p class="b-index">Brecha ${index}</p>
    <h2 class="serif b-title">${escapeHtml(b.description)}</h2>
    ${severityTag(b, "tag")}
    ${body}
  </section>`;
}

export function buildDiagnosisPdfHtml(d: DiagnosisPdfData): string {
  const numIndexPages = Math.max(
    1,
    Math.ceil(d.breaches.length / INDEX_ITEMS_PER_PAGE),
  );
  // portada (1) + índice (numIndexPages) + presentación (1) → primera brecha.
  const firstBreachPage = 2 + numIndexPages + 1;
  const pages =
    coverPage(d) +
    indexPages(d, firstBreachPage) +
    presentationPage(d) +
    d.breaches
      .map((b, i) => breachPage(b, i + 1, d.breaches.length, d.logoDataUri))
      .join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" /><style>${STYLES}</style></head><body>${pages}</body></html>`;
}
