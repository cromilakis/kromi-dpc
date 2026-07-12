import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui";
import { HeroCipher } from "./hero-cipher";
import { CheckCircleIcon, DocumentIcon } from "./icons";
import { WhatsAppButton } from "./whatsapp-button";

/**
 * HERO de la landing (prototipo isLanding §HERO): pill de urgencia con dot
 * parpadeante, H1 serif display, subtítulo y CTAs duales (WhatsApp cotizar
 * primario + autoevaluación secundaria), con el fondo de "cifrado" (HeroCipher)
 * detrás. La banda "Lo que está en juego" se extrajo a StakesSection (2026-07-05)
 * para que el H1 respire y el beat de riesgo tenga su propia sección.
 * Paleta 100% monocroma; el check del H1 va en ink.
 */
export async function Hero() {
  const t = await getTranslations("landing");

  return (
    <section className="mx-auto w-full max-w-[1180px] px-32 pb-[64px] pt-[96px] text-center max-sm:px-16 max-sm:pt-60">
      {/* Bloque título→CTAs con el fondo de cifrado binario 2D (HeroCipher). */}
      <div className="relative">
        <HeroCipher />
        <div className="relative z-10">
          {/* Pill de urgencia — Ley 21.719 vigente */}
          <p className="mb-28 inline-flex flex-wrap items-center justify-center gap-x-[9px] gap-y-4 rounded-full border border-danger-red/25 bg-[#f6e9e8] py-[5px] pl-[10px] pr-[14px] text-caption font-semibold text-danger-red">
            {/* Dot + badge agrupados: nunca se separan; en móvil el aviso baja a
                una 2ª línea limpia sin dejar el dot huérfano. */}
            <span className="inline-flex items-center gap-[9px]">
              {/* motion-safe: sin parpadeo bajo prefers-reduced-motion. */}
              <span
                aria-hidden="true"
                className="h-8 w-8 rounded-full bg-danger-red motion-safe:animate-dpc-blink"
              />
              <span className="inline-flex items-center rounded-full bg-danger-red px-[9px] py-[2px] text-white">
                {t("hero.lawBadge")}
              </span>
            </span>
            {t("hero.lawNotice")}
          </p>

          <h1 className="mx-auto max-w-[820px] font-serif text-heading font-medium leading-heading tracking-heading text-ink sm:text-heading-lg sm:leading-heading-lg sm:tracking-heading-lg lg:text-display lg:leading-display lg:tracking-display">
            {t("hero.title")}
            {/* Check del titular en ink (monocromo; el verde se retiró 2026-07-05). */}
            <span className="ml-[14px] inline-flex -translate-y-[3px] align-middle text-ink">
              <CheckCircleIcon className="max-sm:h-[36px] max-sm:w-[36px]" />
            </span>
          </h1>

          <p className="mx-auto mt-24 max-w-[560px] text-subheading font-medium leading-[1.4] tracking-subheading text-carbon">
            {t("hero.subtitle")}
          </p>

          <p className="mx-auto mb-12 mt-36 text-[13px] font-semibold tracking-[0.2px] text-carbon">
            {t("hero.quoteLabel")}
          </p>
          {/* Dos modalidades de evaluación: la asistida (agendar reunión con el
              consultor por WhatsApp) es el CTA primario —objetivo de negocio—; la
              autoevaluación gratis queda como alternativa secundaria. */}
          <div className="flex flex-wrap items-center justify-center gap-[10px]">
            <WhatsAppButton
              message={t("whatsapp.assistedMessage")}
              className="px-[22px] py-[13px] text-body"
            >
              {t("hero.ctaWhatsApp")}
            </WhatsAppButton>
            <span className="text-body-sm font-medium text-carbon">
              {t("hero.ctaSeparator")}
            </span>
            <Link
              href="/self-assessment"
              className={buttonClasses("secondary", "gap-[9px] px-[18px] py-[11px]")}
            >
              <DocumentIcon className="shrink-0" />
              {t("hero.ctaSelfAssessment")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
