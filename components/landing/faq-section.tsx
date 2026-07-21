import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui";
import { FAQ_ITEMS } from "./data";
import { ChevronDownIcon } from "./icons";

/**
 * FAQ (Tier 2 del estudio UI/UX, 2026-07-04): cierra objeciones del usuario no
 * técnico antes de la sección de precios. Acordeón nativo <details>/<summary>:
 * accesible y sin JS de cliente (server component). El chevron rota en
 * [open] vía group-open. Nota: la respuesta "obligation" hace una afirmación
 * legal conservadora — pendiente de validación con el abogado.
 */
export async function FaqSection() {
  const t = await getTranslations("landing.faq");

  return (
    <section className="mx-auto w-full max-w-[820px] px-32 py-80 max-sm:px-16 max-sm:py-60">
      <SectionHeading
        align="center"
        title={t("title")}
        className="mb-40"
      />
      <ul className="flex flex-col gap-[10px]">
        {FAQ_ITEMS.map((item) => (
          <li key={item}>
            <details className="group rounded-cards border border-stone bg-white [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-16 px-20 py-[18px] text-body font-semibold tracking-[-0.2px] text-ink">
                {t(`items.${item}.q`)}
                <ChevronDownIcon className="shrink-0 text-carbon transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="max-w-[70ch] px-20 pb-[18px] text-body-sm leading-[1.6] text-carbon">
                {t(`items.${item}.a`)}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
