/**
 * Contacto por WhatsApp — único gancho comercial del sitio. No se cobra por
 * nada de lo que se hace en la página; si el cliente quiere apoyo para
 * implementar la propuesta, este es el canal. La estimación/cotización ocurre
 * ahí, fuera del sitio.
 *
 * El número se toma de `NEXT_PUBLIC_WHATSAPP_NUMBER` (formato internacional sin
 * "+", p. ej. 56912345678); si no está definido, cae al número real de KPC.
 */
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "56945131427";

/** Construye un enlace wa.me con un mensaje inicial opcional. */
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
