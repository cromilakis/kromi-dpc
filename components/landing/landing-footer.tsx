import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui";
import { FOOTER_COLUMNS } from "./data";

/**
 * Footer Abyss #000 (prototipo isLanding §FOOTER, Style Reference "Page
 * Footer"): columna de marca + 3 columnas de links. El único link funcional
 * es el acceso DISCRETO "Panel del consultor" → /login (RFC §11); el resto
 * son entradas informativas sin destino todavía (fiel al prototipo).
 * Cierra con la línea legal del RFC (§final): DPC no emite certificaciones
 * gubernamentales oficiales.
 */
export async function LandingFooter() {
  const t = await getTranslations("landing.footer");
  const tCommon = await getTranslations("common");
  // Demo estática (GitHub Pages): /login queda fuera del export — el acceso
  // del consultor se muestra como entrada informativa sin destino.
  const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

  return (
    <footer className="bg-abyss text-white">
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-40 px-32 pb-40 pt-[64px] sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] max-sm:px-16">
        <div>
          <div className="mb-[14px] flex items-center gap-[10px]">
            {/* Texto accesible del logo: appName + appFullName (D10). */}
            <Logo
              alt={`${tCommon("appName")} — ${tCommon("appFullName")}`}
              height={30}
              className="invert"
            />
            <span className="text-[15px] font-semibold">{t("brandName")}</span>
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
            <ul className="flex flex-col gap-[10px]">
              {column.links.map((link) => (
                <li key={link.key}>
                  {link.href && !(isStaticDemo && link.href === "/login") ? (
                    <Link
                      href={link.href}
                      className="text-body-sm text-overcast transition-colors hover:text-white"
                    >
                      {t(`columns.${column.key}.links.${link.key}`)}
                    </Link>
                  ) : (
                    <span className="text-body-sm text-overcast">
                      {t(`columns.${column.key}.links.${link.key}`)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto w-full max-w-[1180px] border-t border-ink px-32 pb-40 pt-20 text-caption text-metal max-sm:px-16">
        {t("legalLine")}
      </div>
    </footer>
  );
}
