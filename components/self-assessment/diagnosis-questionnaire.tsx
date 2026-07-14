"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import {
  SCREENING_NODES,
  DEEP_DIVE_BRANCHES,
  INFERENCE_RULES,
  getNextScreeningNode,
  walkScreening,
  computeFullDiagnosis,
  type DeepDiveAnswer,
  type DeepDiveBranch,
  type DeepDiveQuestion,
  type FullDiagnosisResult,
  type ScreeningAnswer,
  type ScreeningNode,
} from "@/lib/legal";
import type { DiagnosisAnswers } from "@/lib/diagnosis/snapshot";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const optionCardClasses =
  "group flex cursor-pointer flex-col gap-[2px] rounded-buttons border border-slate bg-white px-16 py-[13px] transition-colors hover:border-carbon " +
  "has-[:checked]:border-ink has-[:checked]:bg-ink " +
  "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-focus-blue/40";

const optionLabelClasses =
  "text-body-sm font-medium text-ink group-has-[:checked]:text-white";

// ---------------------------------------------------------------------------
// Secuencia unificada (screening + profundización intercalada)
// ---------------------------------------------------------------------------

type Step =
  | { kind: "screening"; node: ScreeningNode }
  | { kind: "deepdive"; branch: DeepDiveBranch; question: DeepDiveQuestion };

interface DeepDiveEntry {
  branchId: string;
  values: string[];
}

// ---------------------------------------------------------------------------
// Cuestionario unificado
// ---------------------------------------------------------------------------

/**
 * Núcleo del autodiagnóstico de cumplimiento (Ley 21.719): screening +
 * profundización intercalada en un solo flujo de preguntas. Las preguntas de
 * selección única auto-avanzan; las de "marca todas las que apliquen"
 * (multiple) o con campo de texto libre (allowCustom) usan un botón
 * "Continuar". El texto libre se captura de forma interna (no dispara
 * brechas ni se muestra en el resultado). Al completarse, delega el render
 * del resultado a `renderComplete`.
 */
export function DiagnosisQuestionnaire({
  renderComplete,
}: {
  renderComplete: (args: {
    result: FullDiagnosisResult;
    answers: DiagnosisAnswers;
    restart: () => void;
  }) => React.ReactNode;
}) {
  const t = useTranslations("diagnosis");

  // ── State ───────────────────────────────────────────────────────────
  const [screeningAnswers, setScreeningAnswers] = useState<
    Map<string, string[]>
  >(new Map());
  const [ddAnswers, setDdAnswers] = useState<Map<string, DeepDiveEntry>>(
    new Map(),
  );
  const [customText, setCustomText] = useState<Map<string, string>>(new Map());
  // IDs de preguntas con "Continuar" ya confirmadas.
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const questionRef = useRef<HTMLDivElement>(null);

  // Una pregunta usa botón "Continuar" (no auto-avanza) si es multi o admite
  // texto libre: en ambos casos el usuario necesita componer su respuesta.
  const screeningUsesContinue = (node: ScreeningNode) =>
    Boolean(node.multiple || node.allowCustom);
  const deepDiveUsesContinue = (q: DeepDiveQuestion) =>
    Boolean(q.multiple || q.allowCustom);

  const isStepAnswered = useCallback(
    (step: Step): boolean => {
      if (step.kind === "screening") {
        return screeningUsesContinue(step.node)
          ? confirmed.has(step.node.id)
          : (screeningAnswers.get(step.node.id)?.length ?? 0) > 0;
      }
      return deepDiveUsesContinue(step.question)
        ? confirmed.has(step.question.id)
        : (ddAnswers.get(step.question.id)?.values.length ?? 0) > 0;
    },
    [screeningAnswers, ddAnswers, confirmed],
  );

  // ── Secuencia intercalada ───────────────────────────────────────────
  const steps = useMemo<Step[]>(() => {
    const activeFactors = new Set<string>();
    for (const node of SCREENING_NODES) {
      const vals = screeningAnswers.get(node.id);
      if (!vals?.length) continue;
      for (const val of vals) {
        const opt = node.answers.find((a) => a.value === val);
        opt?.activatesBranches?.forEach((b) => activeFactors.add(b));
      }
      if (node.riskFactor) activeFactors.add(node.riskFactor);
    }

    const result: Step[] = [];
    const insertedBranches = new Set<string>();
    let node: ScreeningNode | null = SCREENING_NODES[0] ?? null;

    while (node) {
      if (node.appliesIfFactor && !activeFactors.has(node.appliesIfFactor)) {
        const idx = SCREENING_NODES.findIndex((n) => n.id === node!.id);
        node =
          idx >= 0 && idx < SCREENING_NODES.length - 1
            ? SCREENING_NODES[idx + 1]
            : null;
        continue;
      }

      result.push({ kind: "screening", node });

      const vals = screeningAnswers.get(node.id) ?? [];
      const answered = screeningUsesContinue(node)
        ? confirmed.has(node.id)
        : vals.length > 0;
      if (!answered) break;

      for (const val of vals) {
        const opt = node.answers.find((a) => a.value === val);
        for (const branchId of opt?.activatesBranches ?? []) {
          if (insertedBranches.has(branchId)) continue;
          const branch = DEEP_DIVE_BRANCHES.find((b) => b.id === branchId);
          if (!branch) continue;
          insertedBranches.add(branchId);
          for (const question of branch.questions) {
            result.push({ kind: "deepdive", branch, question });
          }
        }
      }

      node = getNextScreeningNode(
        node,
        vals[0] ?? "",
        SCREENING_NODES,
        activeFactors,
      );
    }

    return result;
  }, [screeningAnswers, confirmed]);

  const currentIndex = useMemo(
    () => steps.findIndex((s) => !isStepAnswered(s)),
    [steps, isStepAnswered],
  );
  const currentStep = currentIndex === -1 ? null : steps[currentIndex];
  const isComplete = steps.length > 0 && currentIndex === -1;
  const canGoBack = currentIndex > 0;

  const currentId = currentStep
    ? currentStep.kind === "screening"
      ? currentStep.node.id
      : currentStep.question.id
    : null;

  // Respuestas crudas (screening + deep dive), fuente única: se recorren los
  // Maps una sola vez acá y tanto `result` como la persistencia del lead
  // (Task 4) derivan de esta misma lista, sin volver a recorrer los Maps.
  const answersPayload = useMemo<DiagnosisAnswers>(() => {
    const screening: ScreeningAnswer[] = [];
    screeningAnswers.forEach((values, nodeId) => {
      for (const value of values) screening.push({ nodeId, value });
    });
    const deepDive: DeepDiveAnswer[] = [];
    ddAnswers.forEach((entry, questionId) => {
      for (const value of entry.values) {
        deepDive.push({ questionId, branchId: entry.branchId, value });
      }
    });
    return { screening, deepDive };
  }, [screeningAnswers, ddAnswers]);

  // ── Resultado completo ──────────────────────────────────────────────
  const result = useMemo(() => {
    if (!isComplete) return null;
    const walked = walkScreening(SCREENING_NODES, answersPayload.screening);
    return computeFullDiagnosis(
      walked,
      INFERENCE_RULES,
      DEEP_DIVE_BRANCHES,
      answersPayload.deepDive,
    );
  }, [isComplete, answersPayload]);

  // ── Focus management ────────────────────────────────────────────────
  useEffect(() => {
    questionRef.current?.focus();
  }, [currentIndex]);

  const currentValues = useMemo<string[]>(() => {
    if (!currentStep) return [];
    return currentStep.kind === "screening"
      ? (screeningAnswers.get(currentStep.node.id) ?? [])
      : (ddAnswers.get(currentStep.question.id)?.values ?? []);
  }, [currentStep, screeningAnswers, ddAnswers]);

  const currentCustom = currentId ? (customText.get(currentId) ?? "") : "";

  // ── Handlers ────────────────────────────────────────────────────────
  const selectSingle = useCallback(
    (value: string) => {
      if (!currentStep) return;
      if (currentStep.kind === "screening") {
        const { id } = currentStep.node;
        setScreeningAnswers((prev) => new Map(prev).set(id, [value]));
        // Selección única sin "Continuar" avanza sola.
        if (!screeningUsesContinue(currentStep.node)) return;
      } else {
        const { question, branch } = currentStep;
        setDdAnswers((prev) =>
          new Map(prev).set(question.id, { branchId: branch.id, values: [value] }),
        );
      }
    },
    [currentStep],
  );

  const toggleMulti = useCallback(
    (value: string) => {
      if (!currentStep) return;
      const toggle = (arr: string[]) => {
        const i = arr.indexOf(value);
        return i >= 0
          ? [...arr.slice(0, i), ...arr.slice(i + 1)]
          : [...arr, value];
      };
      if (currentStep.kind === "screening") {
        const { id } = currentStep.node;
        setScreeningAnswers((prev) =>
          new Map(prev).set(id, toggle(prev.get(id) ?? [])),
        );
      } else {
        const { question, branch } = currentStep;
        setDdAnswers((prev) =>
          new Map(prev).set(question.id, {
            branchId: branch.id,
            values: toggle(prev.get(question.id)?.values ?? []),
          }),
        );
      }
    },
    [currentStep],
  );

  const setCustom = useCallback(
    (text: string) => {
      if (!currentId) return;
      setCustomText((prev) => new Map(prev).set(currentId, text));
    },
    [currentId],
  );

  const confirmStep = useCallback(() => {
    if (!currentId) return;
    if (currentValues.length === 0 && !currentCustom.trim()) return;
    setConfirmed((prev) => new Set(prev).add(currentId));
  }, [currentId, currentValues, currentCustom]);

  const goBack = useCallback(() => {
    if (currentIndex <= 0) return;
    const prev = steps[currentIndex - 1];
    const id = prev.kind === "screening" ? prev.node.id : prev.question.id;
    setConfirmed((set) => {
      if (!set.has(id)) return set;
      const next = new Set(set);
      next.delete(id);
      return next;
    });
    setCustomText((map) => {
      if (!map.has(id)) return map;
      const next = new Map(map);
      next.delete(id);
      return next;
    });
    if (prev.kind === "screening") {
      setScreeningAnswers((map) => {
        const next = new Map(map);
        next.delete(prev.node.id);
        return next;
      });
    } else {
      setDdAnswers((map) => {
        const next = new Map(map);
        next.delete(prev.question.id);
        return next;
      });
    }
  }, [currentIndex, steps]);

  const restart = useCallback(() => {
    setScreeningAnswers(new Map());
    setDdAnswers(new Map());
    setCustomText(new Map());
    setConfirmed(new Set());
  }, []);

  // ── Result screen ───────────────────────────────────────────────────
  if (isComplete && result) {
    return <>{renderComplete({ result, answers: answersPayload, restart })}</>;
  }

  if (!currentStep) {
    return (
      <div className="mx-auto w-full max-w-[640px] text-center">
        <p className="text-metal">{t("loading")}</p>
      </div>
    );
  }

  const isMulti =
    currentStep.kind === "screening"
      ? Boolean(currentStep.node.multiple)
      : Boolean(currentStep.question.multiple);
  const allowCustom =
    currentStep.kind === "screening"
      ? Boolean(currentStep.node.allowCustom)
      : Boolean(currentStep.question.allowCustom);
  const usesContinue =
    currentStep.kind === "screening"
      ? screeningUsesContinue(currentStep.node)
      : deepDiveUsesContinue(currentStep.question);
  const questionText =
    currentStep.kind === "screening"
      ? currentStep.node.question
      : currentStep.question.question;
  const options =
    currentStep.kind === "screening"
      ? currentStep.node.answers
      : currentStep.question.answers;
  const groupName =
    currentStep.kind === "screening"
      ? `q-${currentStep.node.id}`
      : `dd-${currentStep.branch.id}-${currentStep.question.id}`;

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <div
        ref={questionRef}
        tabIndex={-1}
        className="rounded-xl border border-stone bg-white p-[30px] outline-none max-sm:p-20"
      >
        <fieldset>
          {currentStep.kind === "deepdive" && (
            <p className="mb-8 text-caption font-semibold uppercase tracking-[0.4px] text-metal">
              {currentStep.branch.name}
            </p>
          )}
          <legend className="mb-4 text-[15px] font-semibold leading-[1.4] text-ink">
            {questionText}
          </legend>
          {isMulti && (
            <p className="mb-4 text-caption text-metal">{t("multiHint")}</p>
          )}

          <div className="mt-16 grid gap-8">
            {options.map((option) => (
              <label key={option.value} className={optionCardClasses}>
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={groupName}
                  value={option.value}
                  checked={currentValues.includes(option.value)}
                  onChange={() =>
                    isMulti ? toggleMulti(option.value) : selectSingle(option.value)
                  }
                  className="sr-only"
                />
                <span className={optionLabelClasses}>{option.label}</span>
              </label>
            ))}
          </div>

          {allowCustom && (
            <div className="mt-12">
              <label
                htmlFor={`custom-${currentId}`}
                className="mb-4 block text-caption text-metal"
              >
                {t("customLabel")}
              </label>
              <textarea
                id={`custom-${currentId}`}
                value={currentCustom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={t("customPlaceholder")}
                rows={2}
                className="w-full resize-none rounded-buttons border border-slate bg-white px-16 py-[10px] text-body-sm text-ink outline-none transition-colors placeholder:text-metal focus-visible:border-carbon focus-visible:ring-[3px] focus-visible:ring-focus-blue/40"
              />
            </div>
          )}

          {usesContinue && (
            <Button
              onClick={confirmStep}
              disabled={currentValues.length === 0 && !currentCustom.trim()}
              className="mt-16 w-full px-24 py-12"
            >
              {t("nav.continue")}
            </Button>
          )}
        </fieldset>
      </div>

      {canGoBack && (
        <div className="mt-20">
          <Button variant="ghost" onClick={goBack}>
            {t("nav.back")}
          </Button>
        </div>
      )}
    </div>
  );
}
