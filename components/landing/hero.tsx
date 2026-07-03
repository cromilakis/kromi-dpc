import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui";
import { STAKES } from "./data";
import { CheckCircleIcon, DocumentIcon } from "./icons";
import { WhatsAppButton } from "./whatsapp-button";

/**
 * HERO + banda de contexto Ley 21.719 (prototipo isLanding §HERO y §STAKES):
 * pill de urgencia con dot parpadeante, H1 serif display, CTAs duales
 * (autoevaluación + WhatsApp) y card "Lo que está en juego" con las sanciones
 * en UTM/CLP. Sin plazos comprometidos: solo la fecha de vigencia de la ley.
 * Desviación normalizada (prototype-analysis §9.2.2): los rojos saturados de
 * urgencia del prototipo (#e5342b/#a1231f/#fdf3f2) se reemplazan por los
 * tokens semánticos danger-red y sus tintes (#f6e9e8). La excepción verde
 * de WhatsApp fue retirada el 2026-07-03: la paleta es 100% monocroma.
 */
export async function Hero() {
  const t = await getTranslations("landing");

  return (
    <section className="mx-auto w-full max-w-[1180px] px-32 pb-[56px] pt-[96px] text-center max-sm:px-16 max-sm:pt-60">
      {/* Pill de urgencia — Ley 21.719 vigente */}
      <p className="mb-28 inline-flex flex-wrap items-center justify-center gap-[9px] rounded-full border border-danger-red/25 bg-[#f6e9e8] py-[5px] pl-[10px] pr-[14px] text-caption font-semibold text-danger-red">
        {/* motion-safe: sin parpadeo bajo prefers-reduced-motion. */}
        <span
          aria-hidden="true"
          className="h-8 w-8 rounded-full bg-danger-red motion-safe:animate-dpc-blink"
        />
        <span className="inline-flex items-center rounded-full bg-danger-red px-[9px] py-[2px] text-white">
          {t("hero.lawBadge")}
        </span>
        {t("hero.lawNotice")}
      </p>

      <h1 className="mx-auto max-w-[820px] font-serif text-heading font-medium leading-heading tracking-heading text-ink sm:text-heading-lg sm:leading-heading-lg sm:tracking-heading-lg lg:text-display lg:leading-display lg:tracking-display">
        {t("hero.title")}
        {/* Check del titular en Ink: titular monocromo (decisión 2026-07-03). */}
        <span className="ml-[14px] inline-flex -translate-y-[3px] align-middle text-ink">
          <CheckCircleIcon className="max-sm:h-[36px] max-sm:w-[36px]" />
        </span>
      </h1>

      <p className="mx-auto mt-24 max-w-[560px] text-subheading font-medium leading-[1.4] tracking-subheading text-metal">
        {t("hero.subtitle")}
      </p>

      {/* Contraste AA texto pequeño: ≤13px carbon / 14px secundario metal. */}
      <p className="mx-auto mb-12 mt-36 text-[13px] font-semibold tracking-[0.2px] text-carbon">
        {t("hero.quoteLabel")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-[10px]">
        <Link
          href="/autoevaluacion"
          className={buttonClasses("secondary", "gap-[9px] px-[18px] py-[11px]")}
        >
          <DocumentIcon className="shrink-0" />
          {t("hero.ctaSelfAssessment")}
        </Link>
        <span className="text-body-sm font-medium text-metal">
          {t("hero.ctaSeparator")}
        </span>
        <WhatsAppButton message={t("whatsapp.infoMessage")}>
          {t("hero.ctaWhatsApp")}
        </WhatsAppButton>
      </div>

      {/* Banda de contexto: sanciones de la Ley 21.719 (UTM / CLP) */}
      <div className="mt-[56px] overflow-hidden rounded-xl border border-stone bg-white text-left shadow-[rgba(28,40,64,0.08)_0px_8px_24px_-12px]">
        <div className="flex flex-wrap items-center justify-between gap-16 border-b border-ash bg-[#fbfbfc] px-24 py-[18px]">
          <span className="text-[13px] font-semibold tracking-[-0.1px] text-ink">
            {t("stakes.title")}
          </span>
          <span className="text-[13px] font-medium text-metal">
            {t("stakes.note")}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {STAKES.map((stake) => (
            <div
              key={stake.key}
              className="border-ash p-24 max-sm:border-t sm:border-l sm:first:border-l-0 max-sm:first:border-t-0"
            >
              <div className="mb-[14px] flex items-center gap-8">
                <span
                  aria-hidden="true"
                  className={`h-8 w-8 rounded-full ${stake.dotClass}`}
                />
                <span className="text-[13px] font-semibold text-ink">
                  {t(`stakes.items.${stake.key}.severity`)}
                </span>
              </div>
              {/* Prototipo: serif 26px — se sube a 28px (heading-sm) por la
                  regla dura "serif solo >= 28px" de .kromi/design.md. */}
              <div className="font-serif text-heading-sm font-medium leading-heading-sm tracking-heading-sm text-ink">
                {t(`stakes.items.${stake.key}.utm`)}
              </div>
              <div className="mt-4 text-[13px] text-carbon">
                {t(`stakes.items.${stake.key}.clp`)} {t("stakes.clpSuffix")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
