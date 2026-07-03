import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui";
import { NAV_LINKS } from "./data";

/**
 * NAV sticky de la landing (prototipo isLanding §NAV): fondo blanco
 * translúcido con blur, borde Stone, 64px de alto. La derecha queda vacía a
 * propósito: el acceso al panel es discreto vía footer (RFC §11).
 * Excepción de marca del lockup logo+tagline: serif Newsreader 17px medium
 * (registrada en .kromi/design.md); la regla "serif >= 28px" rige el resto.
 */
export async function LandingNav() {
  const t = await getTranslations("landing.nav");
  const tCommon = await getTranslations("common");

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
          <span className="font-serif text-[17px] font-medium tracking-[-0.2px] text-ink">
            {tCommon("tagline")}
          </span>
        </Link>
        <nav className="hidden items-center gap-[2px] md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="rounded-buttons px-[10px] py-[6px] text-body-sm font-medium text-metal transition-colors hover:bg-ash hover:text-ink"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
