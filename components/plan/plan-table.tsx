"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Card,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type StatusBadgeVariant,
} from "@/components/ui";
import {
  updateRemediationStatus,
  type RemediationActionError,
} from "@/lib/actions/remediation";
import type { Database } from "@/lib/supabase/types";

/**
 * Tabla del plan de adecuación — spec plan-adecuacion (prototipo §1.4.9):
 * tarea, solución vinculada, responsable, vencimiento y estado. El estado es
 * un StatusBadge CICLABLE (botón): pending → in_progress → done → pending vía
 * updateRemediationStatus (audit_log 'remediation.status_changed').
 * Variantes del sistema semántico: pendiente gris / en curso ámbar /
 * completada verde (§3.5). Las filas llegan ya ordenadas por vencimiento.
 * Una región sr-only aria-live anuncia el estado resultante tras cada ciclo
 * (el aria-label del botón enfocado no se re-anuncia solo).
 */

type RemediationStatus = Database["public"]["Enums"]["remediation_status"];

export interface PlanTaskRow {
  id: string;
  title: string;
  /** Título de la solución del catálogo vinculada (null si tarea manual). */
  solutionTitle: string | null;
  responsible: string | null;
  /** Fecha ISO (YYYY-MM-DD) o null si no tiene vencimiento. */
  dueDate: string | null;
  status: RemediationStatus;
}

/** Ciclo del botón de estado (prototipo §7: la pill cicla). */
const NEXT_STATUS: Record<RemediationStatus, RemediationStatus> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};

const STATUS_VARIANT: Record<RemediationStatus, StatusBadgeVariant> = {
  pending: "neutral",
  in_progress: "warning",
  done: "positive",
};

export function PlanTable({
  companyId,
  tasks,
}: {
  companyId: string;
  tasks: PlanTaskRow[];
}) {
  const t = useTranslations("app.plan.table");
  const tStatuses = useTranslations("app.plan.statuses");
  const tErrors = useTranslations("app.plan.errors");
  const format = useFormatter();

  const [isPending, startTransition] = useTransition();
  /** Fila cuya mutación está en vuelo (se deshabilita su botón). */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<RemediationActionError | null>(null);
  /** Anuncio live del último cambio de estado ("" hasta el primero). */
  const [announcement, setAnnouncement] = useState("");

  function handleCycle(task: PlanTaskRow) {
    setBusyId(task.id);
    startTransition(async () => {
      const result = await updateRemediationStatus({
        id: task.id,
        companyId,
        status: NEXT_STATUS[task.status],
      });
      if (result.ok) {
        setError(null);
        setAnnouncement(
          t("statusAnnouncement", {
            task: task.title,
            status: tStatuses(NEXT_STATUS[task.status]),
          }),
        );
      } else {
        setError(result.error);
      }
      setBusyId(null);
    });
  }

  function formatDue(dueDate: string): string {
    // Fecha-only en UTC fijo: evita el corrimiento de día por timezone local.
    return format.dateTime(new Date(`${dueDate}T00:00:00Z`), {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  return (
    <Card padded={false}>
      <div className="border-b border-stone px-16 py-12">
        <h2 className="text-body-sm font-semibold leading-body-sm tracking-body-sm text-ink">
          {t("title")}
        </h2>
      </div>

      {/* Confirmación audible del ciclo de estado para lectores de pantalla. */}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>

      {error ? (
        <p
          role="alert"
          className="border-b border-stone bg-[#f6e9e8] px-16 py-8 text-caption leading-caption tracking-caption text-danger-red"
        >
          {tErrors(error)}
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <p className="px-16 py-24 text-body-sm leading-body-sm tracking-body-sm text-metal">
          {t("empty")}
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("task")}</TableHeaderCell>
              <TableHeaderCell>{t("solution")}</TableHeaderCell>
              <TableHeaderCell>{t("responsible")}</TableHeaderCell>
              <TableHeaderCell>{t("due")}</TableHeaderCell>
              <TableHeaderCell>{t("status")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => {
              const isBusy = isPending && busyId === task.id;
              return (
                <TableRow key={task.id}>
                  <TableCell className="min-w-[220px] font-medium">
                    {task.title}
                  </TableCell>
                  <TableCell className="text-[13px] text-carbon">
                    {task.solutionTitle ?? t("none")}
                  </TableCell>
                  <TableCell className="text-[13px] text-carbon">
                    {task.responsible ?? t("none")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[13px] text-carbon">
                    {task.dueDate ? formatDue(task.dueDate) : t("none")}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      disabled={isPending}
                      aria-label={t("statusButton", {
                        task: task.title,
                        status: tStatuses(task.status),
                      })}
                      onClick={() => handleCycle(task)}
                      className="rounded-tags transition-opacity focus:outline-none focus:ring-[3px] focus:ring-focus-blue/40 disabled:pointer-events-none data-[busy=true]:opacity-60"
                      data-busy={isBusy}
                    >
                      <StatusBadge variant={STATUS_VARIANT[task.status]}>
                        {tStatuses(task.status)}
                      </StatusBadge>
                    </button>
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
