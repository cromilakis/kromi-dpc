// Next.js instrumentation hook: carga la config de Sentry del runtime activo.
// register() corre una vez al arrancar cada runtime; onRequestError captura los
// errores de renderizado/route handlers en el servidor.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
