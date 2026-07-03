import Link from "next/link";
import { Logo } from "@/components/ui";

/**
 * Topbar de las páginas públicas secundarias (/autoevaluacion y
 * /verificar/[codigo]) — réplica del topbar del cotizador del prototipo
 * (sticky, logo 36px + tagline, botón "← Volver al sitio").
 * Presentacional: los textos llegan por props desde el server component
 * (cero strings hardcodeados). Excepción de marca del lockup logo+tagline:
 * serif Newsreader medium (registrada en .kromi/design.md), como en LandingNav.
 */
export interface PublicTopbarProps {
  logoAlt: string;
  tagline: string;
  backLabel: string;
}

export function PublicTopbar({ logoAlt, tagline, backLabel }: PublicTopbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-stone bg-white/85 backdrop-blur-[12px]">
      <div className="mx-auto flex h-[64px] w-full max-w-[1080px] items-center justify-between px-32 max-sm:px-16">
        <Link href="/" className="flex items-center gap-[10px]">
          <Logo alt={logoAlt} height={36} priority />
          <span className="font-serif text-body font-medium tracking-[-0.2px] text-ink max-sm:hidden">
            {tagline}
          </span>
        </Link>
        <Link
          href="/"
          className="rounded-buttons border border-slate bg-white px-12 py-8 text-[13px] font-medium text-metal transition-colors hover:bg-ash hover:text-ink"
        >
          {backLabel}
        </Link>
      </div>
    </header>
  );
}
