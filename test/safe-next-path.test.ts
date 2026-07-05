import { describe, expect, it } from "vitest";
import { DEFAULT_APP_PATH, safeNextPath } from "../lib/auth/safe-next-path";

describe("safeNextPath (anti open-redirect del login)", () => {
  it("acepta rutas internas de la plataforma", () => {
    expect(safeNextPath("/app")).toBe("/app");
    expect(safeNextPath("/app/companies")).toBe("/app/companies");
    expect(
      safeNextPath("/app/companies/9f8b1c2d-0000-0000-0000-000000000000/checklist"),
    ).toBe("/app/companies/9f8b1c2d-0000-0000-0000-000000000000/checklist");
    expect(safeNextPath("/app?tab=riesgos")).toBe("/app?tab=riesgos");
  });

  it("rechaza destinos externos o malformados (fallback /app)", () => {
    expect(safeNextPath("https://evil.example")).toBe(DEFAULT_APP_PATH);
    expect(safeNextPath("//evil.example/app")).toBe(DEFAULT_APP_PATH);
    expect(safeNextPath("/\\evil.example")).toBe(DEFAULT_APP_PATH);
    expect(safeNextPath("javascript:alert(1)")).toBe(DEFAULT_APP_PATH);
    expect(safeNextPath("app/companies")).toBe(DEFAULT_APP_PATH);
  });

  it("rechaza rutas internas fuera de /app (p. ej. /login → loop)", () => {
    expect(safeNextPath("/login")).toBe(DEFAULT_APP_PATH);
    expect(safeNextPath("/")).toBe(DEFAULT_APP_PATH);
    expect(safeNextPath("/apples")).toBe(DEFAULT_APP_PATH);
  });

  it("sin parámetro → fallback", () => {
    expect(safeNextPath(null)).toBe(DEFAULT_APP_PATH);
    expect(safeNextPath(undefined)).toBe(DEFAULT_APP_PATH);
    expect(safeNextPath("")).toBe(DEFAULT_APP_PATH);
  });
});
