import { describe, it, expect } from "vitest";
import {
  RESOURCE_ARTICLES,
  getArticle,
  getPublishedArticles,
} from "@/lib/resources/registry";

describe("registro de recursos", () => {
  it("tiene al menos el pilar", () => {
    expect(RESOURCE_ARTICLES.length).toBeGreaterThan(0);
    expect(getArticle("ley-21719")?.type).toBe("pilar");
  });

  it("los slugs son únicos", () => {
    const slugs = RESOURCE_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("cada artículo tiene campos obligatorios y FAQ no vacío", () => {
    for (const a of RESOURCE_ARTICLES) {
      expect(a.slug, `slug de ${a.title}`).toMatch(/^[a-z0-9-]+$/);
      expect(a.title).toBeTruthy();
      expect(a.metaTitle).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.summary).toBeTruthy();
      expect(a.sections.length, `secciones de ${a.slug}`).toBeGreaterThan(0);
      expect(a.faq.length, `faq de ${a.slug}`).toBeGreaterThan(0);
      expect(a.author.name).toBeTruthy();
    }
  });

  it("los slugs en `related` existen en el registro", () => {
    const slugs = new Set(RESOURCE_ARTICLES.map((a) => a.slug));
    for (const a of RESOURCE_ARTICLES) {
      for (const rel of a.related) {
        expect(slugs.has(rel), `${a.slug} → related ${rel}`).toBe(true);
      }
    }
  });

  it("getPublishedArticles solo devuelve los revisados", () => {
    for (const a of getPublishedArticles()) {
      expect(a.reviewed).toBe(true);
    }
  });
});
