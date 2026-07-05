"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, cn } from "@/components/ui";
import {
  estimate,
  RISK_FACTORS,
  SECTOR_CODES,
  SIZE_TIERS,
  type RiskFactor,
  type SectorCode,
  type SizeTier,
} from "@/lib/self-assessment/estimate";
import { LeadForm } from "./lead-form";
import { ResultPanel } from "./result-panel";
import { Stepper, STEP_KEYS } from "./stepper";

/**
 * Wizard multi-paso del autoevaluador público (/self-assessment):
 * tamaño (Ley 20.416) → rubro (7 opciones del prototipo) → factores de
 * riesgo (Sí/No, RFC §14.3) → resultado (tramo + orientación de valor +
 * CTA WhatsApp + lead opcional). La estimación es la función pura de
 * lib/self-assessment/estimate.ts; acá solo hay estado de UI.
 *
 * Accesibilidad: radios nativos dentro de fieldset/legend, foco visible via
 * :has(:focus-visible), aria-current en el stepper y manejo de foco al
 * cambiar de paso.
 */

/** Estilos compartidos de las option-cards (radio con input sr-only). */
const optionCardClasses =
  "group flex cursor-pointer flex-col gap-[2px] rounded-buttons border border-slate bg-white px-16 py-[13px] transition-colors hover:border-carbon " +
  "has-[:checked]:border-ink has-[:checked]:bg-ink " +
  "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-focus-blue/40";

const optionLabelClasses =
  "text-body-sm font-medium text-ink group-has-[:checked]:text-white";
const optionSubClasses =
  "text-caption leading-caption text-metal group-has-[:checked]:text-lead";

/** Botón segmentado Sí/No (réplica de segBtn del prototipo). */
const segmentedClasses =
  "inline-flex cursor-pointer items-center justify-center rounded-buttons border border-slate bg-white px-[15px] py-[9px] text-[13px] font-medium text-ink transition-colors hover:border-carbon " +
  "has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white " +
  "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-focus-blue/40";

const legendClasses = "text-[13px] font-semibold text-ink";
const hintClasses = "mt-4 text-caption leading-caption text-metal";

export function SelfAssessmentWizard() {
  const t = useTranslations("selfAssessment");
  const [stepIndex, setStepIndex] = useState(0);
  const [sizeTier, setSizeTier] = useState<SizeTier | null>(null);
  const [sectorCode, setSectorCode] = useState<SectorCode | null>(null);
  const [factorAnswers, setFactorAnswers] = useState<Record<RiskFactor, boolean>>(
    () =>
      Object.fromEntries(RISK_FACTORS.map((factor) => [factor, false])) as Record<
        RiskFactor,
        boolean
      >,
  );

  // Foco al panel al cambiar de paso (no en el primer render).
  const panelRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    panelRef.current?.focus();
  }, [stepIndex]);

  const selectedFactors = useMemo(
    () => RISK_FACTORS.filter((factor) => factorAnswers[factor]),
    [factorAnswers],
  );

  const isResultStep = stepIndex === STEP_KEYS.length - 1;
  const result = useMemo(
    () =>
      isResultStep && sizeTier && sectorCode
        ? estimate({ sizeTier, sectorCode, riskFactors: selectedFactors })
        : null,
    [isResultStep, sizeTier, sectorCode, selectedFactors],
  );

  const canContinue =
    stepIndex === 0 ? sizeTier !== null : stepIndex === 1 ? sectorCode !== null : true;

  function restart() {
    setSizeTier(null);
    setSectorCode(null);
    setFactorAnswers(
      Object.fromEntries(RISK_FACTORS.map((factor) => [factor, false])) as Record<
        RiskFactor,
        boolean
      >,
    );
    setStepIndex(0);
  }

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <Stepper currentIndex={stepIndex} />

      <div ref={panelRef} tabIndex={-1} className="outline-none">
        {/* Paso 1 — Tamaño (tramos Ley 20.416) */}
        {stepIndex === 0 ? (
          <div className="rounded-xl border border-stone bg-white p-[30px] max-sm:p-20">
            <fieldset>
              <legend className={legendClasses}>{t("steps.size.legend")}</legend>
              <p className={hintClasses}>{t("steps.size.hint")}</p>
              <div className="mt-16 grid gap-8 sm:grid-cols-3">
                {SIZE_TIERS.map((tier) => (
                  <label key={tier} className={optionCardClasses}>
                    <input
                      type="radio"
                      name="size-tier"
                      value={tier}
                      checked={sizeTier === tier}
                      onChange={() => setSizeTier(tier)}
                      className="sr-only"
                    />
                    <span className={optionLabelClasses}>
                      {t(`steps.size.options.${tier}.label`)}
                    </span>
                    <span className={optionSubClasses}>
                      {t(`steps.size.options.${tier}.sub`)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {/* Paso 2 — Rubro (7 opciones del prototipo, cada una con sus leyes) */}
        {stepIndex === 1 ? (
          <div className="rounded-xl border border-stone bg-white p-[30px] max-sm:p-20">
            <fieldset>
              <legend className={legendClasses}>{t("steps.sector.legend")}</legend>
              <p className={hintClasses}>{t("steps.sector.hint")}</p>
              <div className="mt-16 grid gap-8 sm:grid-cols-2">
                {SECTOR_CODES.map((code) => (
                  <label key={code} className={optionCardClasses}>
                    <input
                      type="radio"
                      name="sector-code"
                      value={code}
                      checked={sectorCode === code}
                      onChange={() => setSectorCode(code)}
                      className="sr-only"
                    />
                    <span className={optionLabelClasses}>
                      {t(`steps.sector.options.${code}.label`)}
                    </span>
                    <span className={optionSubClasses}>
                      {t(`steps.sector.options.${code}.laws`)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {/* Paso 3 — Factores de riesgo (Sí/No, RFC §14.3) */}
        {stepIndex === 2 ? (
          <div className="rounded-xl border border-stone bg-white p-[30px] max-sm:p-20">
            <h2 className={legendClasses}>{t("steps.factors.legend")}</h2>
            <p className={hintClasses}>{t("steps.factors.hint")}</p>
            <div className="mt-8">
              {RISK_FACTORS.map((factor) => (
                <fieldset
                  key={factor}
                  className="border-t border-ash py-[14px] first:border-t-0"
                >
                  <legend className="sr-only">
                    {t(`steps.factors.questions.${factor}`)}
                  </legend>
                  <div className="flex items-center justify-between gap-16 max-sm:flex-col max-sm:items-start max-sm:gap-8">
                    <span
                      aria-hidden="true"
                      className="text-body-sm leading-[1.4] text-ink"
                    >
                      {t(`steps.factors.questions.${factor}`)}
                    </span>
                    <div className="flex shrink-0 gap-8">
                      {([true, false] as const).map((answer) => (
                        <label key={String(answer)} className={segmentedClasses}>
                          <input
                            type="radio"
                            name={`factor-${factor}`}
                            value={String(answer)}
                            checked={factorAnswers[factor] === answer}
                            onChange={() =>
                              setFactorAnswers((previous) => ({
                                ...previous,
                                [factor]: answer,
                              }))
                            }
                            className="sr-only"
                          />
                          {answer ? t("steps.factors.yes") : t("steps.factors.no")}
                        </label>
                      ))}
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>
          </div>
        ) : null}

        {/* Paso 4 — Resultado: tramo/orientación (nunca el score) + lead opcional */}
        {result && sizeTier && sectorCode ? (
          <div className="grid items-start gap-20 lg:grid-cols-[1.1fr_0.9fr]">
            <ResultPanel result={result} />
            <LeadForm
              assessment={{ sizeTier, sectorCode, riskFactors: selectedFactors }}
            />
          </div>
        ) : null}
      </div>

      {/* Navegación entre pasos */}
      <div className="mt-20 flex items-center justify-between gap-12">
        <Button
          variant="ghost"
          onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
          className={cn(stepIndex === 0 && "invisible")}
        >
          {t("nav.back")}
        </Button>
        {isResultStep ? (
          <Button variant="secondary" onClick={restart}>
            {t("nav.restart")}
          </Button>
        ) : (
          <Button
            onClick={() => setStepIndex((index) => index + 1)}
            disabled={!canContinue}
            className="px-[18px] py-[11px]"
          >
            {stepIndex === STEP_KEYS.length - 2 ? t("nav.seeResult") : t("nav.next")}
          </Button>
        )}
      </div>
    </div>
  );
}
