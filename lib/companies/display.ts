import type { StatusBadgeVariant } from "@/components/ui";
import type { CompanyPhase } from "./schema";

/**
 * Helpers de PRESENTACIÓN del módulo empresas (puros, sin I/O), compartidos
 * por el panel general, el listado y el resumen de empresa. Mapas semánticos
 * del prototipo §3.5 sobre StatusBadge/ProgressBar del kit UI.
 */

/** Fase → variante de StatusBadge (mismo mapa que el topbar del shell). */
export const PHASE_BADGE_VARIANT: Record<CompanyPhase, StatusBadgeVariant> = {
  diagnostico: "neutral",
  propuesta: "warning",
  certificacion: "active",
  revalidacion: "positive",
};

/** pctColor del prototipo: ≥80 verde / ≥50 ámbar / <50 rojo (fill de barra). */
export function progressFillClass(pct: number): string {
  if (pct >= 80) return "bg-success-green";
  if (pct >= 50) return "bg-warning-yellow";
  return "bg-danger-red";
}

/** Iniciales (2 letras) del avatar cuadrado del prototipo ({{ c.in }}). */
export function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0]![0]}${words[1]![0]}`
      : (words[0] ?? "").slice(0, 2);
  return initials.toUpperCase() || "·";
}

/**
 * Avance del checklist a partir de los estados de assessment_controls del
 * ciclo vigente: evaluado = todo lo que ya no está 'pending'.
 */
export function checklistProgress(statuses: readonly string[]): {
  evaluated: number;
  total: number;
  pct: number;
} {
  const total = statuses.length;
  const evaluated = statuses.filter((status) => status !== "pending").length;
  const pct = total > 0 ? Math.round((evaluated / total) * 100) : 0;
  return { evaluated, total, pct };
}
