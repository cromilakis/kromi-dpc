import { describe, it, expect } from "vitest";
import { buildComplianceQuestions } from "@/lib/interview/questions";

const controls = [
  {
    code: "DPC-LIC-001",
    name: "Bases de licitud",
    domain_id: "d1",
    verification_criteria: ["¿Existe registro de bases?", "¿Se recoge consentimiento?"],
    appliesWhen: null,
  },
  {
    code: "DPC-XXX-000",
    name: "Sin criterios",
    domain_id: "d2",
    verification_criteria: [],
    appliesWhen: null,
  },
];

describe("buildComplianceQuestions", () => {
  it("emits one question group per control with criteria", () => {
    const q = buildComplianceQuestions(controls);
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ controlCode: "DPC-LIC-001", criteria: controls[0].verification_criteria });
  });
});
