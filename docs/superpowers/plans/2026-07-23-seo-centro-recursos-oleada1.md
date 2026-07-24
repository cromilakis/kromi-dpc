# Centro de Recursos SEO — Oleada 1 (MVP) · Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el andamiaje del centro de recursos `/recursos` (hub & spoke) con el artículo pilar publicable end-to-end, listo para cargar el resto del contenido.

**Architecture:** Contenido en estructuras TypeScript (un archivo por artículo bajo `lib/resources/articles/`), registradas en un índice central. Rutas Next en `app/recursos/` renderizan esos datos con un componente de artículo de marca, metadata dinámica y JSON-LD. Solo los artículos con `reviewed: true` se publican (gate de revisión legal).

**Tech Stack:** Next.js App Router (server components), TypeScript, Tailwind v4, next-intl, Vitest. Sin MDX ni dependencias nuevas.

> **Desviación del spec (intencional):** el spec proponía MDX. El codebase no tiene MDX y usa consistentemente contenido en datos TS con tests de consistencia (`lib/legal/breach-content.ts` + `test/legal/citations.test.ts`). Este plan sigue ese patrón: sin dependencia nueva, contenido testeable, y el gate `reviewed` impide publicar texto sin aprobación legal. El objetivo del spec ("editar texto sin tocar lógica") se cumple: cada artículo es un archivo de datos independiente.

## Global Constraints

- Prosa en español; identificadores/claves en inglés (CLAUDE.md).
- Textos de UI vía next-intl (`messages/es.json`); no hardcodear strings de UI. El *cuerpo* de los artículos vive en los datos del artículo (no en i18n), igual que `breach-content.ts`.
- URL canónica y marca desde `lib/site.ts` (`SITE_URL`, `absoluteUrl`, `ORG_NAME`).
- Tests en `test/**/*.test.{ts,tsx}` (Vitest, jsdom, alias `@`).
- Solo artículos con `reviewed: true` se muestran, entran al sitemap y a `generateStaticParams`.
- Diseño coherente con el sistema (tokens: `ink`, `carbon`, `metal`, `ash`, `stone`, `slate`; `font-serif`; `rounded-cards`, `rounded-buttons`). Ancho de lectura ~720px.
- Fechas en los datos como ISO string literal (no `new Date()` en el módulo).

---

### Task 1: Tipos y registro de artículos

**Files:**
- Create: `lib/resources/types.ts`
- Create: `lib/resources/registry.ts`
- Test: `test/resources/registry.test.ts`

**Interfaces:**
- Produces: `ResourceArticle`, `ArticleType`, `ArticleSection`, `ArticleFaq` (tipos); `RESOURCE_ARTICLES: ResourceArticle[]`, `getArticle(slug: string): ResourceArticle | null`, `getPublishedArticles(): ResourceArticle[]`.

- [ ] **Step 1: Write the types**

Create `lib/resources/types.ts`:

```ts
/**
 * Modelo de contenido del centro de recursos. Cada artículo es un dato
 * estructurado (no MDX), testeable y con gate de revisión legal (`reviewed`).
 */
export type ArticleType = "pilar" | "satelite" | "rubro";

export interface ArticleSection {
  /** Encabezado H2 de la sección. */
  heading: string;
  /** Párrafos de la sección, en orden. */
  paragraphs: string[];
  /** Lista opcional (pasos numerados o viñetas) al final de la sección. */
  list?: { ordered: boolean; items: string[] };
}

export interface ArticleFaq {
  q: string;
  a: string;
}

export interface ResourceArticle {
  /** Slug bajo /recursos/. Único. kebab-case. */
  slug: string;
  type: ArticleType;
  /** H1 visible. */
  title: string;
  /** <title> para SEO (puede diferir del H1). */
  metaTitle: string;
  /** Meta description. */
  description: string;
  /** Keyword principal objetivo. */
  keyword: string;
  /** Resumen "En breve" (2-3 frases, extraíble por AI Overviews). */
  summary: string;
  sections: ArticleSection[];
  faq: ArticleFaq[];
  /** Slugs de artículos hermanos a enlazar. */
  related: string[];
  author: { name: string; credential: string };
  /** ISO date string. */
  datePublished: string;
  dateModified: string;
  /** Gate de revisión legal: si es false, no se publica. */
  reviewed: boolean;
}
```

- [ ] **Step 2: Write the failing test**

Create `test/resources/registry.test.ts`:

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run test/resources/registry.test.ts`
Expected: FAIL — no puede resolver `@/lib/resources/registry`.

- [ ] **Step 4: Write the registry**

Create `lib/resources/registry.ts`:

```ts
import type { ResourceArticle } from "./types";
import { LEY_21719 } from "./articles/ley-21719";

/** Todos los artículos del centro de recursos (revisados o no). */
export const RESOURCE_ARTICLES: ResourceArticle[] = [LEY_21719];

export function getArticle(slug: string): ResourceArticle | null {
  return RESOURCE_ARTICLES.find((a) => a.slug === slug) ?? null;
}

/** Artículos publicables (aprobados por revisión legal). */
export function getPublishedArticles(): ResourceArticle[] {
  return RESOURCE_ARTICLES.filter((a) => a.reviewed);
}
```

(La siguiente task crea `articles/ley-21719.ts`. Si se ejecuta esta primero, el test fallará al importar — es esperado hasta completar Task 2. Ejecutar Task 1 y 2 juntas antes de correr el test final.)

- [ ] **Step 5: Commit**

```bash
git add lib/resources/types.ts lib/resources/registry.ts test/resources/registry.test.ts
git commit -m "feat(resources): tipos y registro de artículos del centro de recursos"
```

---

### Task 2: Artículo pilar (dato)

**Files:**
- Create: `lib/resources/articles/ley-21719.ts`

**Interfaces:**
- Consumes: `ResourceArticle` de `lib/resources/types`.
- Produces: `LEY_21719: ResourceArticle` (consumido por `registry.ts`).

- [ ] **Step 1: Write the pillar article data (borrador, reviewed:false)**

Create `lib/resources/articles/ley-21719.ts`. Contenido de trabajo (será reemplazado por la versión redactada y aprobada en la Task 9); el andamiaje se valida con esto:

```ts
import type { ResourceArticle } from "../types";

export const LEY_21719: ResourceArticle = {
  slug: "ley-21719",
  type: "pilar",
  title: "Ley 21.719: guía completa de cumplimiento para tu empresa",
  metaTitle:
    "Ley 21.719 explicada: guía completa de cumplimiento (2026)",
  description:
    "Qué exige la Ley 21.719 de protección de datos personales en Chile, a quién aplica, obligaciones clave y cómo empezar a cumplir. Guía práctica para empresas.",
  keyword: "ley 21.719",
  summary:
    "La Ley 21.719 moderniza la protección de datos personales en Chile y entra en vigencia el 1 de diciembre de 2026. Aplica a toda organización que trate datos de clientes, trabajadores o usuarios, y exige principios de licitud, finalidad y seguridad, además de una Agencia con potestad de multar.",
  sections: [
    {
      heading: "¿Qué es la Ley 21.719?",
      paragraphs: [
        "La Ley 21.719 reforma la Ley 19.628 y establece un nuevo marco de protección de datos personales en Chile, alineado con estándares internacionales. Crea la Agencia de Protección de Datos Personales y refuerza los derechos de las personas sobre su información.",
      ],
    },
    {
      heading: "¿A quién aplica?",
      paragraphs: [
        "Aplica a cualquier organización —pública o privada, de cualquier tamaño— que trate datos personales de personas en Chile: clientes, trabajadores, proveedores o usuarios.",
      ],
    },
    {
      heading: "Obligaciones clave",
      paragraphs: [
        "El cumplimiento se ordena en torno a principios y deberes concretos que la empresa debe poder demostrar.",
      ],
      list: {
        ordered: false,
        items: [
          "Informar el tratamiento con una política de datos accesible.",
          "Tener una base de licitud válida (consentimiento u otra causa legal).",
          "Mantener un Registro de Actividades de Tratamiento (RAT).",
          "Aplicar medidas de seguridad proporcionales al riesgo.",
          "Atender los derechos de las personas (ARCOP) en plazo.",
        ],
      },
    },
    {
      heading: "Cómo empezar",
      paragraphs: [
        "El primer paso es saber dónde estás. La autoevaluación gratuita de KPC estima tus brechas en minutos y te entrega un plan de mitigación priorizado.",
      ],
    },
  ],
  faq: [
    {
      q: "¿Cuándo entra en vigencia la Ley 21.719?",
      a: "El 1 de diciembre de 2026. Conviene comenzar la adecuación con anticipación, porque implementar los cambios toma tiempo.",
    },
    {
      q: "¿Mi empresa debe cumplirla si es pequeña?",
      a: "Sí. La ley no distingue por tamaño: aplica a toda organización que trate datos personales, aunque el nivel de exigencia es proporcional al riesgo del tratamiento.",
    },
  ],
  related: [],
  author: {
    name: "Equipo legal de Kromi Privacy Center",
    credential: "Especialistas en protección de datos (Ley 21.719)",
  },
  datePublished: "2026-07-23",
  dateModified: "2026-07-23",
  reviewed: false,
};
```

- [ ] **Step 2: Run the registry test to verify it passes**

Run: `pnpm vitest run test/resources/registry.test.ts`
Expected: PASS (todos los casos).

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add lib/resources/articles/ley-21719.ts
git commit -m "feat(resources): artículo pilar Ley 21.719 (borrador, pendiente revisión legal)"
```

---

### Task 3: JSON-LD del artículo

**Files:**
- Create: `lib/resources/structured-data.ts`
- Test: `test/resources/structured-data.test.ts`

**Interfaces:**
- Consumes: `ResourceArticle`; `absoluteUrl`, `ORG_NAME` de `lib/site`.
- Produces: `articleJsonLd(article: ResourceArticle): object` — devuelve un `@graph` con `Article`, `FAQPage` y `BreadcrumbList`.

- [ ] **Step 1: Write the failing test**

Create `test/resources/structured-data.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/resources/structured-data.test.ts`
Expected: FAIL — no resuelve `@/lib/resources/structured-data`.

- [ ] **Step 3: Write the implementation**

Create `lib/resources/structured-data.ts`:

```ts
import { absoluteUrl, ORG_NAME } from "@/lib/site";
import type { ResourceArticle } from "./types";

/** @graph con Article + FAQPage + BreadcrumbList para una página de recurso. */
export function articleJsonLd(article: ResourceArticle): object {
  const url = absoluteUrl(`/recursos/${article.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: article.title,
        description: article.description,
        inLanguage: "es-CL",
        datePublished: article.datePublished,
        dateModified: article.dateModified,
        author: {
          "@type": "Person",
          name: article.author.name,
          jobTitle: article.author.credential,
        },
        publisher: { "@id": absoluteUrl("/#organization") },
        mainEntityOfPage: url,
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: article.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Recursos", item: absoluteUrl("/recursos") },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
    ],
  };
}
```

`ORG_NAME` se importa para asegurar el vínculo con la Organization del layout; el publisher referencia el `@id` ya definido en `app/layout.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/resources/structured-data.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/resources/structured-data.ts test/resources/structured-data.test.ts
git commit -m "feat(resources): JSON-LD Article/FAQPage/BreadcrumbList por artículo"
```

---

### Task 4: Componente de vista de artículo

**Files:**
- Create: `components/resources/article-view.tsx`
- Test: `test/resources/article-view.test.tsx`

**Interfaces:**
- Consumes: `ResourceArticle`; `whatsappUrl` de `lib/contact` (para el CTA secundario); `getArticle` para resolver `related`.
- Produces: `ArticleView({ article }: { article: ResourceArticle }): JSX.Element`.

- [ ] **Step 1: Write the failing smoke test**

Create `test/resources/article-view.test.tsx`:

```tsx
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
```

> Nota: usa `@testing-library/react`. Si no está instalado, agregarlo como devDependency en este paso: `pnpm add -D @testing-library/react @testing-library/dom`. Verificar en `package.json` antes; el proyecto ya usa jsdom en Vitest.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/resources/article-view.test.tsx`
Expected: FAIL — no resuelve `@/components/resources/article-view`.

- [ ] **Step 3: Write the component**

Create `components/resources/article-view.tsx`:

```tsx
import Link from "next/link";
import { getArticle } from "@/lib/resources/registry";
import type { ResourceArticle } from "@/lib/resources/types";

/**
 * Vista de un artículo del centro de recursos. Estructura optimizada para
 * lectura, SEO y extracción por AI Overviews: H1 + resumen "En breve" + secciones
 * con H2 + FAQ + CTA a la autoevaluación + firma de autoría (E-E-A-T).
 */
export function ArticleView({ article }: { article: ResourceArticle }) {
  const related = article.related
    .map((slug) => getArticle(slug))
    .filter((a): a is ResourceArticle => a !== null && a.reviewed);

  return (
    <article className="mx-auto w-full max-w-[760px] px-32 py-64 max-sm:px-16 max-sm:py-40">
      <p className="text-caption font-medium uppercase tracking-[0.4px] text-metal">
        Recursos
      </p>
      <h1 className="mt-8 text-balance font-serif text-heading-sm font-medium leading-[1.15] tracking-[-0.5px] text-ink">
        {article.title}
      </h1>

      {/* Resumen "En breve" — lo que la IA extrae para AI Overviews. */}
      <div className="mt-24 rounded-cards border border-stone bg-ash/50 p-20">
        <p className="text-caption font-semibold uppercase tracking-[0.4px] text-carbon">
          En breve
        </p>
        <p className="mt-6 text-body leading-[1.6] text-carbon">{article.summary}</p>
      </div>

      {article.sections.map((section, i) => (
        <section key={i} className="mt-32">
          <h2 className="font-serif text-subheading font-medium tracking-[-0.3px] text-ink">
            {section.heading}
          </h2>
          {section.paragraphs.map((p, j) => (
            <p key={j} className="mt-12 max-w-[68ch] text-body leading-[1.65] text-carbon">
              {p}
            </p>
          ))}
          {section.list && (
            <ListBlock ordered={section.list.ordered} items={section.list.items} />
          )}
        </section>
      ))}

      {/* CTA a la autoevaluación (conversión). */}
      <div className="mt-40 rounded-cards border border-stone bg-ash/60 p-24 max-sm:p-20">
        <h2 className="text-subheading font-semibold leading-[1.3] tracking-[-0.2px] text-ink">
          Descubre tus brechas en minutos
        </h2>
        <p className="mt-8 max-w-[62ch] text-body-sm leading-[1.55] text-carbon">
          La autoevaluación gratuita estima tu cumplimiento de la Ley 21.719 y te entrega un
          plan de mitigación priorizado. Sin registro, sin compromiso.
        </p>
        <Link
          href="/self-assessment"
          className="mt-16 inline-flex items-center gap-8 rounded-buttons bg-ink px-24 py-12 text-body-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Hacer la autoevaluación gratuita
        </Link>
      </div>

      {/* FAQ */}
      {article.faq.length > 0 && (
        <section className="mt-40">
          <h2 className="font-serif text-subheading font-medium tracking-[-0.3px] text-ink">
            Preguntas frecuentes
          </h2>
          <ul className="mt-16 flex flex-col gap-[10px]">
            {article.faq.map((f, i) => (
              <li key={i}>
                <details className="group rounded-cards border border-stone bg-white [&_summary::-webkit-details-marker]:hidden">
                  <summary className="cursor-pointer list-none px-20 py-[16px] text-body font-semibold tracking-[-0.2px] text-ink">
                    {f.q}
                  </summary>
                  <p className="max-w-[70ch] px-20 pb-[16px] text-body-sm leading-[1.6] text-carbon">
                    {f.a}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Enlaces relacionados (enlazado interno del cluster). */}
      {related.length > 0 && (
        <section className="mt-40 border-t border-stone pt-24">
          <p className="text-caption font-semibold uppercase tracking-[0.4px] text-metal">
            Sigue leyendo
          </p>
          <ul className="mt-12 flex flex-col gap-8">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/recursos/${r.slug}`}
                  className="text-body-sm font-medium text-ink underline decoration-slate underline-offset-2 hover:decoration-ink"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Autoría E-E-A-T. */}
      <footer className="mt-40 border-t border-stone pt-20 text-caption text-metal">
        Revisado por {article.author.name} · {article.author.credential}. Última
        actualización: {article.dateModified}.
      </footer>
    </article>
  );
}

function ListBlock({ ordered, items }: { ordered: boolean; items: string[] }) {
  const cls = "mt-12 flex flex-col gap-6 pl-20 text-body leading-[1.6] text-carbon";
  return ordered ? (
    <ol className={`${cls} list-decimal`}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  ) : (
    <ul className={`${cls} list-disc`}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/resources/article-view.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/resources/article-view.tsx test/resources/article-view.test.tsx package.json pnpm-lock.yaml
git commit -m "feat(resources): componente ArticleView con resumen, CTA, FAQ y autoría"
```

---

### Task 5: Ruta dinámica del artículo

**Files:**
- Create: `app/recursos/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getPublishedArticles`, `getArticle`; `ArticleView`; `articleJsonLd`; `LandingNav`, `LandingFooter`.

- [ ] **Step 1: Write the route**

Create `app/recursos/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ArticleView } from "@/components/resources/article-view";
import { getArticle, getPublishedArticles } from "@/lib/resources/registry";
import { articleJsonLd } from "@/lib/resources/structured-data";

export function generateStaticParams() {
  return getPublishedArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article || !article.reviewed) return {};
  const canonical = `/recursos/${article.slug}`;
  return {
    title: article.metaTitle,
    description: article.description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: article.metaTitle,
      description: article.description,
      images: ["/og.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: article.metaTitle,
      description: article.description,
      images: ["/og.png"],
    },
  };
}

export default async function ResourceArticlePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article || !article.reviewed) notFound();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(article)) }}
      />
      <LandingNav />
      <main id="main" className="flex-1">
        <ArticleView article={article} />
      </main>
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build`
Expected: compila. Con el pilar en `reviewed:false`, `generateStaticParams` devuelve `[]` y no se prerenderiza ninguna página aún (correcto — el gate legal funciona).

- [ ] **Step 3: Commit**

```bash
git add app/recursos/[slug]/page.tsx
git commit -m "feat(resources): ruta dinámica /recursos/[slug] con metadata y JSON-LD"
```

---

### Task 6: Índice /recursos

**Files:**
- Create: `app/recursos/page.tsx`

**Interfaces:**
- Consumes: `getPublishedArticles`; `LandingNav`, `LandingFooter`.

- [ ] **Step 1: Write the index page**

Create `app/recursos/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { getPublishedArticles } from "@/lib/resources/registry";

export const metadata: Metadata = {
  title: "Recursos sobre la Ley 21.719 y protección de datos",
  description:
    "Guías prácticas sobre la Ley 21.719 de protección de datos personales en Chile: cumplimiento, multas, RAT, derechos y contenido por rubro.",
  alternates: { canonical: "/recursos" },
};

export default function ResourcesIndexPage() {
  const articles = getPublishedArticles();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <LandingNav />
      <main
        id="main"
        className="mx-auto w-full max-w-[960px] flex-1 px-32 py-64 max-sm:px-16 max-sm:py-40"
      >
        <h1 className="text-balance font-serif text-heading-sm font-medium leading-[1.15] tracking-[-0.5px] text-ink">
          Recursos de protección de datos
        </h1>
        <p className="mt-12 max-w-[60ch] text-body leading-[1.55] text-carbon">
          Guías prácticas sobre la Ley 21.719 para entender qué exige y cómo cumplirla.
        </p>

        {articles.length === 0 ? (
          <p className="mt-40 text-body-sm text-metal">Próximamente.</p>
        ) : (
          <ul className="mt-40 grid grid-cols-1 gap-16 sm:grid-cols-2">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/recursos/${a.slug}`}
                  className="block h-full rounded-cards border border-stone bg-white p-20 transition-colors hover:bg-ash"
                >
                  <span className="text-body font-semibold leading-[1.3] text-ink">
                    {a.title}
                  </span>
                  <span className="mt-8 block text-body-sm leading-[1.5] text-carbon">
                    {a.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: `/recursos` aparece en la lista de rutas.

- [ ] **Step 3: Commit**

```bash
git add app/recursos/page.tsx
git commit -m "feat(resources): índice /recursos con tarjetas de artículos publicados"
```

---

### Task 7: Sitemap incluye los recursos

**Files:**
- Modify: `app/sitemap.ts`
- Test: `test/resources/sitemap.test.ts`

**Interfaces:**
- Consumes: `getPublishedArticles`, `absoluteUrl`.

- [ ] **Step 1: Write the failing test**

Create `test/resources/sitemap.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/resources/sitemap.test.ts`
Expected: FAIL — `/recursos` no está en el sitemap todavía.

- [ ] **Step 3: Update the sitemap**

Modify `app/sitemap.ts` — reemplazar el cuerpo por:

```ts
import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getPublishedArticles } from "@/lib/resources/registry";

/**
 * Sitemap de las páginas públicas indexables: home, autoevaluación, índice de
 * recursos y cada artículo publicado (reviewed). Se excluyen rutas privadas.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: absoluteUrl("/self-assessment"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/recursos"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
  const articles: MetadataRoute.Sitemap = getPublishedArticles().map((a) => ({
    url: absoluteUrl(`/recursos/${a.slug}`),
    lastModified: new Date(a.dateModified),
    changeFrequency: "yearly",
    priority: a.type === "pilar" ? 0.8 : 0.6,
  }));
  return [...base, ...articles];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/resources/sitemap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/sitemap.ts test/resources/sitemap.test.ts
git commit -m "feat(resources): sitemap incluye /recursos y artículos publicados"
```

---

### Task 8: Enlace "Recursos" en nav y footer

**Files:**
- Modify: `components/landing/data.ts` (NAV_LINKS y FOOTER_COLUMNS)
- Modify: `messages/es.json` (landing.nav y landing.footer)
- Modify: `components/landing/landing-nav.tsx` (si NAV_LINKS son anchors, agregar el link de página)

**Interfaces:**
- Consumes: estructura existente `NAV_LINKS`, `FOOTER_COLUMNS` en `data.ts`.

- [ ] **Step 1: Inspect current data.ts**

Run: `sed -n '1,60p' components/landing/data.ts` (leer NAV_LINKS y FOOTER_COLUMNS para respetar su forma: `{ key, href, external? }`).

- [ ] **Step 2: Add "Recursos" to NAV_LINKS**

En `components/landing/data.ts`, agregar al array `NAV_LINKS` una entrada de página (no anchor):

```ts
{ key: "resources", href: "/recursos" },
```

(Colocar antes del último anchor si existe un orden lógico; los anchors usan `href: "#..."`, este usa ruta.)

- [ ] **Step 3: Add the i18n label**

En `messages/es.json`, dentro de `landing.nav`, agregar:

```json
"resources": "Recursos"
```

- [ ] **Step 4: Add "Recursos" to the footer**

En `components/landing/data.ts`, agregar a la columna de footer adecuada (p. ej. la de recursos/producto) un link `{ key: "resources", href: "/recursos" }`, y en `messages/es.json` bajo `landing.footer.columns.<col>.links` agregar `"resources": "Recursos"`.

- [ ] **Step 5: Run the smoke test (valida nav/footer contra i18n)**

Run: `pnpm vitest run test/smoke.test.tsx`
Expected: PASS — el test verifica que cada `NAV_LINK` y link de footer tiene texto en `es.json`.

- [ ] **Step 6: Verify the anchor vs route rendering**

`landing-nav.tsx` renderiza los NAV_LINKS con `<a href>`. Para una ruta interna (`/recursos`), `<a href="/recursos">` funciona (navegación completa). Opcional: si se prefiere `<Link>` para rutas, envolver condicionalmente cuando `href` no empiece con `#`. Mantener simple: `<a>` es aceptable.

- [ ] **Step 7: Commit**

```bash
git add components/landing/data.ts messages/es.json components/landing/landing-nav.tsx
git commit -m "feat(resources): enlace a /recursos en nav y footer"
```

---

### Task 9: Redacción y aprobación del contenido (gate legal)

**Files:**
- Modify: `lib/resources/articles/ley-21719.ts` (contenido final + `reviewed: true`)
- Create: `lib/resources/articles/multas-ley-21719.ts`
- Create: `lib/resources/articles/que-es-el-rat.ts`
- Create: `lib/resources/articles/entrada-en-vigencia-ley-21719.ts`
- Create: `lib/resources/articles/proteccion-datos-salud.ts`
- Modify: `lib/resources/registry.ts` (registrar los nuevos)

**Interfaces:**
- Consumes: `ResourceArticle`. Base factual: reutilizar `lib/legal/citations.ts` y `lib/legal/breach-content.ts` (contenido ya redactado del proyecto) como fuente, manteniendo trazabilidad.

Esta task NO es TDD: es producción de contenido con revisión legal. Proceso por artículo:

- [ ] **Step 1:** El asistente redacta el borrador completo del artículo (título, metaTitle, description, keyword, summary, sections, faq, related) siguiendo la plantilla de `ley-21719.ts`, con `reviewed: false`. Enlazado `related` según el mapa del spec (cada satélite/rubro enlaza al pilar y a 1-2 hermanos).
- [ ] **Step 2:** El abogado especialista revisa la exactitud legal (afirmaciones, artículos citados, plazos). Ajustar según feedback.
- [ ] **Step 3:** Una vez aprobado, cambiar `reviewed: true` y fijar `author.name` al nombre real del revisor.
- [ ] **Step 4:** Registrar cada artículo nuevo en `RESOURCE_ARTICLES` (import + push al array).
- [ ] **Step 5:** Verificar consistencia y build:

Run: `pnpm vitest run test/resources/ && pnpm build`
Expected: PASS; las páginas revisadas ahora sí se prerenderizan y entran al sitemap.

- [ ] **Step 6:** Commit por artículo aprobado:

```bash
git add lib/resources/
git commit -m "content(resources): publicar <slug> (revisado por legal)"
```

Artículos de la Oleada 1 (slugs y keyword objetivo — ver keyword map del spec):
1. `ley-21719` (pilar) — "ley 21.719"
2. `multas-ley-21719` — "multas ley 21.719"
3. `que-es-el-rat` — "registro de actividades de tratamiento"
4. `entrada-en-vigencia-ley-21719` — "cuándo entra en vigencia ley 21.719"
5. `proteccion-datos-salud` (rubro) — "protección de datos pacientes"

Al completar, cada artículo enlaza al pilar y a 1-2 hermanos, y el pilar (`related`) apunta a los 4 satélites/rubro.

---

## Self-Review

**Spec coverage:**
- Arquitectura hub & spoke → Tasks 1-2 (registro + pilar), 4 (related links), 9 (enlazado completo). ✓
- Keyword map → Task 9 (lista de slugs/keywords). ✓
- Plantilla de artículo (resumen, secciones, CTA, FAQ, autoría E-E-A-T) → Task 4. ✓
- JSON-LD Article/FAQPage/BreadcrumbList → Task 3. ✓
- Metadata + canonical + OG por página → Task 5 (artículo) y 6 (índice). ✓
- Sitemap automático → Task 7. ✓
- Nav/footer → Task 8. ✓
- Gate de revisión legal → campo `reviewed` (Tasks 1, 5, 7, 9). ✓
- Medición (Search Console + clics a autoevaluación) → operativo, fuera de código; el CTA a `/self-assessment` (Task 4) es el punto de conversión. ✓

**Placeholder scan:** el contenido de `ley-21719.ts` (Task 2) es borrador explícito con `reviewed:false`; su versión final es la Task 9. No hay TODOs de andamiaje sin resolver.

**Type consistency:** `ResourceArticle` (Task 1) se consume igual en Tasks 2, 3, 4, 5, 6, 7, 9. Funciones: `getArticle`, `getPublishedArticles`, `articleJsonLd` — nombres consistentes en todas las tasks.

**Alcance:** Oleada 1 (MVP). Oleadas 2-3 (resto de satélites y rubros) serán planes posteriores que solo agregan archivos en `lib/resources/articles/` y los registran — sin cambios de andamiaje.
