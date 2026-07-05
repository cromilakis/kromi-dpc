import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui";
import { SUPPORT_ITEMS } from "./data";

/**
 * Acompañamiento consultor (prototipo isLanding §ACOMPAÑAMIENTO): grid de 4
 * cards — consultor asignado, asesoría, implementación y seguimiento.
 */
export async function SupportSection() {
  const t = await getTranslations("landing.support");

  return (
    <section className="mx-auto w-full max-w-[1180px] px-32 py-80 max-sm:px-16 max-sm:py-60">
      <SectionHeading
        align="center"
        title={t("title")}
        description={t("description")}
        className="mb-48"
      />
      <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPORT_ITEMS.map((item) => (
          <div
            key={item}
            className="rounded-cards border border-stone bg-white p-[22px]"
          >
            <div className="mb-[10px] text-body font-semibold tracking-[-0.2px] text-ink">
              {t(`items.${item}.title`)}
            </div>
            <p className="text-[13px] leading-[1.55] text-carbon">
              {t(`items.${item}.text`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
