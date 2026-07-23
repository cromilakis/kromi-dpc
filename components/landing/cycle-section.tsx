import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui";
import { CYCLE_PHASES } from "./data";

/**
 * Ciclo de servicio en 4 fases (prototipo isLanding §CICLO, anchor #ciclo):
 * banda gris #fbfbfc con cards blancas — número de fase, nombre y descripción.
 * Sin plazos comprometidos (RFC §18: los tiempos aún no se miden).
 */
export async function CycleSection() {
  const t = await getTranslations("landing.cycle");

  return (
    <section
      id="ciclo"
      className="scroll-mt-[64px] border-y border-ash bg-haze"
    >
      <div className="mx-auto w-full max-w-[1180px] px-32 py-80 max-sm:px-16 max-sm:py-60">
        <SectionHeading
          align="left"
          eyebrow={t("eyebrow")}
          title={t("title")}
          className="mb-48"
        />
        {/* Línea de tiempo conectada: es una secuencia real (4 fases), así que
            los números encadenados comunican orden en vez de 4 tarjetas sueltas
            (quiebre de ritmo 2026-07-05). */}
        <div className="relative">
          {/* Riel conector center-to-center (solo desktop). */}
          <div
            aria-hidden="true"
            data-cy-rail
            className="absolute left-[16.667%] right-[16.667%] top-[19px] hidden h-px bg-stone lg:block"
          />
          <ol className="grid grid-cols-1 gap-y-10 lg:grid-cols-3 lg:gap-x-8">
            {CYCLE_PHASES.map((phase, i) => (
              <li
                key={phase}
                className="relative flex items-start gap-16 lg:flex-col lg:items-center lg:gap-0 lg:text-center"
              >
                <span
                  data-cy-node
                  className="relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-stone bg-white font-serif text-[18px] leading-none text-ink"
                >
                  {i + 1}
                </span>
                <div className="lg:mt-16">
                  <div className="text-[18px] font-semibold tracking-[-0.3px] text-ink">
                    {t(`phases.${phase}.name`)}
                  </div>
                  <p className="mt-6 text-[13px] leading-[1.5] text-carbon lg:mx-auto lg:max-w-[220px]">
                    {t(`phases.${phase}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
