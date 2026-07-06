"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Input, Select, StatusBadge, Textarea } from "@/components/ui";
import { proposeRemediationForSession } from "@/lib/actions/interview";
import { createRemediationFromProposal } from "@/lib/actions/remediation";
import type { EnrichedProposalItem } from "@/lib/actions/interview";

/**
 * Panel "Propuesta de resolución" (Fase 2, spec
 * `2026-07-06-live-queue-opener-and-resolution-proposal-design.md` §B): al
 * cerrar el diagnóstico, la IA propone por cada gap (No cumple/parcial/Falta
 * aclarar) una acción estructurada (acción + prioridad + esfuerzo + plazo). El
 * consultor revisa/edita cada tarjeta y **acepta** (crea la tarea en el Plan de
 * adecuación con origin='diagnosis') o **descarta**. El LLM propone; nunca crea
 * tareas por sí solo.
 */

type ProposalError = "llm_disabled" | "llm_failed" | "generic";

// Cada tarjeta es editable en el cliente antes de aceptarse.
type EditableItem = EnrichedProposalItem & { dueDate: string };

const PRIORITIES = ["alta", "media", "baja"] as const;
const EFFORTS = ["bajo", "medio", "alto"] as const;

// Plazo por defecto = hoy + semanas sugeridas, en YYYY-MM-DD (input date).
function dueFromWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export function ResolutionProposal({
  sessionId,
  companyId,
}: {
  sessionId: string;
  companyId: string;
}) {
  const t = useTranslations("app.diagnosis.proposal");

  const [items, setItems] = useState<EditableItem[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ProposalError | null>(null);
  const [acceptingKey, setAcceptingKey] = useState<string | null>(null);

  function keyOf(item: EditableItem) {
    return `${item.controlCode}#${item.criterionIndex}`;
  }

  function handleGenerate() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await proposeRemediationForSession(sessionId);
      if (result.ok) {
        setItems(
          result.proposal.map((item) => ({
            ...item,
            dueDate: dueFromWeeks(item.suggestedDueWeeks),
          })),
        );
      } else {
        setError(
          result.error === "llm_disabled" || result.error === "llm_failed"
            ? result.error
            : "generic",
        );
      }
    });
  }

  function patch(key: string, changes: Partial<EditableItem>) {
    setItems((current) =>
      current
        ? current.map((item) => (keyOf(item) === key ? { ...item, ...changes } : item))
        : current,
    );
  }

  function handleAccept(item: EditableItem) {
    const key = keyOf(item);
    setAcceptingKey(key);
    startTransition(async () => {
      const result = await createRemediationFromProposal({
        companyId,
        controlCode: item.controlCode,
        criterionIndex: item.criterionIndex,
        title: item.action.trim(),
        priority: item.priority,
        effort: item.effort,
        dueDate: item.dueDate || undefined,
      });
      setAcceptingKey(null);
      if (result.ok) {
        setItems((current) =>
          current ? current.filter((candidate) => keyOf(candidate) !== key) : current,
        );
      } else {
        setError("generic");
      }
    });
  }

  function handleDismiss(item: EditableItem) {
    const key = keyOf(item);
    setItems((current) =>
      current ? current.filter((candidate) => keyOf(candidate) !== key) : current,
    );
  }

  return (
    <Card className="flex flex-col gap-20">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div>
          <h2 className="text-body-sm font-semibold text-ink">{t("title")}</h2>
          <p className="mt-4 text-caption leading-caption text-carbon">{t("subtitle")}</p>
        </div>
        <Button onClick={handleGenerate} disabled={pending}>
          {pending && items === null ? t("generating") : t("generate")}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-caption leading-caption text-danger-red">
          {t(`errors.${error}`)}
        </p>
      ) : null}

      {items !== null && items.length === 0 ? (
        <p className="text-caption leading-caption text-carbon">{t("empty")}</p>
      ) : null}

      {items && items.length > 0 ? (
        <ul className="flex flex-col gap-12">
          {items.map((item) => {
            const key = keyOf(item);
            const accepting = acceptingKey === key;
            return (
              <li key={key}>
                <Card className="flex flex-col gap-12 border-ink/10">
                  <div className="flex flex-wrap items-baseline justify-between gap-8">
                    <p className="text-caption font-medium leading-caption text-ink">
                      {item.controlName}
                    </p>
                    <StatusBadge
                      variant={item.gapType === "no" ? "negative" : "warning"}
                    >
                      {t(`verdict.${item.gapType}`)}
                    </StatusBadge>
                  </div>

                  {item.criterion ? (
                    <p className="text-caption leading-caption text-carbon">
                      {item.criterion}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-4">
                    <span className="text-caption font-medium leading-caption text-ink">
                      {t("actionLabel")}
                    </span>
                    <Textarea
                      value={item.action}
                      onChange={(event) => patch(key, { action: event.target.value })}
                      disabled={accepting}
                      className="min-h-[64px]"
                    />
                  </div>

                  <div className="grid gap-8 md:grid-cols-3">
                    <label className="flex flex-col gap-4">
                      <span className="text-caption font-medium leading-caption text-ink">
                        {t("priorityLabel")}
                      </span>
                      <Select
                        value={item.priority}
                        onChange={(event) =>
                          patch(key, {
                            priority: event.target.value as EditableItem["priority"],
                          })
                        }
                        disabled={accepting}
                        className="cursor-pointer"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {t(`priority.${p}`)}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="flex flex-col gap-4">
                      <span className="text-caption font-medium leading-caption text-ink">
                        {t("effortLabel")}
                      </span>
                      <Select
                        value={item.effort}
                        onChange={(event) =>
                          patch(key, {
                            effort: event.target.value as EditableItem["effort"],
                          })
                        }
                        disabled={accepting}
                        className="cursor-pointer"
                      >
                        {EFFORTS.map((e) => (
                          <option key={e} value={e}>
                            {t(`effort.${e}`)}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="flex flex-col gap-4">
                      <span className="text-caption font-medium leading-caption text-ink">
                        {t("dueLabel")}
                      </span>
                      <Input
                        type="date"
                        value={item.dueDate}
                        onChange={(event) => patch(key, { dueDate: event.target.value })}
                        disabled={accepting}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-8">
                    <Button
                      onClick={() => handleAccept(item)}
                      disabled={accepting || !item.action.trim()}
                    >
                      {accepting ? t("accepted") : t("accept")}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleDismiss(item)}
                      disabled={accepting}
                    >
                      {t("dismiss")}
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}
