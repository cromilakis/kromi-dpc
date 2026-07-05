import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SectionHeading, buttonClasses, cn } from "@/components/ui";
import { PRICING_TIERS } from "./data";
import { DocumentIcon } from "./icons";
import { WhatsAppButton } from "./whatsapp-button";

/**
 * La inversión + CTA final (prototipo isLanding §CTA, anchor #certificacion):
 * precios base con ancla honesta "desde" (5 UF micro / 15 UF pequeña /
 * enterprise bajo cotización), disclaimer legal (RFC §14) y CTAs de cierre.
 * La card Enterprise va invertida (fondo Ink).
 */
export async function PricingSection() {
  const t = await getTranslations("landing.pricing");
  const tWhatsApp = await getTranslations("landing.whatsapp");

  return (
    <section
      id="certificacion"
      className="mx-auto w-full max-w-[1180px] scroll-mt-[64px] px-32 py-[72px] max-sm:px-16 max-sm:py-60"
    >
      <SectionHeading
        align="center"
        title={t("title")}
        description={t("description")}
        className="mb-40"
      />

      <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
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
            {tier.hasBasePrice ? (
              /* Contraste AA texto pequeño: ≤13px carbon / 14px secundario metal. */
              <>
                <div className="text-caption text-carbon">{t("from")}</div>
                <div className="font-serif text-[34px] font-medium leading-[1.15] tracking-[-0.6px] text-ink">
                  {t(`tiers.${tier.key}.price`)}{" "}
                  <span className="font-sans text-body-sm text-carbon">
                    {t("vat")}
                  </span>
                </div>
                <div className="mt-[2px] text-caption text-carbon">
                  {t("baseNote")}
                </div>
              </>
            ) : (
              <>
                <div className="mt-[18px] font-serif text-[34px] font-medium leading-[1.15] tracking-[-0.6px] text-white">
                  {t(`tiers.${tier.key}.price`)}
                </div>
                <div className="mt-[6px] text-caption text-lead">
                  {t(`tiers.${tier.key}.note`)}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Barra final: disclaimer legal + CTAs de cierre */}
      <div className="mt-24 flex flex-wrap items-center justify-between gap-16 border-t border-ash pt-24">
        <p className="max-w-[520px] text-[13px] leading-[1.5] text-carbon">
          {t("disclaimer")}
        </p>
        {/* Mismo orden que el hero: Cotizar (primario) → Autoevaluación. */}
        <div className="flex flex-wrap items-center gap-[10px]">
          <WhatsAppButton message={tWhatsApp("quoteMessage")}>
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
