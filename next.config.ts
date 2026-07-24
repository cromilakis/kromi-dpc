import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

// Wiring next-intl (overlay kromi single-locale): la request config vive en
// i18n/request.ts y sirve messages/es.json a los server components.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
  // El logo (fs) debe viajar en el bundle de la función que genera el PDF.
  outputFileTracingIncludes: {
    "/self-assessment/informe": ["./public/kpc-logo.png"],
  },
  // Enlace público en español → ruta canónica.
  async redirects() {
    return [
      {
        source: "/autoevaluacion",
        destination: "/self-assessment",
        permanent: true,
      },
    ];
  },
};

const config = withNextIntl(nextConfig);

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
