import { describe, expect, it } from "vitest";
import { getCitation, normalizeArticleRef } from "@/lib/legal/citations";
import { DEEP_DIVE_BRANCHES } from "@/lib/legal/deep-dive-branches";
import { SCREENING_BREACHES } from "@/lib/legal/screening-nodes";

/**
 * Toda referencia legal usada por el catálogo de brechas (screening y
 * deep-dive, incluidos los overrides) debe resolver a una cita navegable —
 * ninguna cita puede quedar como texto muerto en el portal.
 */

function collectAllArticleRefs(): string[] {
  const refs = new Set<string>();
  for (const breach of Object.values(SCREENING_BREACHES)) {
    for (const ref of breach.articles) refs.add(ref);
  }
  for (const branch of DEEP_DIVE_BRANCHES) {
    for (const question of branch.questions) {
      for (const answer of question.answers) {
        for (const ref of answer.breach?.articles ?? []) refs.add(ref);
      }
    }
  }
  return [...refs];
}

describe("catálogo de citas legales", () => {
  it("toda referencia del catálogo de brechas tiene cita", () => {
    for (const ref of collectAllArticleRefs()) {
      const citation = getCitation(ref);
      expect(citation, `sin cita para: "${ref}"`).not.toBeNull();
      expect(citation!.url).toMatch(/^https:\/\//);
      expect(citation!.summary.length).toBeGreaterThan(40);
    }
  });

  it("normaliza los paréntesis aclaratorios", () => {
    expect(normalizeArticleRef("Art. 14 ter (12 literales)")).toBe("Art. 14 ter");
    expect(normalizeArticleRef("Art. 3° letra c) (proporcionalidad)")).toBe(
      "Art. 3° letra c)",
    );
    expect(normalizeArticleRef("Arts. 4° a 11 (Título I)")).toBe("Arts. 4° a 11");
  });

  it("una referencia desconocida degrada a null (chip estático)", () => {
    expect(getCitation("Art. inexistente 999")).toBeNull();
  });
});
