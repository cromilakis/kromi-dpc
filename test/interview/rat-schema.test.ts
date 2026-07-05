import { describe, it, expect } from "vitest";
import { ratActivitySchema, LEGAL_BASES } from "@/lib/interview/rat-schema";

describe("ratActivitySchema", () => {
  const valid = {
    area: "Marketing", name: "Envío de promociones", purpose: "Comunicaciones comerciales",
    legalBasis: "consentimiento", dataCategories: ["contacto"], dataSubjects: ["clientes"],
    source: "Formulario web", recipients: [], processors: ["Mailchimp"],
    intlTransfer: true, intlCountries: ["US"], retention: "24 meses",
    securityMeasures: ["MFA"], isSensitive: false,
  };
  it("accepts a complete activity", () => {
    expect(ratActivitySchema.parse(valid)).toMatchObject({ area: "Marketing" });
  });
  it("rejects empty area", () => {
    expect(() => ratActivitySchema.parse({ ...valid, area: "" })).toThrow();
  });
  it("rejects an unknown legal basis", () => {
    expect(() => ratActivitySchema.parse({ ...valid, legalBasis: "vibes" })).toThrow();
  });
  it("exposes the legal bases catalog", () => {
    expect(LEGAL_BASES).toContain("consentimiento");
  });
});
