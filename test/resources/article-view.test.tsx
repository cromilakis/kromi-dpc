import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleView } from "@/components/resources/article-view";
import { LEY_21719 } from "@/lib/resources/articles/ley-21719";

describe("ArticleView", () => {
  it("renderiza el H1, el resumen y el CTA a la autoevaluación", () => {
    render(<ArticleView article={LEY_21719} />);
    expect(
      screen.getByRole("heading", { level: 1, name: LEY_21719.title }),
    ).toBeDefined();
    expect(screen.getByText(LEY_21719.summary)).toBeDefined();
    const cta = screen.getByRole("link", { name: /autoevaluaci/i });
    expect(cta.getAttribute("href")).toBe("/self-assessment");
  });

  it("renderiza cada sección y su encabezado", () => {
    render(<ArticleView article={LEY_21719} />);
    for (const s of LEY_21719.sections) {
      expect(screen.getByRole("heading", { level: 2, name: s.heading })).toBeDefined();
    }
  });
});
