import { getTranslations } from "next-intl/server";
import { STAKES } from "./data";
import { WhatsAppButton } from "./whatsapp-button";

/**
 * "Qué establece la Ley 21.719" — beat informativo (no de miedo): presenta el
 * marco de la ley con sobriedad y lo enmarca en acompañamiento. Tres partes:
 * (1) tabla de sanciones con medidor monocromo de gravedad, como dato factual;
 * (2) un caso cotidiano enmarcado como algo que se identifica y se corrige con
 * apoyo; (3) reflexión + CTA a conversar con un especialista. El enfoque es
 * asesorar y apoyar el cumplimiento, no amenazar con multas.
 */
export async function StakesSection() {
  const t = await getTranslations("landing");

  return (
    <section className="mx-auto w-full max-w-[1180px] px-32 pb-[56px] max-sm:px-16">
      {/* Banda de contexto: sanciones de la Ley 21.719 (UTM / CLP) como dato. */}
      <div className="overflow-hidden rounded-xl border border-stone bg-white text-left shadow-[rgba(28,40,64,0.08)_0px_8px_24px_-12px]">
        <div className="flex flex-wrap items-center justify-between gap-16 border-b border-ash bg-[#fbfbfc] px-24 py-[18px]">
          <span className="text-[13px] font-semibold tracking-[-0.1px] text-ink">
            {t("stakes.title")}
          </span>
          <span className="text-[13px] font-medium text-carbon">
            {t("stakes.note")}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {STAKES.map((stake) => (
            <div
              key={stake.key}
              className="border-ash p-24 max-sm:border-t sm:border-l sm:first:border-l-0 max-sm:first:border-t-0"
            >
              <div className="mb-[14px] flex items-center gap-[10px]">
                {/* Medidor monocromo: gravedad por cantidad y altura de barras. */}
                <span aria-hidden="true" className="flex items-end gap-[3px]">
                  {[6, 10, 14].map((h, bar) => (
                    <span
                      key={h}
                      style={{ height: h }}
                      className={`w-[4px] rounded-full ${
                        bar < stake.level ? "bg-ink" : "bg-stone"
                      }`}
                    />
                  ))}
                </span>
                <span className="text-[13px] font-semibold text-ink">
                  {t(`stakes.items.${stake.key}.severity`)}
                </span>
              </div>
              {/* Serif solo >= 28px (heading-sm) por la regla de .kromi/design.md. */}
              <div className="font-serif text-heading-sm font-medium leading-heading-sm tracking-heading-sm text-ink">
                {t(`stakes.items.${stake.key}.utm`)}
              </div>
              <div className="mt-4 text-[13px] text-carbon">
                {t(`stakes.items.${stake.key}.clp`)}
              </div>
            </div>
          ))}
        </div>
        {/* Cierre: encuadre de apoyo — cumplir es abordable y te acompañamos. */}
        <div className="border-t border-ash bg-[#fbfbfc] px-24 py-[18px]">
          <p className="text-[13px] leading-[1.55] text-carbon">
            <b className="font-semibold text-ink">{t("stakes.supportLead")}</b>{" "}
            {t("stakes.support")}
          </p>
        </div>
      </div>

      {/* Caso cotidiano como pull-quote editorial: se clasifica la situación y
          se enmarca como algo que identificamos y corregimos contigo. */}
      <figure className="mt-16 rounded-xl border border-stone bg-[#fbfbfc] px-32 py-[44px] text-center max-sm:px-20">
        <figcaption className="text-caption font-semibold uppercase tracking-[0.4px] text-carbon">
          {t("stakes.example.label")}
        </figcaption>
        <blockquote className="mx-auto mt-16 max-w-[680px] text-subheading font-medium leading-[1.4] tracking-subheading text-ink">
          {t("stakes.example.quote")}
        </blockquote>
        <p className="mt-28 flex flex-wrap items-center justify-center gap-[7px] text-body-sm font-medium text-carbon">
          {t("stakes.example.configuresPrefix")}
          <span className="inline-flex items-center rounded-full bg-warning-yellow px-[10px] py-[2px] text-caption font-semibold uppercase tracking-[0.3px] text-white">
            {t("stakes.example.severityPill")}
          </span>
        </p>
        <p className="mx-auto mt-16 max-w-[560px] text-body-sm leading-[1.6] text-carbon">
          {t("stakes.example.supportNote")}
        </p>
      </figure>

      {/* Reflexión + CTA: invita a revisar la situación con apoyo. */}
      <div className="mx-auto mt-24 max-w-[620px] text-center">
        <p className="mx-auto max-w-[600px] text-body-sm font-medium leading-[1.6] text-carbon">
          {t("stakes.reflect.lead")}
        </p>
        <p className="mx-auto mt-16 max-w-[540px] text-subheading font-medium leading-[1.35] tracking-subheading text-ink">
          {t("stakes.reflect.question")}
        </p>
        <WhatsAppButton
          message={t("whatsapp.verifyMessage")}
          className="mt-20 px-[22px] py-[13px] text-body"
        >
          {t("stakes.reflect.cta")}
        </WhatsAppButton>
      </div>
    </section>
  );
}
