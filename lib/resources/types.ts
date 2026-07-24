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
