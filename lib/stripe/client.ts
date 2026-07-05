import "server-only";
import Stripe from "stripe";

/**
 * Cliente Stripe — EXCLUSIVO de servidor (server actions / route handlers).
 * `STRIPE_SECRET_KEY` (modo TEST: `sk_test_…`) sin prefijo NEXT_PUBLIC_: Next
 * jamás lo inyecta en bundles de cliente. Mismo criterio de degradación que
 * el resto de integraciones opcionales del proyecto (ver lib/llm/deepseek.ts
 * / LlmError): sin la key, el flujo de pago se deshabilita con un error
 * tipado en vez de reventar — la propuesta/aceptación (Tareas 2-3) no
 * dependen de Stripe.
 *
 * No se fija `apiVersion` explícito: se usa el default del SDK instalado
 * (Stripe recomienda fijarlo solo cuando se necesita anclar una versión
 * concreta del API; el paquete ya trae su versión soportada por defecto).
 */
export class StripeError extends Error {
  constructor(
    public code: "disabled" | "failed",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "StripeError";
  }
}

let cached: Stripe | null = null;

/** Devuelve la instancia de Stripe server-only; lanza StripeError('disabled') sin key. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new StripeError("disabled", "STRIPE_SECRET_KEY no configurada");
  }
  if (!cached) {
    cached = new Stripe(key);
  }
  return cached;
}
