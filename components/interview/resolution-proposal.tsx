"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Input, Select, StatusBadge, Textarea } from "@/components/ui";
import { proposeRemediationForSession } from "@/lib/actions/interview";
import { createRemediationFromProposal } from "@/lib/actions/remediation";
import type { EnrichedProposalItem } from "@/lib/actions/interview";

/**
 * Panel "Propuesta de resolución" (Fase 2): al cerrar el diagnóstico, se propone
 * por cada gap (No cumple/parcial/Falta aclarar) una acción estructurada (acción
 * + prioridad + esfuerzo + plazo) mediante un mapeo DETERMINISTA gap→mitigación
 * (`buildRemediationProposal`, sin LLM). El consultor revisa/edita cada tarjeta y
 * **acepta** (crea la tarea en el Plan de adecuación con origin='diagnosis') o
 * **descarta**. La propuesta nunca crea tareas por sí sola.
 */

type ProposalError = "generic";

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
        setError("generic");
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
    <section aria-labelledby="diagnosis-proposal-title" className="flex flex-col gap-16">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div>
          <h2
            id="diagnosis-proposal-title"
            className="text-body-sm font-semibold text-ink"
          >
            {t("title")}
          </h2>
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
        <ul className="flex flex-col gap-8">
          {items.map((item) => {
            const key = keyOf(item);
            const accepting = acceptingKey === key;
            return (
              <li key={key}>
                <Card padded={false} className="flex flex-col gap-8 border-ink/10 p-12">
                  {/* Encabezado compacto: veredicto + control + criterio en una línea. */}
                  <div className="flex items-center gap-8">
                    <StatusBadge
                      variant={item.gapType === "no" ? "negative" : "warning"}
                    >
                      {t(`verdict.${item.gapType}`)}
                    </StatusBadge>
                    <p className="min-w-0 flex-1 truncate text-caption leading-caption text-carbon">
                      <span className="font-medium text-ink">{item.controlName}</span>
                      {item.criterion ? ` · ${item.criterion}` : ""}
                    </p>
                  </div>

                  <Textarea
                    value={item.action}
                    onChange={(event) => patch(key, { action: event.target.value })}
                    disabled={accepting}
                    aria-label={t("actionLabel")}
                    className="min-h-[40px] py-[6px]"
                  />
                  {item.example ? (
                    <p className="text-caption leading-caption text-metal">{item.example}</p>
                  ) : null}

                  {/* Controles + acciones en una sola fila. */}
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="w-[104px]">
                      <Select
                        value={item.priority}
                        onChange={(event) =>
                          patch(key, {
                            priority: event.target.value as EditableItem["priority"],
                          })
                        }
                        disabled={accepting}
                        aria-label={t("priorityLabel")}
                        title={t("priorityLabel")}
                        className="h-32 cursor-pointer py-0"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {t(`priority.${p}`)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-[104px]">
                      <Select
                        value={item.effort}
                        onChange={(event) =>
                          patch(key, {
                            effort: event.target.value as EditableItem["effort"],
                          })
                        }
                        disabled={accepting}
                        aria-label={t("effortLabel")}
                        title={t("effortLabel")}
                        className="h-32 cursor-pointer py-0"
                      >
                        {EFFORTS.map((e) => (
                          <option key={e} value={e}>
                            {t(`effort.${e}`)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-[150px]">
                      <Input
                        type="date"
                        value={item.dueDate}
                        onChange={(event) => patch(key, { dueDate: event.target.value })}
                        disabled={accepting}
                        aria-label={t("dueLabel")}
                        title={t("dueLabel")}
                        className="h-32 py-0"
                      />
                    </div>
                    <div className="ml-auto flex items-center gap-8">
                      <Button
                        variant="secondary"
                        onClick={() => handleDismiss(item)}
                        disabled={accepting}
                        className="h-32 py-0"
                      >
                        {t("dismiss")}
                      </Button>
                      <Button
                        onClick={() => handleAccept(item)}
                        disabled={accepting || !item.action.trim()}
                        className="h-32 py-0"
                      >
                        {accepting ? t("accepted") : t("accept")}
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
