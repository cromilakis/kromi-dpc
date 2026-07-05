/**
 * Data estructurada de la landing (códigos y claves i18n) — los textos viven
 * en messages/es.json bajo el namespace "landing" (regla i18n del proyecto).
 * Fuente: design/prototype.dc.html (sección isLanding) + prototype-analysis.md §5.
 */

/** Dominio del marco DPC: clave i18n (landing.domains.items) + código canónico. */
export interface DomainRef {
  key: string;
  code: string;
}

/** 8 dominios alineados a los principios del Art. 3, Ley 21.719. */
export const PRINCIPLE_DOMAINS: DomainRef[] = [
  { key: "lic", code: "DPC-LIC" },
  { key: "fin", code: "DPC-FIN" },
  { key: "pro", code: "DPC-PRO" },
  { key: "cal", code: "DPC-CAL" },
  { key: "res", code: "DPC-RES" },
  { key: "seg", code: "DPC-SEG" },
  { key: "tra", code: "DPC-TRA" },
  { key: "con", code: "DPC-CON" },
];

/** 6 dominios complementarios (obligaciones operativas). */
export const COMPLEMENTARY_DOMAINS: DomainRef[] = [
  { key: "inv", code: "DPC-INV" },
  { key: "der", code: "DPC-DER" },
  { key: "sen", code: "DPC-SEN" },
  { key: "ter", code: "DPC-TER" },
  { key: "inc", code: "DPC-INC" },
  { key: "eia", code: "DPC-EIA" },
];

/**
 * Sanciones de la Ley 21.719 (banda "Lo que está en juego").
 * El color y el nivel son semánticos y usan tokens del design system:
 * lead (leve) / warning-yellow (grave) / danger-red (gravísima). `level`
 * (1→3) alimenta el medidor de barras ascendentes que comunica la escala
 * de gravedad de la menos a la más grave.
 */
export interface StakeRef {
  key: string;
  colorClass: string;
  level: number; // 1..3
}

export const STAKES: StakeRef[] = [
  { key: "minor", colorClass: "bg-lead", level: 1 },
  { key: "serious", colorClass: "bg-warning-yellow", level: 2 },
  { key: "severe", colorClass: "bg-danger-red", level: 3 },
];

/** Ciclo de servicio: 4 fases (landing.cycle.phases). */
export const CYCLE_PHASES = [
  "diagnosis",
  "proposal",
  "certification",
  "revalidation",
] as const;

/** Documentos del expediente de cumplimiento (landing.deliverable.dossier.docs). */
export const DOSSIER_DOCS = [
  "rat",
  "policies",
  "arcop",
  "incidents",
  "inventory",
  "evidence",
  "certificate",
] as const;

/** Cards de acompañamiento consultor (landing.support.items). */
export const SUPPORT_ITEMS = [
  "assigned",
  "advisory",
  "implementation",
  "followUp",
] as const;

/** Wordmarks del ecosistema regulatorio (landing.agencies.items). */
export const AGENCIES = [
  "apdp",
  "anci",
  "sernac",
  "cmf",
  "dt",
  "subtel",
] as const;

/** Anchors de la navegación de la landing (landing.nav). */
export const NAV_LINKS = [
  { key: "domains", href: "#dominios" },
  { key: "cycle", href: "#ciclo" },
  { key: "model", href: "#modelo" },
  { key: "certification", href: "#certificacion" },
] as const;

/**
 * Columnas del footer (landing.footer.columns). Solo "Panel del consultor"
 * navega (→ /login, acceso discreto según RFC §11); el resto son entradas
 * informativas sin destino todavía (fiel al prototipo).
 */
export interface FooterColumnRef {
  key: string;
  links: { key: string; href?: string; external?: boolean }[];
}

/** Textos oficiales en Ley Chile (BCN), verificados por idNorma. */
const LEYCHILE = "https://www.bcn.cl/leychile/navegar?idNorma=";

export const FOOTER_COLUMNS: FooterColumnRef[] = [
  {
    key: "framework",
    links: [
      { key: "domains", href: "#dominios" },
      { key: "taxonomy" },
      { key: "risks" },
      { key: "verticals" },
    ],
  },
  {
    key: "platform",
    links: [
      { key: "consultantPanel", href: "/login" },
      { key: "complexityScore" },
      { key: "evidence" },
      { key: "certification" },
    ],
  },
  {
    key: "legal",
    links: [
      { key: "law21719", href: `${LEYCHILE}1209272`, external: true },
      { key: "law21663", href: `${LEYCHILE}1202434`, external: true },
      { key: "law19496", href: `${LEYCHILE}61438`, external: true },
      { key: "laborCode", href: `${LEYCHILE}207436`, external: true },
    ],
  },
];

/**
 * Preguntas frecuentes (landing.faq.items). Cierran objeciones del usuario no
 * técnico antes de la sección de precios. Nota: "obligation" hace una afirmación
 * legal — su redacción requiere validación con el abogado.
 */
export const FAQ_ITEMS = [
  "obligation",
  "duration",
  "cost",
  "skills",
  "deliverable",
] as const;

/** Tiers de precios base (landing.pricing.tiers) — ancla honesta "desde". */
export const PRICING_TIERS = [
  { key: "micro", hasBasePrice: true, inverted: false },
  { key: "small", hasBasePrice: true, inverted: false },
  { key: "enterprise", hasBasePrice: false, inverted: true },
] as const;
