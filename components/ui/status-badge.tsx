import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

/**
 * StatusBadge — sistema de 5 estados semánticos del prototipo
 * (design/prototype-analysis.md §3.5, tintes exactos):
 * - positive:  #075a39 sobre #e9f2ec (Cumple / Validada / Completado / Revalidación)
 * - warning:   #705500 sobre #f6f0df (Parcial / Pendiente / En curso / Propuesta)
 * - negative:  #772322 sobre #f6e9e8 (No cumple / Faltante / Rechazado / Crítico)
 * - active:    #2f66c9 sobre #eaf1fe (Activo / En revisión / Certificación)
 * - neutral:   carbon sobre #f3f4f6 (Diagnóstico / Pendiente de fase) — el
 *   prototipo usa #6f7988, pero falla AA a 11px/600 sobre ash (regla a11y
 *   del proyecto: texto ≤13px nunca más claro que carbon)
 * Los fondos-tinte no son tokens del @theme: se fijan como valores arbitrarios
 * exactos del prototipo. Texto: 11px/600, radius tags 4px, padding 2px 8px.
 * `pill` opcional reproduce las pills de estado/fase (radius 999) del prototipo §3.4.
 */
export type StatusBadgeVariant =
  | "positive"
  | "warning"
  | "negative"
  | "active"
  | "neutral";

const variantClasses: Record<StatusBadgeVariant, string> = {
  positive: "text-success-green bg-[#e9f2ec]",
  warning: "text-warning-yellow bg-[#f6f0df]",
  negative: "text-danger-red bg-[#f6e9e8]",
  // Único hex fuera del Style Reference: action-blue oscurecido para AA en
  // 11px sobre #eaf1fe.
  active: "text-[#2f66c9] bg-[#eaf1fe]",
  neutral: "text-carbon bg-ash",
};

export interface StatusBadgeProps extends ComponentPropsWithoutRef<"span"> {
  variant: StatusBadgeVariant;
  /** Forma pill (radius 999) usada por estados de control y fases en el prototipo. */
  pill?: boolean;
}

export function StatusBadge({
  variant,
  pill = false,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-4 px-8 py-[2px] text-[11px] font-semibold leading-[1.5]",
        pill ? "rounded-full px-12 py-4 text-caption" : "rounded-tags",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
