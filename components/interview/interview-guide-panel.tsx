"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, StatusBadge } from "@/components/ui";
import { computeGuideCoverage, type GuideDomain } from "@/lib/interview/guide";

/**
 * Panel "Guion de entrevista" (spec `2026-07-05-interview-guide-design.md`,
 * Task 3): muestra el guion armado por `loadInterviewGuide` (server, ya
 * filtrado a lo aplicable a la empresa) agrupado por dominio → control →
 * preguntas, con la cobertura calculada EN VIVO contra
 * `answers.compliance` del `DiagnosisManager` — el badge "Sin cubrir" se
 * recalcula en cada respuesta porque `computeGuideCoverage` es puro y barato
 * de llamar en cada render. Colapsable (`<details>`, mismo patrón que el
 * grupo "No aplica" de `ComplianceForm`) para no ocupar espacio permanente
 * en la pantalla del diagnóstico. El botón "Imprimir" enlaza a la vista
 * imprimible dedicada (Task 4) en una pestaña nueva.
 */
export function InterviewGuidePanel({
  guide,
  compliance,
  printHref,
}: {
  guide: GuideDomain[];
  compliance: Record<string, string[]>;
  printHref: string;
}) {
  const t = useTranslations("app.diagnosis.guide");

  const questionCount = useMemo(
    () =>
      guide.reduce(
        (total, domain) =>
          total + domain.controls.reduce((sum, control) => sum + control.questions.length, 0),
        0,
      ),
    [guide],
  );

  const coverage = useMemo(() => computeGuideCoverage(guide, compliance), [guide, compliance]);
  const uncoveredCodes = useMemo(
    () => new Set(coverage.uncovered.map((entry) => entry.controlCode)),
    [coverage],
  );

  return (
    <Card>
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-8">
          <div className="min-w-0">
            <h2 className="text-body-sm font-semibold text-ink">{t("title")}</h2>
            <p className="mt-4 text-caption leading-caption text-carbon">{t("subtitle")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-12">
            <span className="text-caption leading-caption text-carbon">
              {t("counter", { domains: guide.length, questions: questionCount })}
            </span>
            <a
              href={printHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="cursor-pointer rounded-tags border border-stone bg-white px-8 py-[3px] text-caption font-medium leading-caption text-carbon transition-colors hover:bg-ash"
            >
              {t("print")}
            </a>
          </div>
        </summary>

        {guide.length === 0 ? (
          <p className="mt-16 text-body-sm leading-body-sm tracking-body-sm text-metal">
            {t("empty")}
          </p>
        ) : (
          <div className="mt-16 flex flex-col gap-20">
            {guide.map((domain) => (
              <div key={domain.domainCode}>
                <h3 className="mb-8 text-body-sm font-semibold text-ink">{domain.domainName}</h3>
                <ul className="flex flex-col gap-12">
                  {domain.controls.map((control) => (
                    <li
                      key={control.code}
                      className="border-t border-ash pt-12 first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-8">
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold leading-[1.5] text-carbon">
                            {control.code}
                          </span>
                          <h4 className="text-body-sm font-semibold text-ink">{control.name}</h4>
                        </div>
                        {uncoveredCodes.has(control.code) ? (
                          <StatusBadge variant="warning">{t("uncovered")}</StatusBadge>
                        ) : (
                          <StatusBadge variant="positive">{t("covered")}</StatusBadge>
                        )}
                      </div>

                      {control.questions.length > 0 ? (
                        <ul className="mt-8 flex list-disc flex-col gap-4 pl-16">
                          {control.questions.map((question, index) => (
                            <li key={index} className="text-body-sm text-carbon">
                              {question}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {control.criteria.length > 0 ? (
                        <p className="mt-8 text-caption leading-caption text-metal">
                          {t("criteriaLabel")}: {control.criteria.join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </details>
    </Card>
  );
}
