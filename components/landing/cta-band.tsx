import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui";
import { DocumentIcon } from "./icons";
import { WhatsAppButton } from "./whatsapp-button";

/**
 * CTA intermedio (cambio 2026-07-04): banda de cierre a mitad de página, tras
 * "El entregable" y "Confianza". Recupera al usuario en su punto de mayor
 * interés, ya que entre el hero y la sección de precios había ~4.000px sin
 * llamado a la acción. Banda clara para que el botón Ink de WhatsApp resalte;
 * mismo orden y estilo que hero/pricing (Cotizar primario → Autoevaluación).
 */
export async function CtaBand() {
  const t = await getTranslations("landing.ctaBand");
  const tWhatsApp = await getTranslations("landing.whatsapp");

  return (
    <section className="mx-auto w-full max-w-[1180px] px-32 py-40 max-sm:px-16">
      <div className="rounded-xl border border-stone bg-[#fbfbfc] px-32 py-[56px] text-center max-sm:px-20 max-sm:py-40">
        <h2 className="font-serif text-heading-sm font-medium leading-heading-sm tracking-heading-sm text-ink">
          {t("title")}
        </h2>
        <p className="mx-auto mt-[14px] max-w-[560px] text-body leading-body tracking-body text-metal">
          {t("subtitle")}
        </p>
        <div className="mt-28 flex flex-wrap items-center justify-center gap-[10px]">
          <WhatsAppButton
            message={tWhatsApp("quoteMessage")}
            className="px-[22px] py-[13px] text-body"
          >
            {t("ctaWhatsApp")}
          </WhatsAppButton>
          <Link
            href="/autoevaluacion"
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
