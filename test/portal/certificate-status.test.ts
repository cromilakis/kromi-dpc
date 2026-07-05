import { describe, expect, it } from "vitest";
import {
  certificateStanding,
  EXPIRY_WARNING_DAYS,
} from "../../lib/portal/certificate-status";

const TODAY = "2026-07-05";

describe("certificateStanding", () => {
  it("sin certificado → sin_certificado", () => {
    expect(certificateStanding(null, TODAY)).toBe("sin_certificado");
  });

  it("status revoked → revocada", () => {
    expect(
      certificateStanding(
        { status: "revoked", valid_until: "2027-01-01" },
        TODAY,
      ),
    ).toBe("revocada");
  });

  it("valid_until pasado → vencida", () => {
    expect(
      certificateStanding(
        { status: "active", valid_until: "2026-01-01" },
        TODAY,
      ),
    ).toBe("vencida");
  });

  it("status expired → vencida", () => {
    expect(
      certificateStanding(
        { status: "expired", valid_until: "2027-01-01" },
        TODAY,
      ),
    ).toBe("vencida");
  });

  it("a 30 días de vencer → por_vencer", () => {
    const validUntil = new Date(TODAY);
    validUntil.setDate(validUntil.getDate() + 30);
    expect(
      certificateStanding(
        {
          status: "active",
          valid_until: validUntil.toISOString().slice(0, 10),
        },
        TODAY,
      ),
    ).toBe("por_vencer");
  });

  it("a 200 días de vencer → vigente", () => {
    const validUntil = new Date(TODAY);
    validUntil.setDate(validUntil.getDate() + 200);
    expect(
      certificateStanding(
        {
          status: "active",
          valid_until: validUntil.toISOString().slice(0, 10),
        },
        TODAY,
      ),
    ).toBe("vigente");
  });

  it("EXPIRY_WARNING_DAYS es 60", () => {
    expect(EXPIRY_WARNING_DAYS).toBe(60);
  });
});
