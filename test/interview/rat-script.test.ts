import { describe, it, expect } from "vitest";
import { RAT_SCRIPT } from "@/lib/interview/script/rat-script";

describe("RAT_SCRIPT", () => {
  it("toda pregunta del guion trae un ejemplo concreto", () => {
    for (const node of RAT_SCRIPT.nodes) {
      expect(node.example, `nodo ${node.id} sin ejemplo`).toBeTruthy();
      expect(node.example!.length, `nodo ${node.id}`).toBeGreaterThan(0);
    }
  });

  it("los ids de nodo son únicos", () => {
    const ids = RAT_SCRIPT.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
