import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Sitemap de las páginas públicas indexables. La autoevaluación es la página de
 * mayor intención comercial, de ahí su prioridad. Se excluyen rutas privadas
 * (/login, /verify) y la ruta que genera el PDF.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/self-assessment"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];
}
