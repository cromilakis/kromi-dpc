// Sentry — inicialización del cliente (browser). Next.js carga este archivo
// automáticamente en el bundle del cliente. DSN vacío → no-op.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  debug: false,
});

// Instrumenta las transiciones del App Router para trazas de navegación.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
