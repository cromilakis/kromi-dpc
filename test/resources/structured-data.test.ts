import { describe, it, expect } from "vitest";
import { articleJsonLd } from "@/lib/resources/structured-data";
import { LEY_21719 } from "@/lib/resources/articles/ley-21719";

describe("articleJsonLd", () => {
  const graph = articleJsonLd(LEY_21719) as {
    "@graph": Array<{ "@type": string; mainEntity?: unknown[] }>;
  };

  it("incluye Article, FAQPage y BreadcrumbList", () => {
    const types = graph["@graph"].map((n) => n["@type"]);
    expect(types).toContain("Article");
    expect(types).toContain("FAQPage");
    expect(types).toContain("BreadcrumbList");
  });

  it("la FAQPage tiene una pregunta por cada FAQ del artículo", () => {
    const faqNode = graph["@graph"].find((n) => n["@type"] === "FAQPage");
    expect(faqNode?.mainEntity).toHaveLength(LEY_21719.faq.length);
  });
});
