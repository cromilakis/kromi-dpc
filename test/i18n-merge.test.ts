import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { deepMergeMessages, type MessageTree } from "../i18n/merge-messages";
import es from "../messages/es.json";

describe("deepMergeMessages (i18n del shell)", () => {
  it("mergea namespaces disjuntos sin perder el catálogo base", () => {
    const base: MessageTree = { login: { title: "Ingreso" } };
    const extra: MessageTree = { app: { shell: { brand: "DPC" } } };
    expect(deepMergeMessages(base, extra)).toEqual({
      login: { title: "Ingreso" },
      app: { shell: { brand: "DPC" } },
    });
  });

  it("mergea en profundidad ramas compartidas (varios módulos bajo `app`)", () => {
    const shell: MessageTree = { app: { shell: { brand: "DPC" } } };
    const empresas: MessageTree = { app: { companies: { title: "Empresas" } } };
    expect(deepMergeMessages(shell, empresas)).toEqual({
      app: {
        shell: { brand: "DPC" },
        companies: { title: "Empresas" },
      },
    });
  });

  it("ante colisión de hoja gana el último merge (determinístico)", () => {
    const first: MessageTree = { app: { nav: { panel: "A" } } };
    const second: MessageTree = { app: { nav: { panel: "B" } } };
    expect(deepMergeMessages(first, second)).toEqual({
      app: { nav: { panel: "B" } },
    });
  });

  it("no muta los árboles de entrada", () => {
    const base: MessageTree = { app: { nav: { panel: "A" } } };
    const extra: MessageTree = { app: { nav: { companies: "B" } } };
    deepMergeMessages(base, extra);
    expect(base).toEqual({ app: { nav: { panel: "A" } } });
    expect(extra).toEqual({ app: { nav: { companies: "B" } } });
  });

  it("los messages/app/*.json reales no colisionan con es.json en ninguna hoja", () => {
    const dir = path.resolve(__dirname, "../messages/app");
    const files = readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .sort();
    expect(files.length).toBeGreaterThan(0);

    const leaves = (tree: MessageTree, prefix = ""): string[] =>
      Object.entries(tree).flatMap(([key, value]) =>
        typeof value === "string"
          ? [`${prefix}${key}`]
          : leaves(value, `${prefix}${key}.`),
      );

    let merged = es as unknown as MessageTree;
    const seen = new Set(leaves(merged));
    for (const file of files) {
      const tree = JSON.parse(
        readFileSync(path.join(dir, file), "utf8"),
      ) as MessageTree;
      for (const leaf of leaves(tree)) {
        expect(seen.has(leaf), `hoja duplicada entre módulos: ${leaf}`).toBe(
          false,
        );
        seen.add(leaf);
      }
      merged = deepMergeMessages(merged, tree);
    }

    // El merge conserva base + módulos (spot-checks de ambos lados).
    const mergedApp = merged.app as MessageTree;
    const mergedShell = mergedApp.shell as MessageTree;
    expect(mergedShell.brand).toBeTypeOf("string");
    const mergedLogin = merged.login as MessageTree;
    expect(mergedLogin.title).toBeTypeOf("string");
  });
});
