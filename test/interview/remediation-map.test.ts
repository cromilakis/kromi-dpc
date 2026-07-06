import { describe, it, expect } from "vitest";
import {
  buildRemediationProposal,
  type RemediationGap,
} from "@/lib/interview/remediation-map";

function gap(over: Partial<RemediationGap> = {}): RemediationGap {
  return {
    controlCode: "DPC-FIN-002",
    controlName: "Retención",
    criterionIndex: 0,
    criterion: "Existe una matriz de plazos de retención por categoría de dato.",
    gapType: "no",
    ...over,
  };
}

describe("buildRemediationProposal", () => {
  it("mapea un gap a la acción determinista del criterio", () => {
    const [item] = buildRemediationProposal([gap()]);
    expect(item.controlCode).toBe("DPC-FIN-002");
    expect(item.criterionIndex).toBe(0);
    expect(item.action).toContain("matriz de plazos de retención");
    expect(item.rationale).toContain("Existe una matriz");
  });

  it("cada acción trae un ejemplo concreto", () => {
    const [item] = buildRemediationProposal([gap()]);
    expect(item.example).toMatch(/^Ej\.:/);
    expect(item.example.length).toBeGreaterThan(0);
  });

  it("prioridad por regla: 'no' -> alta; 'partial'/'flagged' -> media", () => {
    expect(buildRemediationProposal([gap({ gapType: "no" })])[0].priority).toBe("alta");
    expect(buildRemediationProposal([gap({ gapType: "partial" })])[0].priority).toBe("media");
    expect(buildRemediationProposal([gap({ gapType: "flagged" })])[0].priority).toBe("media");
  });

  it("plazo por regla: alta -> 2 semanas, media -> 4", () => {
    expect(buildRemediationProposal([gap({ gapType: "no" })])[0].suggestedDueWeeks).toBe(2);
    expect(buildRemediationProposal([gap({ gapType: "partial" })])[0].suggestedDueWeeks).toBe(4);
  });

  it("esfuerzo default 'medio' (editable por el consultor)", () => {
    expect(buildRemediationProposal([gap()])[0].effort).toBe("medio");
  });

  it("omite un gap sin acción mapeada (control o índice inexistente)", () => {
    expect(buildRemediationProposal([gap({ controlCode: "DPC-XXX-999" })])).toHaveLength(0);
    expect(buildRemediationProposal([gap({ criterionIndex: 99 })])).toHaveLength(0);
  });

  it("sin gaps -> propuesta vacía", () => {
    expect(buildRemediationProposal([])).toEqual([]);
  });

  it("cada control mapeado tiene 4 acciones alineadas a sus 4 criterios", () => {
    // Muestreo de controles baseline: los 4 índices deben resolver a una acción.
    for (const code of ["DPC-LIC-001", "DPC-SEG-002", "DPC-INC-002", "DPC-EIA-002"]) {
      for (let i = 0; i < 4; i++) {
        const [item] = buildRemediationProposal([
          gap({ controlCode: code, criterionIndex: i, criterion: "x" }),
        ]);
        expect(item, `${code}#${i}`).toBeDefined();
        expect(item.action.length).toBeGreaterThan(0);
        expect(item.example.length).toBeGreaterThan(0);
      }
    }
  });
});
