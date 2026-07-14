import { describe, expect, it } from "vitest";
import { getBreachContent, BREACH_CONTENT } from "../lib/legal/breach-content";

describe("getBreachContent", () => {
  it("devuelve el contenido de una brecha conocida", () => {
    const c = getBreachContent("B-SEG-003");
    expect(c).not.toBeNull();
    expect(typeof c?.whyRisk).toBe("string");
    expect(c?.whyRisk.length).toBeGreaterThan(0);
    expect(typeof c?.lawDetail).toBe("string");
    expect(c?.lawDetail.length).toBeGreaterThan(0);
  });

  it("devuelve null para un código desconocido", () => {
    expect(getBreachContent("B-XXX-999")).toBeNull();
  });

  it("cubre los 18 códigos de brecha vigentes", () => {
    const codes = [
      "B-BIO-001","B-CAP-001","B-CCT-001","B-CON-001","B-CON-002","B-DER-001",
      "B-GOB-001","B-LEG-001","B-LEG-002","B-LEG-003","B-MEN-001","B-SAL-001",
      "B-SEG-001","B-SEG-002","B-SEG-003","B-TER-001","B-TER-002","B-WEB-001",
    ];
    for (const code of codes) expect(BREACH_CONTENT[code], code).toBeTruthy();
  });
});
