"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, InfoTooltip, cn } from "@/components/ui";
import {
  SCREENING_NODES,
  DEEP_DIVE_BRANCHES,
  INFERENCE_RULES,
  getNextScreeningNode,
  walkScreening,
  computeFullDiagnosis,
  QUESTION_HELP,
  QUESTION_LAW,
  getCitation,
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
  "group flex h-full cursor-pointer items-center gap-12 rounded-buttons border border-slate bg-white px-16 py-[15px] transition-all duration-150 " +
  "hover:border-carbon hover:bg-haze " +
  "has-[:checked]:border-ink has-[:checked]:bg-ash " +
  "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-focus-blue/40";

const optionLabelClasses =
  "text-body-sm font-medium leading-[1.35] text-ink group-has-[:checked]:text-ink";

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
  // Índice de la pregunta visible. Navegación explícita (Anterior / Siguiente);
  // ninguna pregunta auto-avanza. El valor steps.length significa "terminado".
  const [cursor, setCursor] = useState(0);
  const questionRef = useRef<HTMLDivElement>(null);

  // Una pregunta está respondida si tiene al menos una opción marcada o —cuando
  // admite texto libre— si el campo libre tiene contenido. Excepción: si hay una
  // opción `custom` seleccionada (p. ej. "Otro rubro"), su input es obligatorio.
  const isStepAnswered = useCallback(
    (step: Step): boolean => {
      const id = step.kind === "screening" ? step.node.id : step.question.id;
      const options =
        step.kind === "screening" ? step.node.answers : step.question.answers;
      const values =
        (step.kind === "screening"
          ? screeningAnswers.get(id)
          : ddAnswers.get(id)?.values) ?? [];
      const customText_ = customText.get(id)?.trim();
      const needsCustomInput = options.some(
        (o) => o.custom && values.includes(o.value),
      );
      if (needsCustomInput && !customText_) return false;
      if (values.length > 0) return true;
      const allowsCustom =
        step.kind === "screening"
          ? step.node.allowCustom
          : step.question.allowCustom;
      return Boolean(allowsCustom && customText_);
    },
    [screeningAnswers, ddAnswers, customText],
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
      const answered =
        vals.length > 0 ||
        Boolean(node.allowCustom && customText.get(node.id)?.trim());
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
  }, [screeningAnswers, customText]);

  // Cursor acotado al rango válido: steps puede crecer o encogerse al cambiar
  // respuestas previas. cursor >= steps.length ⇒ "terminado".
  const allAnswered = steps.length > 0 && steps.every(isStepAnswered);
  const isComplete = allAnswered && cursor >= steps.length;
  const currentStep = cursor < steps.length ? steps[cursor] : null;
  const canGoBack = cursor > 0;

  const currentId = currentStep
    ? currentStep.kind === "screening"
      ? currentStep.node.id
      : currentStep.question.id
    : null;

  // Respuestas crudas (screening + deep dive) SOLO de las preguntas que están
  // en el camino actual (`steps`): así, si el usuario vuelve atrás y cambia una
  // respuesta que desactiva una rama, las respuestas viejas de esa rama quedan
  // fuera del resultado. Fuente única para `result` y la persistencia del lead.
  const answersPayload = useMemo<DiagnosisAnswers>(() => {
    const screening: ScreeningAnswer[] = [];
    const deepDive: DeepDiveAnswer[] = [];
    for (const step of steps) {
      if (step.kind === "screening") {
        const vals = screeningAnswers.get(step.node.id) ?? [];
        for (const value of vals) screening.push({ nodeId: step.node.id, value });
      } else {
        const entry = ddAnswers.get(step.question.id);
        if (entry) {
          for (const value of entry.values) {
            deepDive.push({
              questionId: step.question.id,
              branchId: entry.branchId,
              value,
            });
          }
        }
      }
    }
    return { screening, deepDive };
  }, [steps, screeningAnswers, ddAnswers]);

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

  // ── Focus management + clamp del cursor ─────────────────────────────
  useEffect(() => {
    questionRef.current?.focus();
  }, [cursor]);

  // Si steps se encoge por debajo del cursor (cambio de respuesta previa),
  // reacota el cursor para no quedar fuera de rango.
  useEffect(() => {
    if (cursor > steps.length) setCursor(steps.length);
  }, [steps.length, cursor]);

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

  // Navegación explícita: Anterior no borra respuestas (se conservan al volver);
  // Siguiente solo avanza si la pregunta actual está respondida.
  const goPrev = useCallback(() => {
    setCursor((c) => Math.max(0, c - 1));
  }, []);

  const goNext = useCallback(() => {
    if (!currentStep || !isStepAnswered(currentStep)) return;
    setCursor((c) => c + 1);
  }, [currentStep, isStepAnswered]);

  const restart = useCallback(() => {
    setScreeningAnswers(new Map());
    setDdAnswers(new Map());
    setCustomText(new Map());
    setCursor(0);
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

  // Eyebrow: siempre referencia a la norma asociada (artículo o ley), nunca el
  // nombre de la rama. Fallback a "Ley 21.719" si no hay artículo mapeado.
  const contextLabel =
    currentStep.kind === "screening"
      ? (QUESTION_LAW[currentStep.node.id] ?? t("contextDefault"))
      : (QUESTION_LAW[currentStep.question.id] ??
        QUESTION_LAW[currentStep.branch.id] ??
        t("contextDefault"));
  const helpText = currentId ? (QUESTION_HELP[currentId] ?? null) : null;

  // Cita legal del eyebrow: primer segmento del contextLabel (separado por "·")
  // que tenga entrada en el catálogo de citas → alimenta el tooltip.
  let lawCitation = null;
  for (const part of contextLabel.split("·")) {
    const c = getCitation(part.trim());
    if (c) {
      lawCitation = c;
      break;
    }
  }

  const legendId = `q-legend-${currentId}`;
  const canProceed = isStepAnswered(currentStep);
  // Si alguna opción tiene subtítulo (explícito o paréntesis final), todas las
  // tarjetas comparten una altura mínima para que se vean del mismo tamaño.
  const anyOptionSub = options.some(
    (o) => o.sublabel || /\([^)]+\)\s*$/.test(o.label),
  );
  const optionMinH = anyOptionSub ? "min-h-[84px]" : "";
  // "Ver resultado" solo cuando ya no quedan preguntas por delante: todas
  // respondidas (⇒ la cadena está construida completa) y estamos en la última.
  const isLastStep = allAnswered && cursor === steps.length - 1;

  return (
    <div className="relative z-10 mx-auto -mt-[72px] w-full max-w-[720px] max-sm:-mt-[56px]">
      <div
        ref={questionRef}
        tabIndex={-1}
        className="rounded-xl border border-stone bg-white p-40 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.5)] outline-none max-sm:p-24"
      >
        <fieldset aria-labelledby={legendId}>
          {/* Encabezado: ícono "?" que abarca TODO el alto del bloque de la
              derecha (SVG que se estira con items-stretch); a la derecha, en
              orden, la ley asociada (chica), la pregunta y una descripción muy
              breve de qué aporta al diagnóstico. */}
          <div className="flex items-stretch gap-20 max-sm:gap-16">
            <div className="relative w-[64px] shrink-0 self-stretch max-sm:w-[48px]">
              <svg
                aria-hidden
                viewBox="0 0 54 76"
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0 h-full w-full text-lead"
              >
                <text
                  x="27"
                  y="70"
                  textAnchor="middle"
                  className="font-serif"
                  fontSize="96"
                  fontWeight="500"
                  fill="currentColor"
                >
                  ?
                </text>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-6 text-caption font-semibold uppercase tracking-[0.4px] text-carbon">
                <span>{contextLabel}</span>
                {lawCitation && (
                  <InfoTooltip label={`Ver ${lawCitation.norm}`}>
                    <span className="block font-semibold normal-case text-ink">
                      {lawCitation.norm}
                    </span>
                    <span className="mt-4 block font-normal normal-case text-carbon">
                      {lawCitation.summary}
                    </span>
                  </InfoTooltip>
                )}
              </p>
              <p
                id={legendId}
                className="mt-4 text-balance text-[19px] font-semibold leading-[1.3] tracking-[-0.3px] text-ink max-sm:text-[17px]"
              >
                {questionText}
              </p>
              {helpText && (
                <p className="mt-4 max-w-[60ch] text-body-sm leading-[1.5] text-metal">
                  {helpText}
                </p>
              )}
              {isMulti && (
                <p className="mt-8 text-caption text-metal">{t("multiHint")}</p>
              )}
            </div>
          </div>

          {/* Línea divisoria entre la pregunta y las opciones. */}
          <div className="mt-24 border-t border-stone" />

          {/* Opciones en grilla (no barras estiradas). Con número impar de
              opciones, la última ocupa el ancho completo para no dejar un hueco. */}
          <div className="mt-20 grid items-stretch gap-8 sm:grid-cols-2">
            {options.map((option, i) => {
              const spanFull =
                options.length % 2 === 1 && i === options.length - 1;
              const checked = currentValues.includes(option.value);
              const control = (
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={groupName}
                  value={option.value}
                  checked={checked}
                  onChange={() =>
                    isMulti ? toggleMulti(option.value) : selectSingle(option.value)
                  }
                  className="sr-only"
                />
              );
              const indicator = (
                <span
                  aria-hidden
                  className={cn(
                    "mt-[2px] flex size-[18px] shrink-0 items-center justify-center border border-slate bg-white transition-colors group-has-[:checked]:border-ink group-has-[:checked]:bg-ink",
                    isMulti ? "rounded-[5px]" : "rounded-full",
                  )}
                >
                  {isMulti ? (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-white opacity-0 group-has-[:checked]:opacity-100"
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="size-[7px] rounded-full bg-white opacity-0 group-has-[:checked]:opacity-100" />
                  )}
                </span>
              );
              // Título + subtítulo: usa `sublabel` explícito si existe; si no,
              // separa un paréntesis final del label (ej. "Datos de salud
              // (diagnósticos, fichas)") para dejar opciones limpias.
              let mainLabel = option.label;
              let subLabel = option.sublabel;
              if (!subLabel) {
                const m = option.label.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
                if (m) {
                  mainLabel = m[1];
                  const inner = m[2].replace(/,?\s*etc\.?\s*$/i, "").trim();
                  subLabel = inner.charAt(0).toUpperCase() + inner.slice(1);
                }
              }
              const body = (
                <span className="min-w-0">
                  <span className={optionLabelClasses}>{mainLabel}</span>
                  {subLabel && (
                    <span className="mt-[3px] block text-caption leading-[1.35] text-metal">
                      {subLabel}
                    </span>
                  )}
                </span>
              );

              // Opción con input libre obligatorio dentro del panel (p. ej. "Otro").
              if (option.custom) {
                return (
                  <div
                    key={option.value}
                    className={cn(
                      "group flex h-full flex-col justify-center rounded-buttons border bg-white transition-all duration-150",
                      "border-slate hover:border-carbon has-[:checked]:border-ink has-[:checked]:bg-ash",
                      optionMinH,
                      spanFull ? "sm:col-span-2" : "",
                    )}
                  >
                    <label className="flex cursor-pointer items-center gap-12 px-16 py-[15px]">
                      {control}
                      {indicator}
                      {body}
                    </label>
                    {checked && (
                      <div className="px-16 pb-16">
                        <input
                          type="text"
                          value={currentCustom}
                          onChange={(e) => setCustom(e.target.value)}
                          placeholder={t("otherPlaceholder")}
                          aria-label={t("otherPlaceholder")}
                          autoFocus
                          className="w-full rounded-inputs border border-slate bg-white px-16 py-[9px] text-body-sm leading-body-sm text-ink outline-none transition-colors placeholder:text-overcast focus-visible:border-focus-blue focus-visible:ring-[3px] focus-visible:ring-focus-blue/40"
                        />
                        {!currentCustom.trim() && (
                          <p className="mt-6 text-caption text-metal">
                            {t("otherRequired")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <label
                  key={option.value}
                  className={cn(
                    optionCardClasses,
                    optionMinH,
                    spanFull ? "sm:col-span-2" : "",
                  )}
                >
                  {control}
                  {indicator}
                  {body}
                </label>
              );
            })}
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

        </fieldset>

        {/* Navegación explícita entre preguntas. La primera pregunta no muestra
            "Anterior" (un spacer mantiene "Siguiente" a la derecha). */}
        <div className="mt-24 flex items-center justify-between gap-12 border-t border-ash pt-20">
          {canGoBack ? (
            <Button
              variant="ghost"
              onClick={goPrev}
              className="px-0 hover:bg-transparent hover:underline"
            >
              ← {t("nav.back")}
            </Button>
          ) : (
            <span aria-hidden />
          )}
          <Button
            onClick={goNext}
            disabled={!canProceed}
            className="px-24 py-12 disabled:pointer-events-none disabled:opacity-40"
          >
            {isLastStep ? t("nav.seeResult") : t("nav.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
