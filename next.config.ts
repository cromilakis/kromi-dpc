import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

// Wiring next-intl (overlay kromi single-locale): la request config vive en
// i18n/request.ts y sirve messages/es.json a los server components.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Build estático para GitHub Pages (demo pública de la cara pública):
// GITHUB_PAGES=1 activa output:export con basePath /kromi-kpc. El workflow
// .github/workflows/pages.yml excluye antes las rutas con servidor
// (middleware, /app, /login, /verify) y stubea la server action del lead.
const isGitHubPages = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // El logo (fs) debe viajar en el bundle de la función que genera el PDF.
  outputFileTracingIncludes: {
    "/self-assessment/informe": ["./public/kpc-logo.png"],
  },
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath: "/kromi-kpc",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        // Enlace público en español → ruta canónica (no aplica en output:export).
        async redirects() {
          return [
            {
              source: "/autoevaluacion",
              destination: "/self-assessment",
              permanent: true,
            },
          ];
        },
      }),
};

const config = withNextIntl(nextConfig);

// Sentry envuelve la config salvo en el build estático de GitHub Pages
// (output:export no es compatible con la instrumentación server de Sentry, y esa
// demo excluye las rutas con servidor de todas formas). La subida de source maps
// solo ocurre si hay SENTRY_AUTH_TOKEN; sin él, el SDK funciona igual (sin maps).
export default isGitHubPages
  ? config
  : withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
    });
