// Sentry — inicialización del runtime Node (server). Se importa desde
// instrumentation.ts cuando NEXT_RUNTIME === "nodejs". Si NEXT_PUBLIC_SENTRY_DSN
// está vacío, Sentry queda deshabilitado (no-op): seguro sin configurar.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Muestreo de trazas de performance. Tráfico bajo → 100% para empezar; bajar
  // si el volumen de eventos crece.
  tracesSampleRate: 1,
  // Logs estructurados a Sentry (opt-in). No exponer PII en los mensajes.
  enableLogs: true,
  debug: false,
});
