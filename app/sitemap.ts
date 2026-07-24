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
