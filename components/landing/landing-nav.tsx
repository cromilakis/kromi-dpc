import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo, buttonClasses } from "@/components/ui";
import { NAV_LINKS } from "./data";
import { MenuIcon } from "./icons";

/**
 * NAV sticky de la landing (prototipo isLanding §NAV): fondo blanco
 * translúcido con blur, borde Stone, 64px de alto. A la derecha, los anchors
 * de sección (solo desktop) + un botón "Ingreso" SIEMPRE visible (también en
 * móvil) que lleva a /login (cambio 2026-07-21: ya existe el portal del
 * cliente). El ruteo por rol resuelve el destino: consultor → /app, cliente
 * → /portal (rebote en app/app/layout.tsx). La captación (WhatsApp +
 * autoevaluación) vive en hero, la banda intermedia y pricing.
 * Excepción de marca del lockup logo+tagline: serif Newsreader 17px medium
 * (registrada en .kromi/design.md); la regla "serif >= 28px" rige el resto.
 */
export async function LandingNav() {
  const t = await getTranslations("landing.nav");
  const tCommon = await getTranslations("common");

  return (
    <header className="sticky top-0 z-50 border-b border-stone bg-white/85 backdrop-blur-[12px]">
      <div className="mx-auto flex h-[64px] w-full max-w-[1180px] items-center justify-between px-32 max-sm:px-16">
        <Link href="/" className="flex items-center">
          {/* Logo lockup KPC | Kromi Privacy Center (el alt lleva appName + appFullName). */}
          <Logo
            alt={`${tCommon("appName")} — ${tCommon("appFullName")}`}
            height={30}
            priority
          />
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
          <Link
            href="/self-assessment"
            className={buttonClasses(
              "primary",
              "ml-[6px] px-[18px] py-[12px] max-sm:ml-0",
            )}
          >
            {t("cta")}
          </Link>
          {/* Menú móvil sin JS (CSS-only <details>): recupera los anchors de
              sección en teléfono, que antes solo existían en desktop. */}
          <details className="relative md:hidden">
            <summary
              className="flex h-44 w-44 cursor-pointer list-none items-center justify-center rounded-buttons border border-slate text-ink [&::-webkit-details-marker]:hidden"
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
