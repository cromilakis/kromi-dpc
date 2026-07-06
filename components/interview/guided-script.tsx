"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, StatusBadge, Textarea, cn } from "@/components/ui";
import { applicableNodes, nextNode } from "@/lib/interview/script/engine";
import { RAT_SCRIPT } from "@/lib/interview/script/rat-script";
import type { ScriptAnswers } from "@/lib/interview/script/types";

/**
 * Entrevista guiada (spec `2026-07-06-guion-guiado-design.md`): recorre el guion
 * determinista mostrando una pregunta de opción múltiple a la vez. Cada
 * respuesta se aplica al borrador vía `onAnswer` (el manager traduce a
 * `answers.compliance` con el motor) y se persiste en `answers.script`. Puro de
 * presentación: el ramificado y el progreso salen del motor.
 */

export function GuidedScript({
  scriptAnswers,
  factors,
  onAnswer,
}: {
  scriptAnswers: ScriptAnswers;
  factors: string[];
  /** Aplica y persiste la respuesta de un nodo. */
  onAnswer: (nodeId: string, optionIds: string[], other?: string) => void;
}) {
  const t = useTranslations("app.diagnosis.script");
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const [multiSel, setMultiSel] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");

  const nodes = useMemo(
    () => applicableNodes(RAT_SCRIPT, scriptAnswers, factors),
    [scriptAnswers, factors],
  );
  const answeredCount = nodes.filter((n) => scriptAnswers[n.id]).length;

  const flowNext = nextNode(RAT_SCRIPT, scriptAnswers, factors);
  const current = overrideId
    ? RAT_SCRIPT.nodes.find((n) => n.id === overrideId) ?? flowNext
    : flowNext;

  // Nodos aplicables ya respondidos (para el botón "Anterior").
  const answeredIds = nodes.filter((n) => scriptAnswers[n.id]).map((n) => n.id);

  function reset() {
    setMultiSel([]);
    setOtherText("");
  }

  function submit(optionIds: string[], other?: string) {
    if (!current) return;
    onAnswer(current.id, optionIds, other);
    setOverrideId(null);
    reset();
  }

  function openPrevious() {
    const last = answeredIds[answeredIds.length - 1];
    if (last) {
      const prev = scriptAnswers[last];
      setMultiSel(prev?.options ?? []);
      setOtherText(prev?.other ?? "");
      setOverrideId(last);
    }
  }

  const total = nodes.length;
  const positionLabel = current
    ? t("progress", {
        n: Math.min(answeredCount + (scriptAnswers[current.id] ? 0 : 1), total),
        total,
      })
    : t("progressDone", { total });

  return (
    <Card className="flex flex-col gap-16">
      <div className="flex flex-wrap items-center justify-between gap-8">
        <div>
          <h2 className="text-body-sm font-semibold text-ink">{t("title")}</h2>
          <p className="mt-4 text-caption leading-caption text-carbon">{t("subtitle")}</p>
        </div>
        <StatusBadge variant={current ? "warning" : "positive"}>
          {positionLabel}
        </StatusBadge>
      </div>

      {!current ? (
        <p className="rounded-tags bg-ash px-12 py-8 text-body-sm text-ink">
          {t("done")}
        </p>
      ) : (
        <div className="flex flex-col gap-12">
          <p className="text-body-sm font-medium leading-body-sm text-ink">
            {current.question}
          </p>
          {current.help ? (
            <p className="text-caption leading-caption text-carbon">{current.help}</p>
          ) : null}
          {current.example ? (
            <p className="rounded-tags bg-ash px-12 py-8 text-caption leading-caption text-carbon">
              {current.example}
            </p>
          ) : null}

          {current.multi ? (
            // Multi-selección: checkboxes + "Continuar".
            <div className="flex flex-col gap-8">
              {current.options.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-start gap-8 rounded-tags border border-stone px-12 py-8 text-body-sm text-ink hover:bg-ash"
                >
                  <input
                    type="checkbox"
                    className="mt-[2px] cursor-pointer"
                    checked={multiSel.includes(opt.id)}
                    onChange={(e) =>
                      setMultiSel((s) =>
                        e.target.checked ? [...s, opt.id] : s.filter((x) => x !== opt.id),
                      )
                    }
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          ) : (
            // Selección simple: cada opción aplica y avanza.
            <div className="flex flex-col gap-8">
              {current.options.map((opt) => {
                const selected = scriptAnswers[current.id]?.options.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => submit([opt.id])}
                    className={cn(
                      "cursor-pointer rounded-tags border px-12 py-8 text-left text-body-sm transition-colors",
                      selected
                        ? "border-ink bg-ash text-ink"
                        : "border-stone bg-white text-ink hover:bg-ash",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {current.allowOther ? (
            <div className="flex flex-col gap-4">
              <span className="text-caption font-medium leading-caption text-carbon">
                {t("otherLabel")}
              </span>
              <Textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder={t("otherPlaceholder")}
                className="min-h-[56px]"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-8">
            {current.multi || (current.allowOther && otherText.trim()) ? (
              <Button onClick={() => submit(multiSel, otherText || undefined)}>
                {t("continue")}
              </Button>
            ) : null}
            {answeredIds.length > 0 ? (
              <Button variant="ghost" onClick={openPrevious}>
                {t("back")}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}
