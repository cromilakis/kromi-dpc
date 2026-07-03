"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import {
  removeRisk,
  updateRisk,
  type RiskActionError,
} from "@/lib/actions/risks";
import { riskSeverity, severityBadgeVariant } from "@/lib/risks/severity";
import type { Database } from "@/lib/supabase/types";

/**
 * Tabla de riesgos asignados — spec riesgos-gap (prototipo §1.4.7, card
 * "Catálogo de riesgos identificados" llevado a tabla): código R-XXX,
 * descripción, clasificación, I, P y severidad (StatusBadge por score I×P).
 * Client component por la edición inline (selects 1–5 de impacto y
 * probabilidad → updateRisk) y el quitar con confirmación (removeRisk).
 * Los errores de las actions se muestran en un alert único sobre la tabla.
 * Manejo de foco (los triggers se desmontan al abrir edición/confirmación):
 * al abrir, el foco pasa al primer select o al botón de confirmar (con la
 * pregunta como descripción accesible); al cancelar, vuelve al trigger
 * original. Se resuelve por id + useEffect porque solo una fila puede estar
 * en edición/confirmación a la vez.
 */

type RiskClassification = Database["public"]["Enums"]["risk_classification"];

export interface AssignedRiskRow {
  /** id de la fila company_risks. */
  id: string;
  code: string;
  description: string;
  classification: RiskClassification;
  impact: number;
  probability: number;
}

const SCALE = [1, 2, 3, 4, 5] as const;

export function RisksTable({
  companyId,
  risks,
}: {
  companyId: string;
  risks: AssignedRiskRow[];
}) {
  const t = useTranslations("app.risks.table");
  const tErrors = useTranslations("app.risks.errors");
  const tSeverities = useTranslations("app.risks.severities");

  const [isPending, startTransition] = useTransition();
  /** Fila en edición inline (valores locales de los selects). */
  const [editing, setEditing] = useState<{
    id: string;
    impact: number;
    probability: number;
  } | null>(null);
  /** Fila con la confirmación de quitar abierta. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  /** Fila cuya mutación está en vuelo (para el label de progreso). */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<RiskActionError | null>(null);

  /** id de elemento a enfocar tras el próximo render (retorno de foco). */
  const focusTargetId = useRef<string | null>(null);
  useEffect(() => {
    if (!focusTargetId.current) return;
    document.getElementById(focusTargetId.current)?.focus();
    focusTargetId.current = null;
  });
  function queueFocus(id: string) {
    focusTargetId.current = id;
  }

  function handleSave() {
    if (!editing) return;
    const { id, impact, probability } = editing;
    setBusyId(id);
    startTransition(async () => {
      const result = await updateRisk({ id, companyId, impact, probability });
      if (result.ok) {
        setEditing(null);
        setError(null);
        queueFocus(`risk-edit-${id}`);
      } else {
        setError(result.error);
      }
      setBusyId(null);
    });
  }

  function handleRemove(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const result = await removeRisk({ id, companyId });
      if (result.ok) {
        setConfirmingId(null);
        setError(null);
      } else {
        setError(result.error);
      }
      setBusyId(null);
    });
  }

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-baseline justify-between gap-8 border-b border-stone px-16 py-12">
        <h2 className="text-body-sm font-semibold leading-body-sm tracking-body-sm text-ink">
          {t("title")}
        </h2>
        <p className="text-caption leading-caption tracking-caption text-carbon">
          {t("count", { count: risks.length })}
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="border-b border-stone bg-[#f6e9e8] px-16 py-8 text-caption leading-caption tracking-caption text-danger-red"
        >
          {tErrors(error)}
        </p>
      ) : null}

      {risks.length === 0 ? (
        <p className="px-16 py-24 text-body-sm leading-body-sm tracking-body-sm text-metal">
          {t("empty")}
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("code")}</TableHeaderCell>
              <TableHeaderCell>{t("description")}</TableHeaderCell>
              <TableHeaderCell>{t("classification")}</TableHeaderCell>
              <TableHeaderCell>
                <abbr title={t("impactFull")} className="no-underline">
                  {t("impactShort")}
                </abbr>
              </TableHeaderCell>
              <TableHeaderCell>
                <abbr title={t("probabilityFull")} className="no-underline">
                  {t("probabilityShort")}
                </abbr>
              </TableHeaderCell>
              <TableHeaderCell>{t("severity")}</TableHeaderCell>
              <TableHeaderCell>
                <span className="sr-only">{t("actions")}</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {risks.map((risk) => {
              const isEditing = editing?.id === risk.id;
              const isConfirming = confirmingId === risk.id;
              const isBusy = isPending && busyId === risk.id;
              const impact = isEditing ? editing.impact : risk.impact;
              const probability = isEditing
                ? editing.probability
                : risk.probability;
              const severity = riskSeverity(impact, probability);

              return (
                <TableRow key={risk.id}>
                  <TableCell className="whitespace-nowrap text-[11px] font-bold text-ink">
                    {risk.code}
                  </TableCell>
                  <TableCell className="min-w-[240px] text-[13px] text-carbon">
                    {risk.description}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant="neutral">
                      {t(`classifications.${risk.classification}`)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        id={`risk-impact-${risk.id}`}
                        aria-label={t("impactFull")}
                        value={editing.impact}
                        disabled={isBusy}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            impact: Number(event.target.value),
                          })
                        }
                        className="w-[64px]"
                      >
                        {SCALE.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      risk.impact
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        aria-label={t("probabilityFull")}
                        value={editing.probability}
                        disabled={isBusy}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            probability: Number(event.target.value),
                          })
                        }
                        className="w-[64px]"
                      >
                        {SCALE.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      risk.probability
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={severityBadgeVariant[severity]}>
                      {tSeverities(severity)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {isEditing ? (
                      <span className="inline-flex items-center gap-4">
                        <Button
                          variant="primary"
                          onClick={handleSave}
                          disabled={isBusy}
                          className="px-8 py-4 text-caption"
                        >
                          {isBusy ? t("saving") : t("save")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditing(null);
                            queueFocus(`risk-edit-${risk.id}`);
                          }}
                          disabled={isBusy}
                          className="px-8 py-4 text-caption"
                        >
                          {t("cancel")}
                        </Button>
                      </span>
                    ) : isConfirming ? (
                      <span className="inline-flex items-center gap-8">
                        <span
                          id={`risk-confirm-question-${risk.id}`}
                          className="text-caption leading-caption tracking-caption text-carbon"
                        >
                          {t("confirmRemove")}
                        </span>
                        <Button
                          id={`risk-confirm-${risk.id}`}
                          variant="secondary"
                          aria-describedby={`risk-confirm-question-${risk.id}`}
                          onClick={() => handleRemove(risk.id)}
                          disabled={isBusy}
                          className="px-8 py-4 text-caption text-danger-red"
                        >
                          {isBusy ? t("removing") : t("confirmYes")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setConfirmingId(null);
                            queueFocus(`risk-remove-${risk.id}`);
                          }}
                          disabled={isBusy}
                          className="px-8 py-4 text-caption"
                        >
                          {t("cancel")}
                        </Button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-4">
                        <Button
                          id={`risk-edit-${risk.id}`}
                          variant="ghost"
                          aria-label={t("editAria", { code: risk.code })}
                          disabled={isPending}
                          onClick={() => {
                            setConfirmingId(null);
                            setEditing({
                              id: risk.id,
                              impact: risk.impact,
                              probability: risk.probability,
                            });
                            queueFocus(`risk-impact-${risk.id}`);
                          }}
                          className="px-8 py-4 text-caption"
                        >
                          {t("edit")}
                        </Button>
                        <Button
                          id={`risk-remove-${risk.id}`}
                          variant="ghost"
                          aria-label={t("removeAria", { code: risk.code })}
                          disabled={isPending}
                          onClick={() => {
                            setEditing(null);
                            setConfirmingId(risk.id);
                            queueFocus(`risk-confirm-${risk.id}`);
                          }}
                          className="px-8 py-4 text-caption text-danger-red hover:text-danger-red"
                        >
                          {t("remove")}
                        </Button>
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
