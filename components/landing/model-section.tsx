import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui";

/**
 * Modelo de servicio (prototipo isLanding §MODELO, anchor #modelo): banda
 * #fbfbfc con dos cards — certificación inicial y revalidación periódica
 * (suscripción sin plazos comprometidos).
 */
export async function ModelSection() {
  const t = await getTranslations("landing.model");

  return (
    <section
      id="modelo"
      className="scroll-mt-[64px] border-y border-ash bg-[#fbfbfc]"
    >
      <div className="mx-auto w-full max-w-[1180px] px-32 py-80 max-sm:px-16 max-sm:py-60">
        <SectionHeading
          align="center"
          title={t("title")}
          description={t("description")}
          className="mb-44"
        />
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
          <div className="rounded-xl border border-stone bg-white p-28">
            <div className="mb-[14px] flex items-center gap-[10px]">
              <span className="rounded-[6px] bg-ash px-[10px] py-4 text-[11px] font-semibold text-carbon">
                {t("initial.chip")}
              </span>
            </div>
            <div className="mb-8 text-subheading font-semibold tracking-[-0.3px] text-ink">
              {t("initial.title")}
            </div>
            <p className="text-body-sm leading-[1.6] text-carbon">
              {t("initial.text")}
            </p>
          </div>
          <div className="rounded-xl border border-stone bg-white p-28">
            <div className="mb-[14px] flex items-center gap-[10px]">
              <span className="rounded-[6px] bg-ash px-[10px] py-4 text-[11px] font-semibold text-carbon">
                {t("recurring.chip")}
              </span>
            </div>
            <div className="mb-8 text-subheading font-semibold tracking-[-0.3px] text-ink">
              {t("recurring.title")}
            </div>
            <p className="mb-16 text-body-sm leading-[1.6] text-carbon">
              {t.rich("recurring.text", {
                b: (chunks) => (
                  <b className="font-semibold text-ink">{chunks}</b>
                ),
              })}
            </p>
            {/* Contraste AA en texto pequeño: carbon (≤13px). */}
            <div className="text-[13px] text-carbon">
              {t("recurring.note")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
