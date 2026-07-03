import "server-only";

import type { ComplexityFactor, SizeTier } from "./schema";

/**
 * DPC Complexity Score del ALTA DE EMPRESA — SOLO SERVIDOR (doctrina D7,
 * misma frontera que lib/self-assessment/scoring.server.ts): los pesos finos
 * (puntos por factor, base por tamaño, bono de volumen y umbrales de tramo)
 * no viajan en el bundle del cliente; `import "server-only"` rompe el build
 * si un módulo cliente llega a importarlos. Por eso el wizard NO muestra un
 * score en vivo: el número se calcula recién en createCompany.
 *
 * Modelo (prototipo isRegistro + RFC §14.3): score = round(base × multiplier
 * del rubro), donde base = puntos estructurales por tamaño + puntos por
 * factor. El multiplicador sectorial NO se duplica acá: la fuente de verdad
 * es sectors.complexity_multiplier (la action lo lee de la base).
 *
 * Coherencia con el prototipo: su caso prellenado (Clínica Andes — grande,
 * salud ×1.7, datos sensibles + volumen, multi-sede, proveedores críticos)
 * suma exactamente los 52 pts base del mock → 52 × 1.7 = 88.4 → 88, el score
 * que muestra la card oscura del registro. Asegurado por test
 * (test/companies.test.ts).
 *
 * REGLA DE NEGOCIO (RFC §11/§14.3): el score es de USO INTERNO — se muestra
 * solo en la plataforma del equipo consultor, nunca al cliente/prospecto.
 */

/**
 * Puntos por factor — mismos pesos que el autoevaluador
 * (lib/self-assessment/scoring.server.ts) para que lead y alta cuenten la
 * misma historia; low_maturity es exclusivo del alta (RFC §14.3 "madurez
 * inicial: partir de cero implica mayor esfuerzo"), calibrado como
 * critical_providers (6 pts, prototipo).
 */
const FACTOR_POINTS: Record<ComplexityFactor, number> = {
  sensitive_data: 12, // prototipo: "Tratamiento de datos sensibles"
  international_transfers: 7, // RFC §14.3 (DPC-TER-002)
  automated_decisions: 9, // RFC §14.3 (DPC-EIA-001/002, EIPD)
  multi_site: 5, // prototipo: "Dispersión geográfica y sucursales"
  critical_providers: 6, // prototipo: "Proveedores críticos / encargados"
  low_maturity: 6, // RFC §14.3: madurez inicial (sin equivalente en el prototipo)
};

/**
 * Puntos estructurales por tamaño — proxy de los factores que el prototipo
 * puntúa siempre ("Actividades de tratamiento" 8 + "Sistemas e
 * infraestructura" 8 + "Canales de recepción" 4 = 20 en el caso pleno).
 */
const SIZE_BASE_POINTS: Record<SizeTier, number> = {
  micro: 8,
  small: 14,
  enterprise: 20,
};

/**
 * "Volumen de datos sensibles procesados" (9 pts, prototipo): aplica cuando
 * trata datos sensibles Y es mediana/grande (proxy de volumen alto).
 */
const SENSITIVE_VOLUME_BONUS = 9;

/** El score es un índice 0-100 (el prototipo topea en 94; se acota explícito). */
const SCORE_CAP = 100;

/** Tramo interno del score — umbrales exactos del prototipo (tier()). */
export type ScoreTier = "low" | "medium" | "high" | "critical";

export interface CompanyScoreInput {
  sizeTier: SizeTier;
  /** sectors.complexity_multiplier leído de la base (1.1–1.8 en el seed). */
  sectorMultiplier: number;
  factors: readonly ComplexityFactor[];
}

/** Detalle INTERNO del Complexity Score de una empresa. */
export interface CompanyScore {
  basePoints: number;
  multiplier: number;
  score: number;
  scoreTier: ScoreTier;
}

/** Umbrales del prototipo: ≥85 Crítico / ≥70 Alto / ≥50 Medio / <50 Bajo. */
export function scoreTierOf(score: number): ScoreTier {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

/** Score interno de la empresa: (base por tamaño + factores) × multiplicador. */
export function computeCompanyScore(input: CompanyScoreInput): CompanyScore {
  const selected = new Set<ComplexityFactor>(input.factors);

  let basePoints = SIZE_BASE_POINTS[input.sizeTier];
  for (const factor of selected) basePoints += FACTOR_POINTS[factor];
  if (selected.has("sensitive_data") && input.sizeTier === "enterprise") {
    basePoints += SENSITIVE_VOLUME_BONUS;
  }

  const score = Math.min(
    SCORE_CAP,
    Math.round(basePoints * input.sectorMultiplier),
  );
  return {
    basePoints,
    multiplier: input.sectorMultiplier,
    score,
    scoreTier: scoreTierOf(score),
  };
}
