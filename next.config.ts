import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

// Wiring next-intl (overlay kromi single-locale): la request config vive en
// i18n/request.ts y sirve messages/es.json a los server components.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Build estático para GitHub Pages (demo pública de la cara pública):
// GITHUB_PAGES=1 activa output:export con basePath /kromi-dpc. El workflow
// .github/workflows/pages.yml excluye antes las rutas con servidor
// (middleware, /app, /login, /verificar) y stubea la server action del lead.
const isGitHubPages = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = {
  // i18n/request.ts lee messages/app/*.json vía fs en runtime (deep-merge por
  // módulo): se declaran aquí para que el file tracing de `next build` los
  // incluya en el server bundle (el import estático de es.json ya se tracea).
  outputFileTracingIncludes: {
    "/**": ["./messages/app/*.json"],
  },
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath: "/kromi-dpc",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
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
      disableLogger: true,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
    });
