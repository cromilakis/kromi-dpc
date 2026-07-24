import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import { RESOURCE_ARTICLES, getPublishedArticles } from "@/lib/resources/registry";

describe("sitemap", () => {
  it("incluye el índice /recursos", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/recursos"))).toBe(true);
  });

  it("incluye todos los artículos publicados", () => {
    const urls = sitemap().map((e) => e.url);
    for (const a of getPublishedArticles()) {
      expect(
        urls.some((u) => u.endsWith(`/recursos/${a.slug}`)),
        `publicado ${a.slug}`,
      ).toBe(true);
    }
  });

  it("no incluye artículos no publicados (borradores)", () => {
    const urls = sitemap().map((e) => e.url);
    for (const a of RESOURCE_ARTICLES.filter((x) => !x.reviewed)) {
      expect(
        urls.some((u) => u.endsWith(`/recursos/${a.slug}`)),
        `borrador ${a.slug}`,
      ).toBe(false);
    }
  });
});
