import { describe, it, expect } from "vitest";
import { buildGaps } from "@/lib/interview/build-gaps";

const controls = [
  { code: "DPC-CAL-001", name: "Calidad", criteria: ["c0", "c1", "c2", "c3"] },
  { code: "DPC-CON-001", name: "Confidencialidad", criteria: ["d0", "d1"] },
];

describe("buildGaps", () => {
  it("emite gap por criterio no/partial/flagged e ignora yes/unknown/ausente", () => {
    const gaps = buildGaps(
      {
        "DPC-CAL-001": ["no", "partial", "yes", "flagged"],
        "DPC-CON-001": ["yes", "yes"],
      },
      controls,
    );
    expect(gaps.map((g) => [g.controlCode, g.criterionIndex, g.gapType])).toEqual([
      ["DPC-CAL-001", 0, "no"],
      ["DPC-CAL-001", 1, "partial"],
      ["DPC-CAL-001", 3, "flagged"],
    ]);
    expect(gaps[0].criterion).toBe("c0");
    expect(gaps[0].controlName).toBe("Calidad");
  });

  it("sin gaps cuando todo es yes/unknown", () => {
    expect(buildGaps({ "DPC-CAL-001": ["yes", "unknown"] }, controls)).toEqual([]);
  });

  it("control sin respuestas registradas no genera gaps", () => {
    expect(buildGaps({}, controls)).toEqual([]);
  });
});
