import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { Card, cn } from "@/components/ui";
import {
  riskSeverity,
  severityTintClass,
  type RiskSeverity,
} from "@/lib/risks/severity";

/**
 * Matriz impacto × probabilidad 5×5 — prototipo §1.4.7 extendido por la spec
 * riesgos-gap: celdas con CONTEO de riesgos asignados y tinte por severidad
 * (score I×P: verde/ámbar/rojo, tintes exactos del prototipo vía
 * lib/risks/severity). Server component (getTranslations); eje vertical =
 * probabilidad (5 arriba), eje horizontal = impacto (1 a la izquierda).
 * a11y: cada celda lleva texto sr-only + title con impacto/probabilidad/conteo;
 * labels ≤13px en carbon (regla de contraste del proyecto).
 */

export interface MatrixRisk {
  code: string;
  impact: number;
  probability: number;
}

const SCALE = [1, 2, 3, 4, 5] as const;
const SEVERITY_ORDER: readonly RiskSeverity[] = ["low", "medium", "high"];

export async function RiskMatrix({ risks }: { risks: MatrixRisk[] }) {
  const [t, tSeverities] = await Promise.all([
    getTranslations("app.risks.matrix"),
    getTranslations("app.risks.severities"),
  ]);

  // Conteo por celda: clave "impacto-probabilidad".
  const counts = new Map<string, number>();
  for (const risk of risks) {
    const key = `${risk.impact}-${risk.probability}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return (
    <Card>
      <h2 className="mb-16 text-body-sm font-semibold leading-body-sm tracking-body-sm text-ink">
        {t("title")}
      </h2>

      <div className="grid grid-cols-[24px_repeat(5,minmax(0,1fr))] gap-[6px]">
        {/* Filas: probabilidad 5 → 1 (eje vertical del prototipo). */}
        {[...SCALE].reverse().map((probability) => (
          <Fragment key={probability}>
            <div
              aria-hidden="true"
              className="flex items-center justify-center text-[11px] font-semibold text-carbon"
            >
              {probability}
            </div>
            {SCALE.map((impact) => {
              const count = counts.get(`${impact}-${probability}`) ?? 0;
              const label = t("cellLabel", { impact, probability, count });
              return (
                <div
                  key={impact}
                  title={label}
                  className={cn(
                    "flex min-h-[52px] items-center justify-center rounded-cards",
                    severityTintClass[riskSeverity(impact, probability)],
                  )}
                >
                  {count > 0 ? (
                    <span
                      aria-hidden="true"
                      className="rounded-[5px] bg-white/75 px-[7px] py-[2px] text-caption font-semibold text-ink"
                    >
                      {count}
                    </span>
                  ) : null}
                  <span className="sr-only">{label}</span>
                </div>
              );
            })}
          </Fragment>
        ))}

        {/* Última fila: valores del eje de impacto. */}
        <div />
        {SCALE.map((impact) => (
          <div
            key={impact}
            aria-hidden="true"
            className="text-center text-[11px] font-semibold text-carbon"
          >
            {impact}
          </div>
        ))}
      </div>

      {/* Leyenda del prototipo: cuadrados tintados + nota de ejes. */}
      <div className="mt-16 flex flex-wrap items-center gap-x-16 gap-y-8 border-t border-ash pt-12">
        {SEVERITY_ORDER.map((severity) => (
          <span key={severity} className="flex items-center gap-[6px]">
            <span
              aria-hidden="true"
              className={cn(
                "h-12 w-12 rounded-[3px]",
                severityTintClass[severity],
              )}
            />
            <span className="text-caption leading-caption tracking-caption text-carbon">
              {tSeverities(severity)}
            </span>
          </span>
        ))}
        <span className="text-caption leading-caption tracking-caption text-carbon">
          {t("axesNote")}
        </span>
      </div>
    </Card>
  );
}
