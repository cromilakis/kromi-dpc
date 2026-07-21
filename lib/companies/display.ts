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
 * Avance de cumplimiento sobre el MODELO NUEVO (sub-proyecto #8): brechas
 * resueltas / brechas totales del diagnóstico activo. Centralizado para que
 * panel, listado, resumen y portal midan el avance igual. Un diagnóstico sin
 * brechas es 100% (diagnóstico limpio).
 */
export function diagnosisProgress(resolutionStatuses: readonly string[] | null): {
  resolved: number;
  total: number;
  pct: number;
} {
  // null = la empresa aún no tiene diagnóstico activo → avance 0.
  if (resolutionStatuses === null) return { resolved: 0, total: 0, pct: 0 };
  const total = resolutionStatuses.length;
  const resolved = resolutionStatuses.filter((status) => status === "resolved").length;
  // Diagnóstico limpio (0 brechas) = 100%.
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 100;
  return { resolved, total, pct };
}
