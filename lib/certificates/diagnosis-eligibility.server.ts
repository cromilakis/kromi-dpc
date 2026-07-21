import "server-only";

/**
 * Elegibilidad de certificación DPC sobre el MODELO NUEVO (sub-proyecto #7):
 * el diagnóstico persistido (company_diagnoses + diagnosis_breaches) es la
 * fuente de verdad del cumplimiento. Lib PURA (sin I/O) para testearla en
 * aislamiento; solo servidor (criterio metodológico interno).
 *
 * Regla (decisión de producto 2026-07-21): una empresa es elegible cuando su
 * diagnóstico activo tiene CERO brechas abiertas — todas resueltas por el
 * cliente y validadas por el consultor al emitir (human-in-the-loop: la
 * emisión sigue siendo un acto manual del consultor). Un diagnóstico sin
 * brechas es elegible de inmediato (diagnóstico limpio).
 *
 * Reemplaza a eligibility.server.ts (umbral 80% sobre assessment_controls),
 * que queda para remoción en el sub-proyecto #8.
 */

export interface EligibilityBreach {
  breachCode: string;
  areaLabel: string;
  severity: string;
  resolutionStatus: string;
}

export type DiagnosisEligibilityGap =
  | { kind: "no_diagnosis" }
  | {
      kind: "open_breaches";
      open: readonly Pick<EligibilityBreach, "breachCode" | "areaLabel" | "severity">[];
    };

export interface DiagnosisEligibilityResult {
  eligible: boolean;
  totalBreaches: number;
  resolved: number;
  open: number;
  /** Brechas abiertas con severidad crítica (subconjunto de `open`). */
  openCritical: number;
  /** % de brechas resueltas, redondeado (solo display; 100 si no hay brechas). */
  resolvedPct: number;
  gaps: DiagnosisEligibilityGap[];
}

/**
 * Calcula la elegibilidad. `breaches === null` significa "la empresa no tiene
 * ningún diagnóstico activo".
 */
export function computeDiagnosisEligibility(
  breaches: readonly EligibilityBreach[] | null,
): DiagnosisEligibilityResult {
  if (breaches === null) {
    return {
      eligible: false,
      totalBreaches: 0,
      resolved: 0,
      open: 0,
      openCritical: 0,
      resolvedPct: 0,
      gaps: [{ kind: "no_diagnosis" }],
    };
  }

  const openBreaches = breaches.filter((b) => b.resolutionStatus !== "resolved");
  const resolved = breaches.length - openBreaches.length;
  const resolvedPct =
    breaches.length === 0 ? 100 : Math.round((resolved / breaches.length) * 100);

  const gaps: DiagnosisEligibilityGap[] =
    openBreaches.length > 0
      ? [
          {
            kind: "open_breaches",
            open: openBreaches.map((b) => ({
              breachCode: b.breachCode,
              areaLabel: b.areaLabel,
              severity: b.severity,
            })),
          },
        ]
      : [];

  return {
    eligible: gaps.length === 0,
    totalBreaches: breaches.length,
    resolved,
    open: openBreaches.length,
    openCritical: openBreaches.filter((b) => b.severity === "critico").length,
    resolvedPct,
    gaps,
  };
}
