/**
 * Metadatos del sitio para SEO (metadata, canonical, robots, sitemap, JSON-LD).
 * La URL canónica de producción es kpc.kromi.cl; se puede sobreescribir con
 * NEXT_PUBLIC_SITE_URL (p. ej. para previews). Sin barra final.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kpc.kromi.cl"
).replace(/\/$/, "");

export const SITE_NAME = "KPC — Kromi Privacy Center";

/** Nombre de la organización para el JSON-LD Organization. */
export const ORG_NAME = "Kromi Privacy Center";

/** Descripción por defecto (fallback y Open Graph del home). */
export const SITE_DESCRIPTION =
  "Autoevaluación gratuita de cumplimiento de la Ley 21.719 de protección de datos personales en Chile: diagnóstico instantáneo, propuesta de mitigación por brecha e implementación con acompañamiento profesional.";

/** Construye una URL absoluta a partir de una ruta relativa. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
