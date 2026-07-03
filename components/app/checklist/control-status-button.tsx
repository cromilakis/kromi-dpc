"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui";
import { setControlStatus } from "@/lib/actions/assessments";
import { CONTROL_STATUS_ORDER, type ControlStatus } from "./status-meta";

/**
 * Botón cicable de estado de control (prototipo §1.4.5 pill de la fila del
 * checklist y §1.4.6 botón grande de la ficha): cada activación avanza al
 * siguiente estado del ciclo pendiente → cumple → parcial → no cumple y lo
 * persiste vía setControlStatus con estado ABSOLUTO (clics rápidos convergen
 * al último valor elegido). Optimistic UI con useOptimistic: el tinte cambia
 * de inmediato y solo revierte si la action falla (error visible + rol alert).
 * Accesible: <button> real, aria-label descriptivo (código + estado actual),
 * aria-busy durante la persistencia; el hint "cambiar ↻" es decorativo.
 * Como los lectores de pantalla no re-anuncian el nombre del botón enfocado
 * al cambiar, una región sr-only aria-live="polite" anuncia el nuevo estado
 * optimista tras cada activación (confirmación audible del ciclo).
 */

/** Tintes semánticos del sistema de estados (§3.5) — espejo del StatusBadge.
 *  pending no existe en el prototipo (statusMeta): se resuelve neutral con
 *  texto carbon (regla a11y: texto ≤13px nunca más claro que carbon). */
const STATUS_TINTS: Record<ControlStatus, string> = {
  pending: "bg-ash text-carbon border-carbon/15",
  compliant: "bg-[#e9f2ec] text-success-green border-success-green/15",
  partial: "bg-[#f6f0df] text-warning-yellow border-warning-yellow/15",
  non_compliant: "bg-[#f6e9e8] text-danger-red border-danger-red/15",
};

export interface ControlStatusButtonProps {
  /** id de la fila assessment_controls (no del catálogo). */
  assessmentControlId: string;
  status: ControlStatus;
  controlCode: string;
  /** pill = fila del checklist; large = botón full-width de la ficha. */
  size?: "pill" | "large";
  className?: string;
}

export function ControlStatusButton({
  assessmentControlId,
  status,
  controlCode,
  size = "pill",
  className,
}: ControlStatusButtonProps) {
  const t = useTranslations("app.checklist");
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [failed, setFailed] = useState(false);
  /** Anuncio live del último cambio ("" hasta la primera activación). */
  const [announcement, setAnnouncement] = useState("");

  const label = t(`statuses.${optimisticStatus}`);

  function handleClick() {
    const index = CONTROL_STATUS_ORDER.indexOf(optimisticStatus);
    const next =
      CONTROL_STATUS_ORDER[(index + 1) % CONTROL_STATUS_ORDER.length]!;
    setFailed(false);
    setAnnouncement(
      t("statusButton.announcement", {
        code: controlCode,
        status: t(`statuses.${next}`),
      }),
    );
    startTransition(async () => {
      setOptimisticStatus(next);
      const result = await setControlStatus({
        assessment_control_id: assessmentControlId,
        status: next,
      });
      if (!result.ok) setFailed(true);
    });
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        size === "pill" ? "items-end" : "items-stretch",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={t("statusButton.action", { code: controlCode, status: label })}
        aria-busy={isPending}
        className={cn(
          "border font-semibold transition-colors",
          size === "pill"
            ? "rounded-full px-12 py-4 text-caption leading-caption"
            : "flex w-full items-center justify-between gap-12 rounded-buttons px-16 py-12 text-[15px] leading-[1.4]",
          STATUS_TINTS[optimisticStatus],
          isPending && "opacity-70",
        )}
      >
        <span className="truncate">{label}</span>
        {size === "large" ? (
          <span aria-hidden="true" className="shrink-0 text-caption font-medium">
            {t("statusButton.change")} ↻
          </span>
        ) : null}
      </button>
      {/* Confirmación audible para SR: el aria-label del botón no se
          re-anuncia al cambiar, la live region sí. */}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
      {failed ? (
        <p role="alert" className="mt-4 text-[11px] font-medium leading-[1.4] text-danger-red">
          {t("statusButton.error")}
        </p>
      ) : null}
    </div>
  );
}
