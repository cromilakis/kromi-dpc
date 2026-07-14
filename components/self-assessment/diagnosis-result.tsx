"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui";
import {
  groupBreachesByAreaSeverity,
  RISK_LEVEL_LABELS,
  type FullDiagnosisResult,
  type RiskLevel,
  type Severity,
} from "@/lib/legal";

// Severidad en la paleta monocroma del sistema (acento solo con significado):
// crítico → danger-red (oxblood), alto → warning-yellow (ocre), medio/bajo
// neutros. Nada de rojos/naranjas saturados.
const SEVERITY: Record<
  Severity,
  { text: string; tag: string; fill: string }
> = {
  critico: {
    text: "text-danger-red",
    tag: "bg-danger-red/10 text-danger-red",
    fill: "bg-danger-red",
  },
  alto: {
    text: "text-warning-yellow",
    tag: "bg-warning-yellow/10 text-warning-yellow",
    fill: "bg-warning-yellow",
  },
  medio: { text: "text-carbon", tag: "bg-ash text-carbon", fill: "bg-carbon" },
  bajo: { text: "text-metal", tag: "bg-ash text-metal", fill: "bg-metal" },
};

const LEVEL_ORDER: RiskLevel[] = ["bajo", "medio", "alto", "critico"];

export interface DiagnosisResultPanelProps {
  /** Diagnóstico completo (screening + profundización + inferencia). */
  result: FullDiagnosisResult;
  /**
   * Abre el flujo de captura del lead ("Obtener el diagnóstico completo").
   * Opcional: cuando se omite (p. ej. flujo asistido del consultor, que ya
   * tiene su propio botón de guardado) el bloque de CTA no se renderiza.
   */
  onGetFullDiagnosis?: () => void;
}

export function DiagnosisResultPanel({
  result,
  onGetFullDiagnosis,
}: DiagnosisResultPanelProps) {
  const t = useTranslations("diagnosis.result");
  const tLabel = useTranslations("diagnosis.severity.label");

  const hasBreaches = result.totalBreaches > 0;

  const groups = useMemo(
    () => groupBreachesByAreaSeverity(result.breaches),
    [result.breaches],
  );
  const areaCount = useMemo(
    () => new Set(groups.map((g) => g.area)).size,
    [groups],
  );

  const levelIndex = LEVEL_ORDER.indexOf(result.riskLevel);
  const levelStyle = SEVERITY[result.riskLevel];

  return (
    <section className="mx-auto w-full max-w-[600px] space-y-32">
      {/* Encabezado — sereno, centrado en las brechas y el camino a resolverlas */}
      <header aria-live="polite">
        <h2 className="text-balance font-serif text-heading-sm font-medium leading-[1.15] tracking-[-0.5px] text-ink">
          {t("headline")}
        </h2>
        <p className="mt-12 max-w-[52ch] text-body leading-[1.55] text-carbon">
          {hasBreaches
            ? t("intro", { count: result.totalBreaches, areas: areaCount })
            : t("noBreaches")}
        </p>

        {hasBreaches && (
          <div className="mt-24 flex flex-wrap items-center gap-x-24 gap-y-12">
            {/* Nivel de exposición — medidor sobrio, sin cifra amenazante */}
            <div>
              <p className="mb-8 text-caption font-medium text-metal">
                {t("exposureLabel")}
              </p>
              <div className="flex items-center gap-10">
                <div className="flex gap-[3px]" aria-hidden="true">
                  {LEVEL_ORDER.map((lvl, i) => (
                    <span
                      key={lvl}
                      className={cn(
                        "h-[6px] w-[26px] rounded-full",
                        i <= levelIndex ? levelStyle.fill : "bg-stone",
                      )}
                    />
                  ))}
                </div>
                <span
                  className={cn("text-body-sm font-semibold", levelStyle.text)}
                >
                  {RISK_LEVEL_LABELS[result.riskLevel]}
                </span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Áreas que requieren atención */}
      {hasBreaches && (
        <div>
          <h3 className="mb-4 text-body-sm font-semibold text-ink">
            {t("areasTitle")}
          </h3>
          <ul className="border-t border-stone">
            {groups.map((group) => (
              <li
                key={`${group.area}-${group.severity}`}
                className="flex items-center justify-between gap-16 border-b border-stone py-[14px]"
              >
                <span className="text-body font-medium leading-[1.35] text-ink">
                  {group.areaLabel}
                </span>
                <div className="flex shrink-0 items-center gap-10">
                  <span className="text-caption tabular-nums text-metal">
                    {t("areaFindings", { count: group.count })}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-8 py-[3px] text-caption font-semibold",
                      SEVERITY[group.severity].tag,
                    )}
                  >
                    {tLabel(group.severity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA — texto a la izquierda, botón a la derecha (sin panel).
          Solo se renderiza si el consumidor provee onGetFullDiagnosis: el
          flujo asistido del consultor lo omite y maneja el guardado con su
          propio botón (gate único de isPending). */}
      {onGetFullDiagnosis && (
        <div className="flex items-center justify-between gap-24 max-sm:flex-col max-sm:items-start max-sm:gap-16">
          <h3 className="flex-1 text-subheading font-semibold leading-[1.3] tracking-[-0.2px] text-ink">
            {t("cta.title")}
          </h3>
          <button
            type="button"
            onClick={onGetFullDiagnosis}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-buttons bg-ink px-24 py-12 text-body-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("cta.button")}
          </button>
        </div>
      )}
    </section>
  );
}
