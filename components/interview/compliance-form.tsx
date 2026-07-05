"use client";

import { useTranslations } from "next-intl";
import { Card, StatusBadge, cn } from "@/components/ui";
import { mapAnswersToControlStatus, type CriterionAnswer } from "@/lib/interview/auto-map";
import type { ComplianceQuestion } from "@/lib/interview/questions";

/**
 * Sección B del diagnóstico — evaluación de cumplimiento: un bloque por
 * control con sus criterios de verificación (`buildComplianceQuestions`,
 * cargados en el server component con `verification_criteria`); cada
 * criterio se responde con un toggle de 4 estados (yes/partial/no/unknown,
 * mismo vocabulario que `CriterionAnswer` del server). La vista previa del
 * estado resultante usa `mapAnswersToControlStatus` — la MISMA función que
 * `materializeDiagnosis` aplica al volcar a `assessment_controls` — para que
 * el consultor vea antes de materializar el estado que quedará en el
 * checklist.
 */

const ANSWER_ORDER: readonly CriterionAnswer[] = ["yes", "partial", "no", "unknown"];

const ANSWER_TINTS: Record<CriterionAnswer, string> = {
  yes: "border-success-green/40 bg-[#e9f2ec] text-success-green",
  partial: "border-warning-yellow/40 bg-[#f6f0df] text-warning-yellow",
  no: "border-danger-red/40 bg-[#f6e9e8] text-danger-red",
  unknown: "border-stone bg-white text-carbon",
};

const STATUS_BADGE_VARIANT = {
  pending: "neutral",
  compliant: "positive",
  partial: "warning",
  non_compliant: "negative",
} as const;

export function ComplianceForm({
  questions,
  value,
  onChange,
}: {
  questions: ComplianceQuestion[];
  value: Record<string, CriterionAnswer[]>;
  onChange: (controlCode: string, criterionIndex: number, answer: CriterionAnswer) => void;
}) {
  const t = useTranslations("app.diagnosis.compliance");

  if (questions.length === 0) {
    return (
      <p className="text-body-sm leading-body-sm tracking-body-sm text-metal">{t("empty")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {questions.map((question) => {
        const answers = value[question.controlCode] ?? [];
        const status = mapAnswersToControlStatus(answers);
        return (
          <Card key={question.controlCode}>
            <div className="mb-12 flex flex-wrap items-center justify-between gap-8">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold leading-[1.5] text-carbon">
                  {question.controlCode}
                </span>
                <h3 className="text-body-sm font-semibold text-ink">{question.controlName}</h3>
              </div>
              <StatusBadge variant={STATUS_BADGE_VARIANT[status]}>
                {t(`statusPreview.${status}`)}
              </StatusBadge>
            </div>

            <ul className="flex flex-col gap-8">
              {question.criteria.map((criterion, index) => {
                const current = answers[index] ?? "unknown";
                return (
                  <li
                    key={index}
                    className="flex flex-wrap items-center justify-between gap-8 border-t border-ash pt-8 first:border-t-0 first:pt-0"
                  >
                    <p className="min-w-0 flex-1 text-body-sm text-carbon">{criterion}</p>
                    <div
                      role="group"
                      aria-label={criterion}
                      className="flex shrink-0 items-center gap-4"
                    >
                      {ANSWER_ORDER.map((answer) => (
                        <button
                          key={answer}
                          type="button"
                          aria-pressed={current === answer}
                          onClick={() => onChange(question.controlCode, index, answer)}
                          className={cn(
                            "rounded-tags border px-8 py-[3px] text-caption font-medium leading-caption transition-colors",
                            current === answer
                              ? ANSWER_TINTS[answer]
                              : "border-stone bg-white text-carbon hover:bg-ash",
                          )}
                        >
                          {t(`criteria.${answer}`)}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
