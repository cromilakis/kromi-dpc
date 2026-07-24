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

/** Norma/artículo infringido por una brecha (para el fundamento legal). */
export interface PdfLegalRef {
  /** Nombre completo de la norma y artículo. Ej: "Ley 21.719, Art. 14 ter". */
  norm: string;
  /** Resumen referencial de qué exige el artículo (por qué es una brecha). */
  summary: string;
  /** URL del texto oficial (Ley Chile/BCN u organismo). */
  url?: string;
}

export interface PdfBreach {
  description: string;
  severity: PdfSeverity;
  severityLabel: string;
  /** Normas/artículos que la brecha infringe. Vacío si no hay citas mapeadas. */
  legalRefs: PdfLegalRef[];
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
  /** Enlace de contacto (WhatsApp) para la invitación de cierre. */
  contactUrl?: string;
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
  /* Las páginas de brecha usan márgenes más ajustados para caber en 1 hoja:
     header más arriba (top) y pie más estrecho (bottom). */
  .page.breach { padding: 10mm 22mm 10mm; }

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
  .page.breach .hd { margin-bottom: 20px; }
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
  .tag { display: inline-block; margin-top: 10px; font-size: 10px; font-weight: 700;
         letter-spacing: .3px; text-transform: uppercase; padding: 3px 9px;
         border-radius: 999px; }
  /* Pill de severidad a continuación del título (misma línea que el texto). */
  .tag-inline { margin-top: 0; margin-left: 8px; vertical-align: middle;
                white-space: nowrap; }
  .sec { font-size: 10px; letter-spacing: .4px; text-transform: uppercase;
         color: #6b6f76; font-weight: 600; margin-top: 15px; }
  .obj { color: #3a3d42; margin-top: 5px; }
  .meta { margin-top: 14px; font-size: 11px; color: #6b6f76; }
  .meta strong { color: #1c1d1f; }
  ol.actions { list-style: none; margin-top: 8px; }
  ol.actions li { display: flex; gap: 12px; margin-top: 9px; }
  .num { flex: 0 0 auto; width: 20px; height: 20px; border-radius: 999px;
         background: #f2f2f3; color: #3a3d42; font-size: 11px; font-weight: 700;
         display: flex; align-items: center; justify-content: center; }
  .act-title { color: #1c1d1f; font-weight: 600; }
  .act-detail { color: #3a3d42; margin-top: 2px; }
  .act-ev { color: #6b6f76; font-size: 11px; margin-top: 3px; }
  .act-ev strong { color: #3a3d42; font-weight: 600; }
  .noplan { color: #6b6f76; margin-top: 8px; }

  /* ---------- Fundamento legal de la brecha ---------- */
  .legal-note { color: #6b6f76; margin-top: 5px; font-size: 11px; }
  ul.legal { list-style: none; margin-top: 7px; }
  ul.legal li { padding: 6px 0; border-bottom: 1px solid #eeeeef; }
  ul.legal li:last-child { border-bottom: none; }
  .legal-norm { display: block; font-size: 11.5px; font-weight: 600; color: #1c1d1f; }
  .legal-norm a { color: #1c1d1f; text-decoration: none;
                  border-bottom: 1px solid #c9ccd1; }
  .legal-sum { display: block; font-size: 11px; color: #3a3d42;
               margin-top: 3px; line-height: 1.5; }

  /* ---------- Cierre: invitación a implementar con KPC ---------- */
  .close-eyebrow { font-size: 11px; letter-spacing: .4px; text-transform: uppercase;
                   color: #6b6f76; font-weight: 600; }
  .close-h { margin-top: 6px; }
  .close-lead { color: #3a3d42; font-size: 12.5px; margin-top: 14px; max-width: 64ch; }
  .close-card { margin-top: 24px; border: 1px solid #e6e6e8; border-radius: 10px;
                padding: 20px 22px; background: #fafafa; }
  .close-card-h { font-size: 10px; letter-spacing: .4px; text-transform: uppercase;
                  color: #6b6f76; font-weight: 600; }
  ul.close-list { list-style: none; margin-top: 12px; }
  ul.close-list li { position: relative; padding-left: 22px; color: #3a3d42;
                     font-size: 12px; line-height: 1.5; margin-top: 10px; }
  ul.close-list li:first-child { margin-top: 0; }
  ul.close-list li::before { content: ""; position: absolute; left: 0; top: 6px;
                             width: 8px; height: 8px; border-radius: 999px;
                             background: #1c1d1f; }
  ul.close-list li strong { color: #1c1d1f; font-weight: 600; }
  .close-cta { display: inline-block; margin-top: 26px; background: #1c1d1f;
               color: #fff; text-decoration: none; font-size: 12.5px; font-weight: 600;
               padding: 12px 26px; border-radius: 999px; }
  .close-note { margin-top: 16px; font-size: 11px; color: #6b6f76;
                max-width: 64ch; line-height: 1.5; }
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

function legalSection(refs: PdfLegalRef[]): string {
  if (refs.length === 0) return "";
  const items = refs
    .map((r) => {
      const norm = r.url
        ? `<a href="${escapeHtml(r.url)}">${escapeHtml(r.norm)}</a>`
        : escapeHtml(r.norm);
      return `
        <li>
          <span class="legal-norm">${norm}</span>
          <span class="legal-sum">${escapeHtml(r.summary)}</span>
        </li>`;
    })
    .join("");
  return `
    <p class="sec">Fundamento legal</p>
    <p class="legal-note">Esta brecha representa un incumplimiento de las siguientes normas:</p>
    <ul class="legal">${items}</ul>`;
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
                <div class="act-ev"><strong>Cómo evidenciar el cumplimiento:</strong> ${escapeHtml(a.evidence)}</div>
              </div>
            </li>`,
            )
            .join("")}
        </ol>`
      : `<p class="noplan">${escapeHtml(b.objective)}</p>`;

  return `
  <section class="page breach">
    ${header(logo, `Brecha ${index} de ${total}`)}
    <p class="b-index">Brecha ${index}</p>
    <h2 class="serif b-title">${escapeHtml(b.description)}${severityTag(b, "tag tag-inline")}</h2>
    ${legalSection(b.legalRefs)}
    ${body}
  </section>`;
}

function closingPage(d: DiagnosisPdfData): string {
  const cta = d.contactUrl
    ? `<a class="close-cta" href="${escapeHtml(d.contactUrl)}">Conversemos por WhatsApp</a>`
    : "";
  return `
  <section class="page">
    ${header(d.logoDataUri, "Paso siguiente")}
    <p class="close-eyebrow">Paso siguiente · opcional</p>
    <h2 class="serif page-h close-h">Este diagnóstico es tuyo, gratis y sin compromiso</h2>
    <p class="close-lead">
      Todo lo que contiene este informe —el diagnóstico y la propuesta de mitigación
      de cada brecha— es gratuito y sin ninguna obligación. Puedes implementarlo por tu
      cuenta, a tu ritmo, siguiendo las acciones y los respaldos que aquí se detallan.
    </p>
    <p class="close-lead">
      Y si prefieres hacerlo con acompañamiento profesional, con la tranquilidad de que
      todo queda en regla, en Kromi Privacy Center podemos implementarlo contigo y dejar
      tu cumplimiento documentado de principio a fin.
    </p>
    <div class="close-card">
      <p class="close-card-h">Implementarlo con nosotros incluye</p>
      <ul class="close-list">
        <li><strong>Implementación guiada de cada mitigación</strong>, con los documentos y las configuraciones que exige la Ley 21.719.</li>
        <li><strong>Auditoría y verificación</strong> del cierre de todas las brechas detectadas en este informe.</li>
        <li><strong>Documentación de cumplimiento personalizada</strong>: qué datos personales maneja tu empresa y cómo cumple cada norma, caso a caso.</li>
        <li><strong>Constancia final de cumplimiento</strong> que respalda tu diligencia ante la Agencia de Protección de Datos y ante tus clientes.</li>
      </ul>
    </div>
    ${cta}
    <p class="close-note">
      Conversar no tiene costo ni compromiso: primero entendemos tu caso y, solo si
      decides avanzar, definimos juntos el alcance y el presupuesto.
    </p>
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
      .join("") +
    closingPage(d);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" /><style>${STYLES}</style></head><body>${pages}</body></html>`;
}
