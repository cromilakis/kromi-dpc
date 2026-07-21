import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui";
import { STAKES } from "./data";
import { DocumentIcon } from "./icons";

/**
 * "Qué establece la Ley 21.719" — beat informativo (no de miedo): presenta el
 * marco de la ley con sobriedad y lo enmarca en acompañamiento. Dos partes:
 * (1) tabla de sanciones con medidor monocromo de gravedad, como dato factual;
 * (2) "¿Alguna te suena?" — preguntas cotidianas de reconocimiento (espejo de
 * los nodos S-006/S-007/S-009/S-010/S-011/S-014 de la autoevaluación) que cierran en apoyo
 * y en los dos caminos de conversión. Reemplaza al "caso cotidiano" único
 * (2026-07-20): las preguntas permiten que cualquier rubro se reconozca, no
 * solo el retail. El enfoque sigue siendo asesorar, no amenazar con multas.
 */
export async function StakesSection() {
  const t = await getTranslations("landing");

  return (
    <section
      id="riesgo"
      className="mx-auto w-full max-w-[1180px] scroll-mt-[64px] px-32 pb-[56px] max-sm:px-16"
    >
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

      {/* "¿Alguna te suena?" — preguntas de reconocimiento: el lector se ve
          reflejado en situaciones cotidianas y el cierre reencuadra en apoyo
          (nunca en amenaza) con los dos caminos de conversión. */}
      <div className="mt-16 rounded-xl border border-stone bg-[#fbfbfc] px-32 py-40 max-sm:px-20">
        <p className="text-center text-caption font-semibold uppercase tracking-[0.4px] text-carbon">
          {t("stakes.everyday.label")}
        </p>
        <ul className="mx-auto mt-24 grid max-w-[880px] gap-x-32 gap-y-16 sm:grid-cols-2">
          {(t.raw("stakes.everyday.items") as string[]).map((question) => (
            <li key={question} className="flex gap-[10px]">
              <span
                aria-hidden
                className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-ink"
              />
              <span className="text-body-sm font-medium leading-[1.55] text-ink">
                {question}
              </span>
            </li>
          ))}
        </ul>
        <div className="mx-auto mt-32 max-w-[620px] text-center">
          <p className="mx-auto max-w-[560px] text-body-sm leading-[1.6] text-carbon">
            {t("stakes.everyday.closeLead")}{" "}
            <b className="font-semibold text-ink">
              {t("stakes.everyday.closeSupport")}
            </b>
          </p>
          <p className="mx-auto mt-16 max-w-[540px] text-subheading font-medium leading-[1.35] tracking-subheading text-ink">
            {t("stakes.everyday.question")}
          </p>
          {/* CTA único (decisión 2026-07-20, de-duplicación de pares): tras
              reconocerse en las preguntas, el puente natural es la
              autoevaluación gratis; el camino WhatsApp queda siempre a mano en
              el CTA sticky del nav. */}
          <div className="mt-20 flex justify-center">
            <Link
              href="/self-assessment"
              className={buttonClasses("primary", "gap-[9px] px-[22px] py-[13px] text-body")}
            >
              <DocumentIcon className="shrink-0" />
              {t("stakes.everyday.ctaSelfAssessment")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
