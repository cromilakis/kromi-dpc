"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Card, StatusBadge, cn } from "@/components/ui";
import { controlApplies, inapplicabilityFactors } from "@/lib/interview/applicability";
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
 *
 * Aplicabilidad dinámica (Tarea 4, modo asistido): si se reciben
 * `companyFactors` + `onSetApplicability`, cada pregunta se filtra con
 * `applica = override ?? controlApplies(q.appliesWhen, companyFactors)`; las
 * aplicables se renderizan como siempre (con un botón para marcarlas "No
 * aplica" a mano) y las no aplicables se agrupan en un `<details>` colapsado
 * con el motivo y un botón para incluirlas igual. SIN esas props (modo self,
 * `PublicDiagnosisManager`) el componente se comporta EXACTO que antes: todo
 * se trata como aplicable, sin sección ni botones adicionales.
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

function QuestionCard({
  question,
  answers,
  onChange,
  t,
  applicabilityAction,
}: {
  question: ComplianceQuestion;
  answers: CriterionAnswer[];
  onChange: (criterionIndex: number, answer: CriterionAnswer) => void;
  t: ReturnType<typeof useTranslations>;
  applicabilityAction?: ReactNode;
}) {
  const status = mapAnswersToControlStatus(answers);
  return (
    <Card>
      <div className="mb-12 flex flex-wrap items-center justify-between gap-8">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold leading-[1.5] text-carbon">
            {question.controlCode}
          </span>
          <h3 className="text-body-sm font-semibold text-ink">{question.controlName}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-8">
          <StatusBadge variant={STATUS_BADGE_VARIANT[status]}>
            {t(`statusPreview.${status}`)}
          </StatusBadge>
          {applicabilityAction}
        </div>
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
              <div role="group" aria-label={criterion} className="flex shrink-0 items-center gap-4">
                {ANSWER_ORDER.map((answer) => (
                  <button
                    key={answer}
                    type="button"
                    aria-pressed={current === answer}
                    onClick={() => onChange(index, answer)}
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
}

export function ComplianceForm({
  questions,
  value,
  onChange,
  companyFactors,
  applicabilityOverrides,
  onSetApplicability,
}: {
  questions: ComplianceQuestion[];
  value: Record<string, CriterionAnswer[]>;
  onChange: (controlCode: string, criterionIndex: number, answer: CriterionAnswer) => void;
  /** Factores declarados por la empresa. Solo presente en el modo asistido
   * (`DiagnosisManager`) — el modo self no recorta la entrevista. */
  companyFactors?: string[];
  /** Overrides del consultor a la aplicabilidad calculada, por controlCode. */
  applicabilityOverrides?: Record<string, boolean>;
  /** Ausente => modo estático (sin recorte, sin sección "No aplica"). */
  onSetApplicability?: (controlCode: string, include: boolean | undefined) => void;
}) {
  const t = useTranslations("app.diagnosis.compliance");
  const tApplicability = useTranslations("app.diagnosis.applicability");

  if (questions.length === 0) {
    return (
      <p className="text-body-sm leading-body-sm tracking-body-sm text-metal">{t("empty")}</p>
    );
  }

  // Modo dinámico solo si el llamador provee factores + callback de override
  // (DiagnosisManager, modo asistido). Sin ellos, todo se trata como
  // aplicable — el modo self (PublicDiagnosisManager) no cambia.
  const dynamic = companyFactors !== undefined && onSetApplicability !== undefined;

  const applicableQuestions: ComplianceQuestion[] = [];
  const notApplicableQuestions: ComplianceQuestion[] = [];
  for (const question of questions) {
    if (!dynamic) {
      applicableQuestions.push(question);
      continue;
    }
    const override = applicabilityOverrides?.[question.controlCode];
    const applies = override ?? controlApplies(question.appliesWhen, companyFactors ?? []);
    if (applies) {
      applicableQuestions.push(question);
    } else {
      notApplicableQuestions.push(question);
    }
  }

  return (
    <div className="flex flex-col gap-12">
      {applicableQuestions.map((question) => (
        <QuestionCard
          key={question.controlCode}
          question={question}
          answers={value[question.controlCode] ?? []}
          onChange={(index, answer) => onChange(question.controlCode, index, answer)}
          t={t}
          applicabilityAction={
            dynamic ? (
              <button
                type="button"
                onClick={() => onSetApplicability?.(question.controlCode, false)}
                className="rounded-tags border border-stone bg-white px-8 py-[3px] text-caption font-medium leading-caption text-carbon transition-colors hover:bg-ash"
              >
                {tApplicability("markNotApplicable")}
              </button>
            ) : undefined
          }
        />
      ))}

      {dynamic && notApplicableQuestions.length > 0 ? (
        <details className="rounded-card border border-stone bg-white p-16">
          <summary className="cursor-pointer text-body-sm font-semibold text-ink">
            {tApplicability("notApplicableGroup", { count: notApplicableQuestions.length })}
          </summary>
          <ul className="mt-12 flex flex-col gap-12">
            {notApplicableQuestions.map((question) => {
              const factors = inapplicabilityFactors(question.appliesWhen);
              const factorNames = factors
                .map((factor) => tApplicability(`factors.${factor}`))
                .join(", ");
              return (
                <li
                  key={question.controlCode}
                  className="flex flex-wrap items-center justify-between gap-8 border-t border-ash pt-12 first:border-t-0 first:pt-0"
                >
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold leading-[1.5] text-carbon">
                      {question.controlCode}
                    </span>
                    <h4 className="text-body-sm font-semibold text-ink">{question.controlName}</h4>
                    {factorNames ? (
                      <p className="mt-4 text-caption leading-caption text-carbon">
                        {tApplicability("reason", { factors: factorNames })}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSetApplicability?.(question.controlCode, true)}
                    className="shrink-0 rounded-tags border border-stone bg-white px-8 py-[3px] text-caption font-medium leading-caption text-carbon transition-colors hover:bg-ash"
                  >
                    {tApplicability("includeInInterview")}
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
