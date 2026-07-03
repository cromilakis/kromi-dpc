import { describe, expect, it } from "vitest";
// Módulos `server-only`: en vitest el paquete se stubea vacío (alias en
// vitest.config.ts) — el guard real lo aplica el build de Next.
import {
  COMPLIANCE_THRESHOLD_PCT,
  computeEligibility,
  CRITICAL_DOMAIN_CODES,
  type EligibilityControl,
} from "../lib/certificates/eligibility.server";
import {
  addMonths,
  CERTIFICATE_CODE_PATTERN,
  certificateHash,
  companyCodeInitials,
  generateCertificateCode,
} from "../lib/certificates/issue.server";

// ---------------------------------------------------------------------------
// Helpers de armado de controles
// ---------------------------------------------------------------------------

let sequence = 0;

function control(
  status: EligibilityControl["status"],
  domainCode = "DPC-LIC",
): EligibilityControl {
  sequence += 1;
  return {
    controlCode: `${domainCode}-${String(sequence).padStart(3, "0")}`,
    domainCode,
    status,
  };
}

/** n controles con el mismo estado (dominio no crítico por defecto). */
function controls(
  n: number,
  status: EligibilityControl["status"],
  domainCode = "DPC-LIC",
): EligibilityControl[] {
  return Array.from({ length: n }, () => control(status, domainCode));
}

// ---------------------------------------------------------------------------
// computeEligibility — regla de elegibilidad (umbral 80% + regla dura)
// ---------------------------------------------------------------------------

describe("computeEligibility — casos sin datos", () => {
  it("sin assessment (null) no es elegible, con gap no_assessment", () => {
    const result = computeEligibility(null);
    expect(result.eligible).toBe(false);
    expect(result.gaps).toEqual([{ kind: "no_assessment" }]);
    expect(result.totalControls).toBe(0);
  });

  it("assessment sin controles no es elegible, con gap no_evaluated_controls", () => {
    const result = computeEligibility([]);
    expect(result.eligible).toBe(false);
    expect(result.gaps).toEqual([{ kind: "no_evaluated_controls" }]);
  });
});

describe("computeEligibility — umbral de cumplimiento (regla 1)", () => {
  it("documenta el umbral por defecto en 80%", () => {
    expect(COMPLIANCE_THRESHOLD_PCT).toBe(80);
  });

  it("es elegible exactamente EN el umbral (4/5 = 80%, sin error de coma flotante)", () => {
    const result = computeEligibility([
      ...controls(4, "compliant"),
      control("partial"),
    ]);
    expect(result.compliancePct).toBe(80);
    expect(result.eligible).toBe(true);
    expect(result.gaps).toEqual([]);
  });

  it("no es elegible justo bajo el umbral (79/100)", () => {
    const result = computeEligibility([
      ...controls(79, "compliant"),
      ...controls(21, "partial"),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.gaps).toEqual([
      {
        kind: "below_threshold",
        compliancePct: 79,
        thresholdPct: 80,
        missingCompliantCount: 1,
      },
    ]);
  });

  it("los controles pending cuentan en el denominador (en contra)", () => {
    // 4 compliant + 1 pending = 80% igual que 4/5: sin evaluar no suma a favor.
    const atThreshold = computeEligibility([
      ...controls(4, "compliant"),
      control("pending"),
    ]);
    expect(atThreshold.eligible).toBe(true);
    expect(atThreshold.pending).toBe(1);

    // 4 compliant + 2 pending = 66% < 80%.
    const belowThreshold = computeEligibility([
      ...controls(4, "compliant"),
      ...controls(2, "pending"),
    ]);
    expect(belowThreshold.eligible).toBe(false);
    expect(belowThreshold.gaps[0]).toMatchObject({ kind: "below_threshold" });
  });

  it("calcula cuántos compliant adicionales faltan para el umbral", () => {
    // 2/10 = 20%; umbral 80% exige ceil(8) → faltan 6.
    const result = computeEligibility([
      ...controls(2, "compliant"),
      ...controls(8, "partial"),
    ]);
    const gap = result.gaps.find((g) => g.kind === "below_threshold");
    expect(gap).toMatchObject({ missingCompliantCount: 6, compliancePct: 20 });
  });

  it("acepta un umbral parametrizado distinto del default", () => {
    const mix = [...controls(1, "compliant"), control("partial")]; // 50%
    expect(computeEligibility(mix, 50).eligible).toBe(true);
    expect(computeEligibility(mix, 51).eligible).toBe(false);
  });
});

describe("computeEligibility — regla dura de dominios críticos (regla 2)", () => {
  it("documenta DPC-SEG y DPC-INC como dominios críticos", () => {
    expect(CRITICAL_DOMAIN_CODES).toEqual(["DPC-SEG", "DPC-INC"]);
  });

  it("un non_compliant en dominio crítico bloquea aunque el % supere el umbral", () => {
    const seg = control("non_compliant", "DPC-SEG");
    const result = computeEligibility([...controls(99, "compliant"), seg]);
    expect(result.compliancePct).toBe(99);
    expect(result.eligible).toBe(false);
    expect(result.gaps).toEqual([
      {
        kind: "critical_non_compliant",
        domainCode: "DPC-SEG",
        controlCodes: [seg.controlCode],
      },
    ]);
  });

  it("reporta un gap por dominio crítico con sus códigos de control", () => {
    const seg = control("non_compliant", "DPC-SEG");
    const inc1 = control("non_compliant", "DPC-INC");
    const inc2 = control("non_compliant", "DPC-INC");
    const result = computeEligibility([
      ...controls(96, "compliant"),
      seg,
      inc1,
      inc2,
    ]);
    expect(result.gaps).toEqual([
      {
        kind: "critical_non_compliant",
        domainCode: "DPC-SEG",
        controlCodes: [seg.controlCode],
      },
      {
        kind: "critical_non_compliant",
        domainCode: "DPC-INC",
        controlCodes: [inc1.controlCode, inc2.controlCode],
      },
    ]);
  });

  it("non_compliant en dominio NO crítico solo pesa en el umbral", () => {
    // 9/10 = 90% ≥ 80% y el no cumple está fuera de DPC-SEG/DPC-INC.
    const result = computeEligibility([
      ...controls(9, "compliant"),
      control("non_compliant", "DPC-CAL"),
    ]);
    expect(result.eligible).toBe(true);
    expect(result.nonCompliant).toBe(1);
  });

  it("partial o pending en dominio crítico NO activan la regla dura", () => {
    const result = computeEligibility([
      ...controls(8, "compliant"),
      control("partial", "DPC-SEG"),
      control("pending", "DPC-INC"),
    ]);
    // 8/10 = 80%: en el umbral y sin non_compliant crítico.
    expect(result.eligible).toBe(true);
  });

  it("acumula ambos gaps cuando fallan las dos reglas a la vez", () => {
    const result = computeEligibility([
      ...controls(1, "compliant"),
      control("non_compliant", "DPC-SEG"),
    ]);
    expect(result.eligible).toBe(false);
    expect(result.gaps.map((gap) => gap.kind)).toEqual([
      "below_threshold",
      "critical_non_compliant",
    ]);
  });

  it("reporta los contadores completos del assessment", () => {
    const result = computeEligibility([
      ...controls(3, "compliant"),
      ...controls(2, "partial"),
      control("non_compliant"),
      ...controls(4, "pending"),
    ]);
    expect(result).toMatchObject({
      totalControls: 10,
      compliant: 3,
      partial: 2,
      nonCompliant: 1,
      pending: 4,
      compliancePct: 30,
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers de emisión (código, hash, vigencia)
// ---------------------------------------------------------------------------

describe("companyCodeInitials", () => {
  it("toma la primera letra de hasta 3 palabras, sin diacríticos", () => {
    expect(companyCodeInitials("Clínica Andes Salud")).toBe("CAS");
    expect(companyCodeInitials("Clínica Andes Salud SpA")).toBe("CAS");
  });

  it("completa con letras de la primera palabra si hay menos de 3", () => {
    expect(companyCodeInitials("Kappa")).toBe("KAP");
  });

  it("usa el fallback X ante nombres sin letras", () => {
    expect(companyCodeInitials("123")).toBe("XXX");
  });
});

describe("generateCertificateCode", () => {
  it("cumple el patrón DPC-<iniciales>-<año>-<6 base32>", () => {
    const code = generateCertificateCode("Clínica Andes Salud", 2026);
    expect(code).toMatch(CERTIFICATE_CODE_PATTERN);
    expect(code.startsWith("DPC-CAS-2026-")).toBe(true);
  });

  it("genera sufijos aleatorios (no repite en una muestra corta)", () => {
    const codes = new Set(
      Array.from({ length: 20 }, () => generateCertificateCode("Aurora Pay", 2026)),
    );
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("certificateHash", () => {
  it("es determinista y cumple el check de BD (64 hex minúsculas)", () => {
    const a = certificateHash("company-1", "DPC-CAS-2026-ABC234", "2026-07-02");
    const b = certificateHash("company-1", "DPC-CAS-2026-ABC234", "2026-07-02");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("cambia si cambia cualquier componente (separador inequívoco)", () => {
    const base = certificateHash("c1", "code", "2026-07-02");
    expect(certificateHash("c2", "code", "2026-07-02")).not.toBe(base);
    expect(certificateHash("c1", "code2", "2026-07-02")).not.toBe(base);
    // El ':' evita ambigüedad de concatenación ("ab"+"c" vs "a"+"bc").
    expect(certificateHash("ab", "c", "x")).not.toBe(certificateHash("a", "bc", "x"));
  });
});

describe("addMonths — vigencia de 12 meses", () => {
  it("suma meses calendario en UTC", () => {
    expect(addMonths("2026-07-02", 12)).toBe("2027-07-02");
    expect(addMonths("2026-01-31", 1)).toBe("2026-03-03");
  });

  it("29 de febrero + 12 meses desborda a marzo (siempre > fecha origen)", () => {
    expect(addMonths("2024-02-29", 12)).toBe("2025-03-01");
  });

  it("lanza ante fechas malformadas", () => {
    expect(() => addMonths("no-fecha", 12)).toThrow();
  });
});
