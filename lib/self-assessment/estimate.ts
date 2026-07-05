/**
 * Lógica PURA y PÚBLICA de estimación del autoevaluador (/self-assessment).
 *
 * Réplica del cotizador público del prototipo (design/prototype.dc.html,
 * estado isCotizador): tamaño → tramo/orientación de valor ("Desde X UF +
 * IVA" o "Bajo cotización"), chips de factores de ajuste y nota contextual.
 * RFC §13 / §14.2.
 *
 * FRONTERA CLIENTE/SERVIDOR (revisión adversarial, D7): este módulo es
 * importable por el cliente (wizard) y SOLO contiene lo que el prospecto ve.
 * Qué se acepta exponer: el tramo por tamaño (Ley 20.416), la orientación de
 * valor por tramo y qué rubros se consideran regulados — todo información
 * pública del RFC (§13/§14.2). Los pesos finos del Complexity Score interno
 * (puntos por factor, multiplicadores, umbrales) viven en scoring.server.ts
 * (`import "server-only"`) y solo los usa la server action, que recalcula
 * todo en servidor.
 *
 * REGLA DE NEGOCIO (RFC §11 / §14.3): el Complexity Score numérico es de USO
 * INTERNO y jamás se muestra al prospecto.
 *
 * Sin dependencias ni I/O: testeable en aislamiento (test/self-assessment.test.ts).
 */

/** Tramos de tamaño según la clasificación chilena (Ley 20.416). */
export const SIZE_TIERS = ["micro", "small", "enterprise"] as const;
export type SizeTier = (typeof SIZE_TIERS)[number];

/** Rubros del prototipo (this.RUBROS, 7 opciones). */
export const SECTOR_CODES = [
  "retail",
  "fintech",
  "salud",
  "b2b",
  "telco",
  "startup",
  "estado",
] as const;
export type SectorCode = (typeof SECTOR_CODES)[number];

/**
 * Rubros con régimen sectorial reforzado → chip público "Rubro regulado"
 * (RFC §14.3: Salud/Ley 20.584, Fintech/CMF, servicios esenciales/ANCI).
 * En el cotizador del prototipo eran salud/fintech/esenciales; con los 7
 * rubros, "servicios esenciales" se mapea a telco (SUBTEL/Ley 21.663) y
 * proveedor del Estado (ANCI/Ley 21.663).
 */
export const REGULATED_SECTORS: readonly SectorCode[] = [
  "fintech",
  "salud",
  "telco",
  "estado",
];

/**
 * Factores de riesgo que responde el prospecto (toggles Sí/No).
 * Unión de los cotToggles del prototipo + factores del RFC §14.3
 * (multi-sede, proveedores/encargados críticos).
 */
export const RISK_FACTORS = [
  "sensitive_data",
  "international_transfers",
  "automated_decisions",
  "multi_site",
  "critical_providers",
] as const;
export type RiskFactor = (typeof RISK_FACTORS)[number];

/**
 * Factores de AJUSTE detectados (chips públicos): los factores de riesgo
 * declarados + el pseudo-factor "rubro regulado" derivado del sector.
 * Orden estable = orden de chips del cotizador del prototipo, extendido.
 */
export const ADJUSTMENT_FACTORS = [
  "sensitive_data",
  "regulated_sector",
  "international_transfers",
  "automated_decisions",
  "multi_site",
  "critical_providers",
] as const;
export type AdjustmentFactor = (typeof ADJUSTMENT_FACTORS)[number];

export interface EstimateInput {
  sizeTier: SizeTier;
  sectorCode: SectorCode;
  /** Factores respondidos "Sí" (duplicados se ignoran). */
  riskFactors: readonly RiskFactor[];
}

export interface EstimateResult {
  sizeTier: SizeTier;
  /** Mediana/grande → tramo Enterprise, valor bajo cotización (RFC §14.2). */
  isEnterprise: boolean;
  /** Chips públicos de factores de ajuste, en orden estable. */
  adjustmentFactors: AdjustmentFactor[];
  hasAdjustments: boolean;
  /** Variante de la nota contextual del prototipo (cotNote). */
  noteKey: "enterprise" | "withFactors" | "base";
}

/**
 * Estimación PÚBLICA a partir de las respuestas del cuestionario: tramo,
 * chips de ajuste y nota. El score interno se calcula aparte, solo en
 * servidor (lib/self-assessment/scoring.server.ts).
 */
export function estimate(input: EstimateInput): EstimateResult {
  const { sizeTier, sectorCode } = input;
  const selected = new Set<RiskFactor>(input.riskFactors);

  const adjustmentFactors = ADJUSTMENT_FACTORS.filter((factor) =>
    factor === "regulated_sector"
      ? REGULATED_SECTORS.includes(sectorCode)
      : selected.has(factor),
  );
  const isEnterprise = sizeTier === "enterprise";
  const hasAdjustments = adjustmentFactors.length > 0;
  const noteKey = isEnterprise
    ? "enterprise"
    : hasAdjustments
      ? "withFactors"
      : "base";

  return { sizeTier, isEnterprise, adjustmentFactors, hasAdjustments, noteKey };
}

// ---------------------------------------------------------------------------
// Contrato de persistencia (tabla self_assessments — migración
// 20260702100100_operations.sql). La columna risk_factors documenta tokens en
// español; la conversión se hace en esta frontera para que el código use
// identificadores en inglés (estándar kromi).
// ---------------------------------------------------------------------------

/** Tokens de la columna self_assessments.risk_factors (ver migración). */
export const DB_RISK_FACTOR_TOKENS: Record<AdjustmentFactor, string> = {
  sensitive_data: "datos_sensibles",
  regulated_sector: "rubro_regulado",
  international_transfers: "transferencias_internacionales",
  automated_decisions: "decisiones_automatizadas",
  multi_site: "multi_sede",
  critical_providers: "proveedores_criticos",
};

/**
 * Valores de self_assessments.estimated_tier (la migración ejemplifica
 * 'Desde 5 UF + IVA' / 'Bajo cotización'). Orientación de valor, NO el score.
 * Fuente única de precios: debe coincidir con selfAssessment.result.prices
 * de messages/es.json (asegurado por test).
 */
export const DB_ESTIMATED_TIER: Record<SizeTier, string> = {
  micro: "Desde 5 UF + IVA",
  small: "Desde 15 UF + IVA",
  enterprise: "Bajo cotización",
};
