import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SectionHeading, buttonClasses, cn } from "@/components/ui";
import {
  BASE_UF,
  formatClp,
  formatUf,
  launchPriceUf,
  listPriceUf,
  UF_CLP,
} from "@/lib/self-assessment/pricing";
import { PRICING_TIERS } from "./data";
import { DocumentIcon } from "./icons";
import { WhatsAppButton } from "./whatsapp-button";

/**
 * La inversión + CTA final (prototipo isLanding §CTA, anchor #certificacion):
 * precios base con ancla honesta "desde" (10 UF micro / 25 UF pequeña /
 * enterprise desde 60 UF, bajo cotización) y capa de lanzamiento: precio de
 * lista tachado y precio de lanzamiento con el 20% de descuento
 * (lib/self-assessment/pricing es la fuente de los cálculos).
 * Disclaimer legal (RFC §14) y CTAs de cierre. La card Enterprise va invertida.
 */
export async function PricingSection() {
  const t = await getTranslations("landing.pricing");
  const tWhatsApp = await getTranslations("landing.whatsapp");

  return (
    <section
      id="certificacion"
      className="mx-auto w-full max-w-[1180px] scroll-mt-[64px] px-32 py-[72px] max-sm:px-16 max-sm:py-60"
    >
      <div className="mb-16 flex justify-center">
        <span className="inline-flex items-center rounded-full border border-ink/15 bg-ash px-12 py-[5px] text-caption font-semibold text-ink">
          {t("launchEyebrow")}
        </span>
      </div>

      <SectionHeading
        align="center"
        title={t("title")}
        description={t("description")}
        className="mb-40"
      />

      <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const launch = formatUf(launchPriceUf(BASE_UF[tier.key]));
          const normal = formatUf(listPriceUf(BASE_UF[tier.key]));
          // Traducción a pesos (P1 critique 2026-07-20): la página convierte
          // las multas a CLP pero no convertía los precios; el dueño de pyme
          // debía saber el valor de la UF justo en la decisión de compra.
          // Redondeado al millar con "≈", misma convención que stakes.
          const clpApprox = formatClp(
            Math.round((launchPriceUf(BASE_UF[tier.key]) * UF_CLP) / 1000) * 1000,
          );
          return (
            <div
              key={tier.key}
              className={cn(
                "rounded-xl border p-28",
                tier.inverted
                  ? "border-ink bg-ink text-white"
                  : "border-stone bg-white",
              )}
            >
              <div
                className={cn(
                  "mb-16 text-body font-semibold tracking-[-0.2px]",
                  tier.inverted ? "text-white" : "text-ink",
                )}
              >
                {t(`tiers.${tier.key}.name`)}
              </div>
              {/* Contraste AA texto pequeño: ≤13px carbon / 14px secundario metal. */}
              <div
                className={cn(
                  "text-caption",
                  tier.inverted ? "text-lead" : "text-carbon",
                )}
              >
                {t("from")}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-10 gap-y-2">
                <span
                  className={cn(
                    "font-serif text-[34px] font-medium leading-[1.15] tracking-[-0.6px]",
                    tier.inverted ? "text-white" : "text-ink",
                  )}
                >
                  {/* Enterprise va bajo cotización: mostrar un descuento
                      tachado sobre un precio no-fijo debilita ambos (P3
                      critique 2026-07-20) — solo el valor base "desde". */}
                  {tier.hasBasePrice ? launch : normal} UF
                </span>
                {tier.hasBasePrice && (
                  <span className="text-body-sm text-carbon line-through">
                    {normal} UF
                  </span>
                )}
                {tier.hasBasePrice && (
                  <span className="font-sans text-body-sm text-carbon">
                    {t("vat")}
                  </span>
                )}
              </div>
              {tier.hasBasePrice && (
                <div className="mt-[2px] text-caption font-medium text-carbon">
                  {t("clpApprox", { amount: clpApprox })}
                </div>
              )}
              <div
                className={cn(
                  "mt-[2px] text-caption",
                  tier.inverted ? "text-lead" : "text-carbon",
                )}
              >
                {tier.hasBasePrice ? t("baseNote") : t("tiers.enterprise.note")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra final: disclaimer legal + CTAs de cierre */}
      <div className="mt-24 flex flex-wrap items-center justify-between gap-16 border-t border-ash pt-24">
        <p className="max-w-[520px] text-[13px] leading-[1.5] text-carbon">
          {t("disclaimer")}
        </p>
        {/* Mismo orden que el hero: Reservar evaluación (primario) → Autoevaluación. */}
        <div className="flex flex-wrap items-center gap-[10px]">
          <WhatsAppButton message={tWhatsApp("assistedMessage")}>
            {t("ctaWhatsApp")}
          </WhatsAppButton>
          <Link
            href="/self-assessment"
            className={buttonClasses("secondary", "gap-[9px] px-[18px] py-[11px]")}
          >
            <DocumentIcon className="shrink-0" />
            {t("ctaSelfAssessment")}
          </Link>
        </div>
      </div>
    </section>
  );
}
