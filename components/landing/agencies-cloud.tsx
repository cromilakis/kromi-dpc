import { getTranslations } from "next-intl/server";
import { AGENCIES } from "./data";

/**
 * Logo cloud del ecosistema regulatorio (prototipo isLanding §LOGO CLOUD):
 * wordmarks tipográficos grises, sin logos gráficos (Style Reference
 * "Logo Cloud Item": grayscale, sin fondo ni borde).
 * Contraste: label 13px y wordmarks 16px/600 en Carbon (AA ≥7:1).
 */
export async function AgenciesCloud() {
  const t = await getTranslations("landing.agencies");

  return (
    <section className="mx-auto w-full max-w-[1180px] px-32 pb-80 text-center max-sm:px-16 max-sm:pb-60">
      <p className="mb-24 text-[13px] font-medium text-carbon">
        {t("label")}
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-x-44 gap-y-32">
        {AGENCIES.map((agency) => (
          <li
            key={agency}
            className="text-body font-semibold tracking-[-0.2px] text-carbon"
          >
            {t(`items.${agency}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}
