import { getTranslations } from "next-intl/server";
import { CountUp } from "./count-up";
import { STAKES } from "./data";
import { WhatsAppButton } from "./whatsapp-button";

/**
 * "Lo que está en juego" — beat de riesgo de la Ley 21.719, extraído del hero
 * (2026-07-05) para que tenga su propia sección y no sature el H1. Tres partes:
 * (1) tabla de sanciones con medidor monocromo de gravedad; (2) caso hipotético
 * como pull-quote con la multa en serif; (3) reflexión + CTA a un especialista.
 * Afirmación legal del caso: requiere validación del abogado antes de publicar
 * (cf. FAQ 'obligation').
 */
export async function StakesSection() {
  const t = await getTranslations("landing");
  // Valores numéricos para el count-up (fuente: i18n, sin duplicar la cifra).
  const amountFrom = Number(t("stakes.example.amountFrom").replace(/\D/g, ""));
  const amountTo = Number(t("stakes.example.amountTo").replace(/\D/g, ""));

  return (
    <section className="mx-auto w-full max-w-[1180px] px-32 pb-[56px] max-sm:px-16">
      {/* Banda de contexto: sanciones de la Ley 21.719 (UTM / CLP) */}
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
                {/* Medidor monocromo: la gravedad se codifica por cantidad y
                    altura de barras (no por color), para reforzar el monocromo
                    y no chocar con la pill amarilla del caso. */}
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
      </div>

      {/* Caso hipotético como pull-quote editorial centrado: la cifra en serif
          es el golpe visual; la reflexión empuja a hablar con un especialista. */}
      <figure className="mt-16 rounded-xl border border-stone bg-[#fbfbfc] px-32 py-[44px] text-center max-sm:px-20">
        <figcaption className="text-caption font-semibold uppercase tracking-[0.4px] text-carbon">
          {t("stakes.example.label")}
        </figcaption>
        <blockquote className="mx-auto mt-16 max-w-[680px] text-subheading font-medium leading-[1.4] tracking-subheading text-ink">
          {t("stakes.example.quote")}
        </blockquote>
        {/* Clasificación con "falta leve" como pill amarilla. */}
        <p className="mt-28 flex flex-wrap items-center justify-center gap-[7px] text-body-sm font-medium text-carbon">
          {t("stakes.example.configuresPrefix")}
          <span className="inline-flex items-center rounded-full bg-warning-yellow px-[10px] py-[2px] text-caption font-semibold uppercase tracking-[0.3px] text-white">
            {t("stakes.example.severityPill")}
          </span>
        </p>
        <p className="mt-16 text-body-sm font-medium text-carbon">
          {t("stakes.example.amountIntro")}
        </p>
        <div className="mt-8 flex flex-col items-center leading-none">
          <CountUp
            value={amountFrom}
            prefix="$"
            className="font-serif text-heading font-medium tracking-heading text-ink"
          />
          <span className="my-[6px] text-caption font-semibold uppercase tracking-[0.4px] text-carbon">
            {t("stakes.example.amountConnector")}
          </span>
          <CountUp
            value={amountTo}
            prefix="$"
            className="font-serif text-heading font-medium tracking-heading text-ink"
          />
        </div>
      </figure>

      {/* Reflexión + CTA: convierte la tensión del caso en acción. */}
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
