/**
 * Construcción de enlaces wa.me para los CTA de WhatsApp de la cara pública.
 * El número sale de NEXT_PUBLIC_WHATSAPP_NUMBER (inlined en build por Next).
 */

// Número real de KPC (fallback si no se define NEXT_PUBLIC_WHATSAPP_NUMBER).
const FALLBACK_WHATSAPP_NUMBER = "56945131427";

/** URL de WhatsApp con mensaje prellenado (los mensajes viven en es.json). */
export function whatsappUrl(message: string): string {
  const number =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || FALLBACK_WHATSAPP_NUMBER;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
