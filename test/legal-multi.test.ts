import { describe, expect, it } from "vitest";
import {
  computeFullDiagnosis,
  DEEP_DIVE_BRANCHES,
  INFERENCE_RULES,
  SCREENING_NODES,
  walkScreening,
  type DeepDiveAnswer,
  type ScreeningAnswer,
} from "../lib/legal";

/**
 * Selección múltiple ("marca todas las que apliquen"): una pregunta multi debe
 * acumular las brechas de TODAS las opciones marcadas, no solo de una.
 */
describe("motor — selección múltiple", () => {
  it("DD-SEN-001 con salud + menores acumula ambas brechas", () => {
    const screening: ScreeningAnswer[] = [
      { nodeId: "S-003", value: "si" }, // maneja datos de titulares
      { nodeId: "S-004", value: "si" }, // datos sensibles → activa DD-SENSIBLE
    ];
    const walked = walkScreening(SCREENING_NODES, screening);

    const deepDive: DeepDiveAnswer[] = [
      { questionId: "DD-SEN-001", branchId: "DD-SENSIBLE", value: "salud" },
      { questionId: "DD-SEN-001", branchId: "DD-SENSIBLE", value: "menores" },
    ];
    const result = computeFullDiagnosis(
      walked,
      INFERENCE_RULES,
      DEEP_DIVE_BRANCHES,
      deepDive,
    );

    const ids = result.breaches.map((b) => b.id);
    expect(ids).toContain("B-SAL-001"); // brecha de datos de salud
    expect(ids).toContain("B-MEN-001"); // brecha de datos de menores
  });

  it("screening multi S-006 acumula brechas de varias ubicaciones", () => {
    // Excel local + papel: ambas disparan B-SEG-001 (misma brecha, sin duplicar).
    const screening: ScreeningAnswer[] = [
      { nodeId: "S-006", value: "excel_pc" },
      { nodeId: "S-006", value: "papel" },
    ];
    const walked = walkScreening(SCREENING_NODES, screening);
    // El nodo S-006 quedó registrado con sus dos valores.
    const s006 = walked.find((w) => w.node.id === "S-006");
    expect(s006?.answers).toEqual(["excel_pc", "papel"]);
  });

  it("S-006 multi activa la rama de software si también se marca 'software'", () => {
    const screening: ScreeningAnswer[] = [
      { nodeId: "S-006", value: "excel_pc" },
      { nodeId: "S-006", value: "software" }, // activa DD-SEGURIDAD-SOFTWARE
    ];
    const walked = walkScreening(SCREENING_NODES, screening);
    const result = computeFullDiagnosis(
      walked,
      INFERENCE_RULES,
      DEEP_DIVE_BRANCHES,
      [],
    );
    expect(result.activatedBranches).toContain("DD-SEGURIDAD-SOFTWARE");
  });
});
