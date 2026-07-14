import { describe, expect, it } from "vitest";
import { qrDataUri, verifyUrl } from "../lib/documents/qr";

describe("verifyUrl", () => {
  it("arma la URL de verificación con la base dada", () => {
    expect(verifyUrl("DPC-CA-2026-X7K4QZ", "https://dpc.kromi.cl")).toBe(
      "https://dpc.kromi.cl/verify/DPC-CA-2026-X7K4QZ",
    );
  });

  it("no duplica la barra final de la base", () => {
    expect(verifyUrl("ABC", "https://dpc.kromi.cl/")).toBe(
      "https://dpc.kromi.cl/verify/ABC",
    );
  });
});

describe("qrDataUri", () => {
  it("devuelve un data URI PNG base64 no vacío", async () => {
    const uri = await qrDataUri("https://dpc.kromi.cl/verify/ABC");
    expect(uri.startsWith("data:image/png;base64,")).toBe(true);
    expect(uri.length).toBeGreaterThan("data:image/png;base64,".length + 100);
  });
});
