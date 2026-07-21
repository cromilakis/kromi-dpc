import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui";
import { NAV_LINKS } from "./data";
import { MenuIcon } from "./icons";
import { WhatsAppButton } from "./whatsapp-button";

/**
 * NAV sticky de la landing (prototipo isLanding §NAV): fondo blanco
 * translúcido con blur, borde Stone, 64px de alto. A la derecha, los anchors
 * de sección (solo desktop) + un CTA "Reservar evaluación" primario SIEMPRE visible
 * (también en móvil) que abre WhatsApp con el mensaje de cotización — camino
 * de conversión persistente durante todo el scroll (cambio 2026-07-04).
 * Excepción de marca del lockup logo+tagline: serif Newsreader 17px medium
 * (registrada en .kromi/design.md); la regla "serif >= 28px" rige el resto.
 */
export async function LandingNav() {
  const t = await getTranslations("landing.nav");
  const tCommon = await getTranslations("common");
  const tWhatsApp = await getTranslations("landing.whatsapp");

  return (
    <header className="sticky top-0 z-50 border-b border-stone bg-white/85 backdrop-blur-[12px]">
      <div className="mx-auto flex h-[64px] w-full max-w-[1180px] items-center justify-between px-32 max-sm:px-16">
        <Link href="/" className="flex items-center gap-[10px]">
          {/* Texto accesible del logo: appName + appFullName (D10). */}
          <Logo
            alt={`${tCommon("appName")} — ${tCommon("appFullName")}`}
            height={44}
            priority
          />
          {/* Tagline oculto en móvil para dejar espacio al CTA de cotizar. */}
          <span className="font-serif text-[17px] font-medium tracking-[-0.2px] text-ink max-sm:hidden">
            {tCommon("tagline")}
          </span>
        </Link>
        <div className="flex items-center gap-[6px]">
          <nav className="hidden items-center gap-[2px] md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.key}
                href={link.href}
                className="rounded-buttons px-[10px] py-[6px] text-body-sm font-medium text-carbon transition-colors hover:bg-ash hover:text-ink"
              >
                {t(link.key)}
              </a>
            ))}
          </nav>
          <WhatsAppButton
            message={tWhatsApp("assistedMessage")}
            className="ml-[6px] px-[14px] py-[8px] max-sm:ml-0"
          >
            {t("cta")}
          </WhatsAppButton>
          {/* Menú móvil sin JS (CSS-only <details>): recupera los anchors de
              sección en teléfono, que antes solo existían en desktop. */}
          <details className="relative md:hidden">
            <summary
              className="flex h-[38px] w-[38px] cursor-pointer list-none items-center justify-center rounded-buttons border border-slate text-ink [&::-webkit-details-marker]:hidden"
              aria-label={t("menu")}
            >
              <MenuIcon />
            </summary>
            <nav className="absolute right-0 top-[calc(100%+8px)] flex w-[220px] flex-col rounded-cards border border-stone bg-white p-8 shadow-subtle-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  className="rounded-buttons px-12 py-[12px] text-body-sm font-medium text-carbon transition-colors hover:bg-ash hover:text-ink"
                >
                  {t(link.key)}
                </a>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
