import "server-only";

/**
 * Regla de elegibilidad de certificación DPC — lib PURA (sin I/O) para poder
 * testearla en aislamiento (test/certificates.test.ts). Solo servidor: los
 * umbrales de emisión son criterio metodológico interno (RFC §11) y no deben
 * viajar en el bundle del cliente.
 *
 * Reglas (spec certificados):
 * 1. Umbral de cumplimiento: % de controles `compliant` del assessment ACTIVO
 *    (el ciclo más reciente de la empresa) ≥ COMPLIANCE_THRESHOLD_PCT.
 *    El denominador es el TOTAL de controles del assessment (los `pending`
 *    cuentan en contra: un control sin evaluar no puede certificar).
 * 2. Regla dura — PENDIENTE DE VALIDACIÓN DEL EQUIPO: cero controles
 *    `non_compliant` en los dominios críticos DPC-SEG (seguridad) y DPC-INC
 *    (incidentes), aunque el % global supere el umbral.
 *
 * La comparación del umbral usa aritmética entera (compliant*100 >= pct*total)
 * para evitar errores de coma flotante en el borde exacto (p. ej. 4/5 = 80%).
 */

/** Umbral de emisión documentado: 80% de controles en `compliant`. */
export const COMPLIANCE_THRESHOLD_PCT = 80;

/** Dominios con regla dura de cero `non_compliant` (pendiente validación del equipo). */
export const CRITICAL_DOMAIN_CODES = ["DPC-SEG", "DPC-INC"] as const;

/** Espejo de public.control_result (lib/supabase/types.ts). */
export type ControlResult = "pending" | "compliant" | "partial" | "non_compliant";

export interface EligibilityControl {
  /** Código de la ficha de control (p. ej. "DPC-SEG-001"). */
  controlCode: string;
  /** Código del dominio dueño del control (p. ej. "DPC-SEG"). */
  domainCode: string;
  status: ControlResult;
}

/** Brechas que explican por qué NO se puede emitir (lista "qué falta" de la UI). */
export type EligibilityGap =
  | { kind: "no_assessment" }
  | { kind: "no_evaluated_controls" }
  | {
      kind: "below_threshold";
      compliancePct: number;
      thresholdPct: number;
      /** Controles `compliant` adicionales necesarios para alcanzar el umbral. */
      missingCompliantCount: number;
    }
  | { kind: "critical_non_compliant"; domainCode: string; controlCodes: string[] };

export interface EligibilityResult {
  eligible: boolean;
  totalControls: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  pending: number;
  /** % de cumplimiento global redondeado (solo display; la regla usa enteros). */
  compliancePct: number;
  thresholdPct: number;
  gaps: EligibilityGap[];
}

/**
 * Calcula la elegibilidad de certificación.
 * `controls === null` significa "la empresa no tiene ningún assessment".
 */
export function computeEligibility(
  controls: readonly EligibilityControl[] | null,
  thresholdPct: number = COMPLIANCE_THRESHOLD_PCT,
): EligibilityResult {
  const base: Omit<EligibilityResult, "eligible" | "gaps"> = {
    totalControls: 0,
    compliant: 0,
    partial: 0,
    nonCompliant: 0,
    pending: 0,
    compliancePct: 0,
    thresholdPct,
  };

  if (controls === null) {
    return { ...base, eligible: false, gaps: [{ kind: "no_assessment" }] };
  }
  if (controls.length === 0) {
    return { ...base, eligible: false, gaps: [{ kind: "no_evaluated_controls" }] };
  }

  const total = controls.length;
  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;
  let pending = 0;
  // Dominio crítico → códigos de control en `non_compliant` (orden de entrada).
  const criticalGaps = new Map<string, string[]>();

  for (const control of controls) {
    switch (control.status) {
      case "compliant":
        compliant += 1;
        break;
      case "partial":
        partial += 1;
        break;
      case "non_compliant": {
        nonCompliant += 1;
        const critical = CRITICAL_DOMAIN_CODES.find(
          (code) => code === control.domainCode,
        );
        if (critical) {
          const codes = criticalGaps.get(critical) ?? [];
          codes.push(control.controlCode);
          criticalGaps.set(critical, codes);
        }
        break;
      }
      default:
        pending += 1;
        break;
    }
  }

  const gaps: EligibilityGap[] = [];

  // Regla 1 — umbral de cumplimiento (aritmética entera, sin coma flotante).
  const meetsThreshold = compliant * 100 >= thresholdPct * total;
  const compliancePct = Math.round((compliant / total) * 100);
  if (!meetsThreshold) {
    const requiredCompliant = Math.ceil((thresholdPct * total) / 100);
    gaps.push({
      kind: "below_threshold",
      compliancePct,
      thresholdPct,
      missingCompliantCount: requiredCompliant - compliant,
    });
  }

  // Regla 2 — regla dura de dominios críticos (orden fijo de CRITICAL_DOMAIN_CODES).
  for (const domainCode of CRITICAL_DOMAIN_CODES) {
    const controlCodes = criticalGaps.get(domainCode);
    if (controlCodes && controlCodes.length > 0) {
      gaps.push({ kind: "critical_non_compliant", domainCode, controlCodes });
    }
  }

  return {
    totalControls: total,
    compliant,
    partial,
    nonCompliant,
    pending,
    compliancePct,
    thresholdPct,
    eligible: gaps.length === 0,
    gaps,
  };
}
