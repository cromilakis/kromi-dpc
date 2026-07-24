import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/site";

/**
 * robots.txt: permite el rastreo del sitio público y bloquea rutas privadas o
 * sin valor de indexación (panel del consultor, verificación, API y la
 * generación del PDF). Declara el sitemap para acelerar el descubrimiento.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/verify",
        "/api/",
        "/self-assessment/informe",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
