import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FOOTER_COLUMNS } from "./data";

/**
 * Footer Abyss #000 (prototipo isLanding §FOOTER, Style Reference "Page
 * Footer"): columna de marca + 3 columnas de links. Enlazan (2026-07-04):
 * "Los 14 dominios" → #dominios, "Panel del consultor" → /login (RFC §11,
 * acceso discreto) y las 4 leyes → Ley Chile (BCN, pestaña nueva); el resto
 * son entradas informativas sin destino todavía.
 * Cierra con una línea de marca en positivo ("Estándar privado de cumplimiento").
 * (2026-07-04) Se retiró el disclaimer en negativo del RFC (§final) —"no emite
 * certificaciones gubernamentales oficiales…"— por autosabotear el servicio en
 * la landing; el calificador honesto es "privado". El disclaimer completo debe
 * vivir en el contrato / T&C. PENDIENTE: validar con abogado.
 */
export async function LandingFooter() {
  const t = await getTranslations("landing.footer");
  const tCommon = await getTranslations("common");

  return (
    <footer className="bg-abyss text-white">
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-40 px-32 pb-40 pt-[64px] sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] max-sm:px-16">
        <div>
          <div className="mb-[14px]">
            <span className="font-serif text-[19px] font-medium tracking-[-0.2px] text-white">
              {t("brandName")}
            </span>
          </div>
          <p className="max-w-[280px] text-[13px] leading-[1.6] text-overcast">
            {t("brandDescription")}
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.key}>
            <div className="mb-[14px] text-body-sm font-medium text-white">
              {t(`columns.${column.key}.title`)}
            </div>
            <ul className="flex flex-col gap-[2px]">
              {column.links.map((link) => {
                const label = t(`columns.${column.key}.links.${link.key}`);
                // Área de tap ≥36px (AA 2.5.8 pide ≥24px; los links de footer
                // eran ~20px). inline-flex + min-h da la altura sin inflar el gap.
                const linkClass =
                  "inline-flex min-h-[36px] items-center text-body-sm text-overcast transition-colors hover:text-white";
                if (!link.href) {
                  return (
                    <li key={link.key}>
                      <span className="inline-flex min-h-[36px] items-center text-body-sm text-metal">
                        {label}
                      </span>
                    </li>
                  );
                }
                // Enlaces externos (Ley Chile) → nueva pestaña con rel seguro.
                if (link.external) {
                  return (
                    <li key={link.key}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                      >
                        {label}
                        <span className="sr-only">{tCommon("opensInNewWindow")}</span>
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={link.key}>
                    <Link href={link.href} className={linkClass}>
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto w-full max-w-[1180px] border-t border-ink px-32 pb-40 pt-20 text-center text-caption text-metal max-sm:px-16">
        {t("legalLine")}
      </div>
    </footer>
  );
}
