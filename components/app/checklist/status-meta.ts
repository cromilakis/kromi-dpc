import type { StatusBadgeVariant } from "@/components/ui";
import type { Database } from "@/lib/supabase/types";

/**
 * Metadatos compartidos de estados del módulo checklist-evaluacion:
 * mapeo enum de BD → variante semántica del StatusBadge (prototipo §3.5)
 * y orden de ciclado del estado de control (prototipo §7: la pill cicla).
 * Server-safe (sin "use client"): lo consumen páginas y client components.
 */

export type ControlStatus = Database["public"]["Enums"]["control_result"];
export type EvidenceStatus = Database["public"]["Enums"]["evidence_status"];

/** Orden de ciclado del botón de estado: pendiente → cumple → parcial → no cumple. */
export const CONTROL_STATUS_ORDER: readonly ControlStatus[] = [
  "pending",
  "compliant",
  "partial",
  "non_compliant",
];

export const CONTROL_STATUS_VARIANT: Record<ControlStatus, StatusBadgeVariant> = {
  pending: "neutral",
  compliant: "positive",
  partial: "warning",
  non_compliant: "negative",
  // Fuera de alcance por aplicabilidad; se muestra en tono neutral apagado.
  not_applicable: "neutral",
};

/** Evidencia requerida: validada verde / parcial ámbar / faltante y rechazada rojo. */
export const EVIDENCE_STATUS_VARIANT: Record<EvidenceStatus, StatusBadgeVariant> = {
  validated: "positive",
  partial: "warning",
  missing: "negative",
  rejected: "negative",
};
