import { describe, expect, it } from "vitest";
import { assistedDiagnosisInputSchema } from "../lib/companies/assisted-schema";

/**
 * Contrato server-side del alta asistida: revalida contacto mínimo y RUT real
 * (no de relleno), no solo en cliente. La server action usa este mismo schema.
 */
const base = {
  name: "Clínica Andes SpA",
  rut: "76.086.428-5",
  contactName: "María Pérez",
  contactEmail: "maria@clinicaandes.cl",
  answers: {
    screening: [{ nodeId: "S-001", value: "micro" }],
    deepDive: [],
  },
};

describe("assistedDiagnosisInputSchema", () => {
  it("acepta un alta asistida válida", () => {
    expect(assistedDiagnosisInputSchema.safeParse(base).success).toBe(true);
  });

  it("acepta teléfono como único canal de contacto (sin correo)", () => {
    const { contactEmail, ...rest } = base;
    void contactEmail;
    expect(
      assistedDiagnosisInputSchema.safeParse({ ...rest, contactPhone: "+56912345678" })
        .success,
    ).toBe(true);
  });

  it("rechaza cuando no hay correo ni teléfono (contacto mínimo, en servidor)", () => {
    const { contactEmail, ...rest } = base;
    void contactEmail;
    expect(assistedDiagnosisInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rechaza un RUT de relleno con DV válido (en servidor)", () => {
    expect(
      assistedDiagnosisInputSchema.safeParse({ ...base, rut: "11111111-1" }).success,
    ).toBe(false);
  });

  it("rechaza claves desconocidas (strictObject anti-abuso)", () => {
    expect(
      assistedDiagnosisInputSchema.safeParse({ ...base, hackerField: "x" }).success,
    ).toBe(false);
  });
});
