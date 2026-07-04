// Sentry — inicialización del runtime Edge (middleware, edge routes). Se importa
// desde instrumentation.ts cuando NEXT_RUNTIME === "edge". DSN vacío → no-op.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  debug: false,
});
