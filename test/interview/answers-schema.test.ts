import { describe, expect, it } from "vitest";
import { diagnosisAnswersSchema } from "@/lib/interview/answers-schema";

/**
 * `applicability` (Tarea 4) es opcional: las sesiones existentes en la base
 * no lo traen y deben seguir parseando sin cambios (retrocompatibilidad,
 * ver Global Constraints del plan). Este test cubre ambos casos.
 */
describe("diagnosisAnswersSchema", () => {
  it("parsea SIN el campo applicability (sesiones existentes)", () => {
    const result = diagnosisAnswersSchema.safeParse({
      rat: [],
      compliance: { "DPC-LIC-001": ["yes", "partial"] },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.applicability).toBeUndefined();
    }
  });

  it("parsea CON el campo applicability (overrides del consultor)", () => {
    const result = diagnosisAnswersSchema.safeParse({
      rat: [],
      compliance: {},
      applicability: { "DPC-SEN-001": true, "DPC-TER-002": false },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.applicability).toEqual({
        "DPC-SEN-001": true,
        "DPC-TER-002": false,
      });
    }
  });

  it("rechaza applicability con valores no booleanos", () => {
    const result = diagnosisAnswersSchema.safeParse({
      rat: [],
      compliance: {},
      applicability: { "DPC-SEN-001": "yes" },
    });
    expect(result.success).toBe(false);
  });
});
