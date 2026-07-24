import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("incluye el índice /recursos", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/recursos"))).toBe(true);
  });

  it("incluye solo artículos publicados (no borradores)", () => {
    const urls = sitemap().map((e) => e.url);
    // El pilar está en reviewed:false hasta la Task 9 → no debe aparecer.
    expect(urls.some((u) => u.endsWith("/recursos/ley-21719"))).toBe(false);
  });
});
