import { describe, expect, it } from "vitest";
import { deriveClassification } from "../lib/diagnosis/derive";
import type { DiagnosisAnswers } from "../lib/diagnosis/snapshot";

const COMPLEXITY = [
  "sensitive_data",
  "international_transfers",
  "automated_decisions",
  "multi_site",
  "critical_providers",
  "low_maturity",
];

describe("deriveClassification", () => {
  it("deriva sizeTier desde S-001 (micro)", () => {
    const answers: DiagnosisAnswers = {
      screening: [{ nodeId: "S-001", value: "micro" }],
      deepDive: [],
    };
    expect(deriveClassification(answers).sizeTier).toBe("micro");
  });

  it("mapea tramos del cuestionario a SizeTier (mediana → small, grande → enterprise)", () => {
    const mediana: DiagnosisAnswers = { screening: [{ nodeId: "S-001", value: "mediana" }], deepDive: [] };
    const grande: DiagnosisAnswers = { screening: [{ nodeId: "S-001", value: "grande" }], deepDive: [] };
    expect(deriveClassification(mediana).sizeTier).toBe("small");
    expect(deriveClassification(grande).sizeTier).toBe("enterprise");
  });

  it("deriva sectorCode desde S-002 (salud → salud, financiero → fintech)", () => {
    const salud: DiagnosisAnswers = { screening: [{ nodeId: "S-002", value: "salud" }], deepDive: [] };
    const fin: DiagnosisAnswers = { screening: [{ nodeId: "S-002", value: "financiero" }], deepDive: [] };
    expect(deriveClassification(salud).sectorCode).toBe("salud");
    expect(deriveClassification(fin).sectorCode).toBe("fintech");
  });

  it("aplica defaults: sin S-001 → micro, sin S-002 → otro", () => {
    const empty: DiagnosisAnswers = { screening: [], deepDive: [] };
    const c = deriveClassification(empty);
    expect(c.sizeTier).toBe("micro");
    expect(c.sectorCode).toBe("otro");
  });

  it("S-002 multi: toma el primer valor con mapeo", () => {
    const multi: DiagnosisAnswers = {
      screening: [
        { nodeId: "S-002", value: "otro" },
        { nodeId: "S-002", value: "salud" },
      ],
      deepDive: [],
    };
    // 'otro' mapea a 'otro' (primer valor con mapeo) — determinista por orden.
    expect(deriveClassification(multi).sectorCode).toBe("otro");
  });

  it("factors: array de ComplexityFactor válidos y deduplicado", () => {
    const answers: DiagnosisAnswers = {
      screening: [{ nodeId: "S-001", value: "micro" }, { nodeId: "S-002", value: "salud" }],
      deepDive: [],
    };
    const { factors } = deriveClassification(answers);
    expect(Array.isArray(factors)).toBe(true);
    expect(new Set(factors).size).toBe(factors.length); // sin duplicados
    for (const f of factors) expect(COMPLEXITY).toContain(f);
  });
});
