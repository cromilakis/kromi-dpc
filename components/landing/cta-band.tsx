import { getTranslations } from "next-intl/server";
import { WhatsAppButton } from "./whatsapp-button";

/**
 * CTA intermedio (cambio 2026-07-04): banda de cierre a mitad de página, tras
 * "El entregable" y "Confianza". Recupera al usuario en su punto de mayor
 * interés, ya que entre el hero y la sección de precios había ~4.000px sin
 * llamado a la acción. Banda oscura con un único CTA de WhatsApp (de-duplicación
 * de pares 2026-07-20); el par completo vive en hero y pricing.
 */
export async function CtaBand() {
  const t = await getTranslations("landing.ctaBand");
  const tWhatsApp = await getTranslations("landing.whatsapp");

  return (
    <section className="mx-auto w-full max-w-[1180px] px-32 py-40 max-sm:px-16">
      {/* Banda oscura invertida: ancla visual a mitad de página que rompe la
          racha de secciones claras y hace resaltar el CTA (optimización de
          ritmo 2026-07-05). */}
      <div className="overflow-hidden rounded-xl bg-ink px-32 py-[60px] text-center max-sm:px-20 max-sm:py-44">
        <h2 className="font-serif text-heading-sm font-medium leading-heading-sm tracking-heading-sm text-white">
          {t("title")}
        </h2>
        <p className="mx-auto mt-[14px] max-w-[560px] text-body leading-body tracking-body text-slate">
          {t("subtitle")}
        </p>
        {/* CTA único (decisión 2026-07-20, de-duplicación de pares): en la
            banda de recuperación a mitad de página un solo botón fuerte es más
            contundente que el par; la autoevaluación reaparece en el cierre. */}
        <div className="mt-28 flex justify-center">
          <WhatsAppButton
            inverted
            message={tWhatsApp("assistedMessage")}
            className="px-[22px] py-[13px] text-body"
          >
            {t("ctaWhatsApp")}
          </WhatsAppButton>
        </div>
      </div>
    </section>
  );
}
