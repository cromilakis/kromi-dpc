import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/components/ui";
import { WhatsAppIcon } from "./icons";
import { whatsappUrl } from "./whatsapp";

/**
 * CTA de WhatsApp — botón primario del design system (Ink #1c1d1f, texto
 * blanco). Decisión 2026-07-03: se elimina la excepción verde #25D366
 * (prototype-analysis §9.2.1); el canal se señala solo con el ícono.
 * Server component (async): resuelve el aviso sr-only de target="_blank"
 * (common.opensInNewWindow) sin exigirlo por props en cada call site.
 */
export interface WhatsAppButtonProps {
  /** Mensaje prellenado (texto de es.json, sin encodear). */
  message: string;
  children: ReactNode;
  className?: string;
}

export async function WhatsAppButton({
  message,
  children,
  className,
}: WhatsAppButtonProps) {
  const tCommon = await getTranslations("common");

  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-[9px] rounded-buttons",
        "border border-ink bg-ink text-white",
        "px-[18px] py-[11px] text-body-sm leading-body-sm tracking-body-sm font-medium",
        "transition-opacity hover:opacity-90",
        className,
      )}
    >
      <WhatsAppIcon className="shrink-0" />
      {children}
      {/* target="_blank" anunciado a lectores de pantalla. */}
      <span className="sr-only">{tCommon("opensInNewWindow")}</span>
    </a>
  );
}
