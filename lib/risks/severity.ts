import type { StatusBadgeVariant } from "@/components/ui";

/**
 * Severidad de un riesgo asignado — score = impacto × probabilidad (escalas
 * 1–5 de company_risks, migración 20260702100100). Bandas estándar de matriz
 * 5×5, trasladando la semántica del prototipo (§1.4.7: rojo/ámbar/verde):
 *   ≥15 → high (rojo) · ≥5 → medium (ámbar) · <5 → low (verde).
 * Helper puro compartido por server components (matriz) y client components
 * (tabla de riesgos): sin "use client" ni "server-only".
 */
export type RiskSeverity = "low" | "medium" | "high";

export function riskSeverity(impact: number, probability: number): RiskSeverity {
  const score = impact * probability;
  if (score >= 15) return "high";
  if (score >= 5) return "medium";
  return "low";
}

/** Variante de StatusBadge por severidad (sistema semántico del prototipo). */
export const severityBadgeVariant: Record<RiskSeverity, StatusBadgeVariant> = {
  low: "positive",
  medium: "warning",
  high: "negative",
};

/**
 * Tintes de fondo EXACTOS del prototipo (§3.5) para las celdas de la matriz
 * y la leyenda: verde #e9f2ec · ámbar #f6f0df · rojo #f6e9e8.
 */
export const severityTintClass: Record<RiskSeverity, string> = {
  low: "bg-[#e9f2ec]",
  medium: "bg-[#f6f0df]",
  high: "bg-[#f6e9e8]",
};
