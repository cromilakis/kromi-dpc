import { describe, expect, it } from "vitest";
import {
  computeDiagnosisEligibility,
  type EligibilityBreach,
} from "@/lib/certificates/diagnosis-eligibility.server";

/**
 * Elegibilidad del certificado sobre el modelo nuevo (sub-proyecto #7):
 * cero brechas abiertas en el diagnóstico activo.
 */

const breach = (
  code: string,
  severity: string,
  resolutionStatus: string,
): EligibilityBreach => ({
  breachCode: code,
  areaLabel: `Área ${code}`,
  severity,
  resolutionStatus,
});

describe("computeDiagnosisEligibility", () => {
  it("sin diagnóstico → no elegible con gap no_diagnosis", () => {
    const result = computeDiagnosisEligibility(null);
    expect(result.eligible).toBe(false);
    expect(result.gaps).toEqual([{ kind: "no_diagnosis" }]);
  });

  it("diagnóstico limpio (0 brechas) → elegible al 100%", () => {
    const result = computeDiagnosisEligibility([]);
    expect(result.eligible).toBe(true);
    expect(result.resolvedPct).toBe(100);
    expect(result.gaps).toEqual([]);
  });

  it("todas resueltas → elegible", () => {
    const result = computeDiagnosisEligibility([
      breach("B-GOB-001", "alto", "resolved"),
      breach("B-SEG-001", "critico", "resolved"),
    ]);
    expect(result.eligible).toBe(true);
    expect(result.resolved).toBe(2);
    expect(result.open).toBe(0);
    expect(result.resolvedPct).toBe(100);
  });

  it("una brecha abierta bloquea la emisión y aparece en el gap", () => {
    const result = computeDiagnosisEligibility([
      breach("B-GOB-001", "alto", "resolved"),
      breach("B-SEG-001", "critico", "open"),
      breach("B-CAP-001", "medio", "open"),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.open).toBe(2);
    expect(result.openCritical).toBe(1);
    expect(result.resolvedPct).toBe(33);
    expect(result.gaps).toHaveLength(1);
    const gap = result.gaps[0]!;
    if (gap.kind !== "open_breaches") throw new Error("gap inesperado");
    expect(gap.open.map((b) => b.breachCode)).toEqual(["B-SEG-001", "B-CAP-001"]);
  });

  it("cualquier estado distinto de 'resolved' cuenta como abierta", () => {
    const result = computeDiagnosisEligibility([breach("B-DER-001", "alto", "open")]);
    expect(result.eligible).toBe(false);
    expect(result.open).toBe(1);
  });
});
