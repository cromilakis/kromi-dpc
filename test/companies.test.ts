import { describe, expect, it } from "vitest";
import {
  computeRutDv,
  formatRut,
  isValidRut,
  normalizeRut,
} from "../lib/companies/rut";
import {
  COMPLEXITY_FACTORS,
  createCompanySchema,
  identificationSchema,
} from "../lib/companies/schema";
// scoring.server es `server-only`; vitest lo stubea (alias en vitest.config.ts).
import {
  computeCompanyScore,
  scoreTierOf,
} from "../lib/companies/scoring.server";

// ---------------------------------------------------------------------------
// RUT chileno — validación de formato y dígito verificador (módulo 11)
// ---------------------------------------------------------------------------
describe("normalizeRut", () => {
  it("quita puntos, guiones y espacios, y sube la k a mayúscula", () => {
    expect(normalizeRut("7.654.381-k")).toBe("7654381K");
    expect(normalizeRut(" 12.345.678-5 ")).toBe("123456785");
    expect(normalizeRut("76421905-8")).toBe("764219058");
  });
});

describe("computeRutDv", () => {
  it("calcula dígitos verificadores conocidos", () => {
    expect(computeRutDv("11111111")).toBe("1");
    expect(computeRutDv("12345678")).toBe("5");
    expect(computeRutDv("76421905")).toBe("8");
  });

  it("resto 10 → K y resto 11 → 0", () => {
    expect(computeRutDv("7654381")).toBe("K"); // sum % 11 === 1
    expect(computeRutDv("7654341")).toBe("0"); // sum % 11 === 0
  });
});

describe("isValidRut", () => {
  it("acepta RUT válidos con y sin puntos/guion", () => {
    expect(isValidRut("11.111.111-1")).toBe(true);
    expect(isValidRut("12345678-5")).toBe(true);
    expect(isValidRut("123456785")).toBe(true);
    expect(isValidRut("7.654.381-K")).toBe(true);
    expect(isValidRut("7654381-k")).toBe(true);
  });

  it("rechaza el DV incorrecto", () => {
    expect(isValidRut("11.111.111-2")).toBe(false);
    expect(isValidRut("12345678-K")).toBe(false);
  });

  it("rechaza cuerpos fuera de rango o no numéricos", () => {
    expect(isValidRut("")).toBe(false);
    expect(isValidRut("123456-5")).toBe(false); // cuerpo de 6 dígitos
    expect(isValidRut("123456789-5")).toBe(false); // cuerpo de 9 dígitos
    expect(isValidRut("abcdefg-5")).toBe(false);
    expect(isValidRut("K")).toBe(false);
  });
});

describe("formatRut", () => {
  it("produce el formato canónico con puntos y guion", () => {
    expect(formatRut("123456785")).toBe("12.345.678-5");
    expect(formatRut("7654381k")).toBe("7.654.381-K");
    expect(formatRut("76.421.905-8")).toBe("76.421.905-8");
  });

  it("con input inválido devuelve el valor normalizado sin lanzar", () => {
    expect(formatRut("11111111-2")).toBe("111111112");
  });
});

// ---------------------------------------------------------------------------
// Complexity Score del alta (server-only) — modelo del prototipo/RFC §14.3
// ---------------------------------------------------------------------------
describe("computeCompanyScore", () => {
  it("replica el caso prellenado del prototipo (Clínica Andes): 52 × 1.7 → 88", () => {
    // Grande + salud (mult. 1.7 del seed) + sensibles (12) + volumen (9) +
    // multi-sede (5) + proveedores críticos (6) + base enterprise (20) = 52.
    const score = computeCompanyScore({
      sizeTier: "enterprise",
      sectorMultiplier: 1.7,
      factors: ["sensitive_data", "multi_site", "critical_providers"],
    });
    expect(score.basePoints).toBe(52);
    expect(score.score).toBe(88);
    expect(score.scoreTier).toBe("critical");
  });

  it("micro sin factores queda en el tramo bajo", () => {
    const score = computeCompanyScore({
      sizeTier: "micro",
      sectorMultiplier: 1.1,
      factors: [],
    });
    expect(score.basePoints).toBe(8);
    expect(score.score).toBe(9); // round(8 × 1.1)
    expect(score.scoreTier).toBe("low");
  });

  it("el bono de volumen de sensibles aplica solo a enterprise", () => {
    const small = computeCompanyScore({
      sizeTier: "small",
      sectorMultiplier: 1.0,
      factors: ["sensitive_data"],
    });
    const enterprise = computeCompanyScore({
      sizeTier: "enterprise",
      sectorMultiplier: 1.0,
      factors: ["sensitive_data"],
    });
    expect(small.basePoints).toBe(14 + 12);
    expect(enterprise.basePoints).toBe(20 + 12 + 9);
  });

  it("los factores duplicados no suman dos veces", () => {
    const once = computeCompanyScore({
      sizeTier: "small",
      sectorMultiplier: 1.3,
      factors: ["multi_site"],
    });
    const twice = computeCompanyScore({
      sizeTier: "small",
      sectorMultiplier: 1.3,
      factors: ["multi_site", "multi_site"],
    });
    expect(twice.score).toBe(once.score);
  });

  it("el score se topa en 100 aun con todos los factores y el multiplicador máximo", () => {
    const score = computeCompanyScore({
      sizeTier: "enterprise",
      sectorMultiplier: 1.8,
      factors: [...COMPLEXITY_FACTORS],
    });
    expect(score.score).toBe(100);
    expect(score.scoreTier).toBe("critical");
  });
});

describe("scoreTierOf — umbrales exactos del prototipo", () => {
  it("≥85 crítico / ≥70 alto / ≥50 medio / <50 bajo", () => {
    expect(scoreTierOf(49)).toBe("low");
    expect(scoreTierOf(50)).toBe("medium");
    expect(scoreTierOf(69)).toBe("medium");
    expect(scoreTierOf(70)).toBe("high");
    expect(scoreTierOf(84)).toBe("high");
    expect(scoreTierOf(85)).toBe("critical");
  });
});

// ---------------------------------------------------------------------------
// Contratos Zod del alta — la validación de RUT está cableada al schema
// ---------------------------------------------------------------------------
describe("createCompanySchema", () => {
  const validPayload = {
    name: "Clínica Andes Salud SpA",
    rut: "76.421.905-8",
    contactName: "Carolina Díaz",
    contactEmail: "carolina@clinicaandes.cl",
    contactPhone: "+56 9 1234 5678",
    sectorCode: "salud",
    sizeTier: "enterprise",
    employeesCount: 480,
    factors: ["sensitive_data", "multi_site"],
  };

  it("acepta un payload completo válido", () => {
    const parsed = createCompanySchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it("rechaza un RUT con DV incorrecto", () => {
    const parsed = createCompanySchema.safeParse({
      ...validPayload,
      rut: "76.421.905-K",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "rut")).toBe(
        true,
      );
    }
  });

  it("email/teléfono vacíos se normalizan a undefined (opcionales)", () => {
    const parsed = identificationSchema.safeParse({
      name: "Empresa Prueba Ltda",
      rut: "12345678-5",
      contactName: "Ana Rojas",
      contactEmail: "",
      contactPhone: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.contactEmail).toBeUndefined();
      expect(parsed.data.contactPhone).toBeUndefined();
    }
  });

  it("rechaza correos inválidos, factores desconocidos y dotación negativa", () => {
    expect(
      createCompanySchema.safeParse({ ...validPayload, contactEmail: "no-es-correo" })
        .success,
    ).toBe(false);
    expect(
      createCompanySchema.safeParse({ ...validPayload, factors: ["otro"] }).success,
    ).toBe(false);
    expect(
      createCompanySchema.safeParse({ ...validPayload, employeesCount: -1 }).success,
    ).toBe(false);
    expect(
      createCompanySchema.safeParse({ ...validPayload, employeesCount: 12.5 }).success,
    ).toBe(false);
  });
});
