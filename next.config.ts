import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Wiring next-intl (overlay kromi single-locale): la request config vive en
// i18n/request.ts y sirve messages/es.json a los server components.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // i18n/request.ts lee messages/app/*.json vía fs en runtime (deep-merge por
  // módulo): se declaran aquí para que el file tracing de `next build` los
  // incluya en el server bundle (el import estático de es.json ya se tracea).
  outputFileTracingIncludes: {
    "/**": ["./messages/app/*.json"],
  },
};

export default withNextIntl(nextConfig);
