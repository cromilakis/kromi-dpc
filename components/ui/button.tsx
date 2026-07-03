import type { ComponentProps } from "react";
import { cn } from "./cn";

/**
 * Button — Style Reference Attio (.kromi/design.md §Components):
 * - Primary CTA: bg Ink, texto White, borde Ink.
 * - Secondary CTA: bg White, texto Ink, borde Slate.
 * - Ghost (prototipo §3.2 "Ghost / back-link"): transparente, texto Metal.
 * Común: 14px Inter 500, padding 8px/12px, radius 10px (rounded-buttons).
 * Hover: Ash está documentado como "button pressed state" (design.md, Tokens — Colors).
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";

const baseClasses =
  "inline-flex items-center justify-center gap-8 rounded-buttons " +
  "text-body-sm leading-body-sm tracking-body-sm font-medium " +
  "px-12 py-8 transition-colors disabled:pointer-events-none disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border border-ink bg-ink text-white hover:bg-ink/90",
  secondary: "border border-slate bg-white text-ink hover:bg-ash",
  ghost: "border border-transparent bg-transparent text-metal hover:bg-ash hover:text-ink",
};

/**
 * Construye las clases de botón para aplicarlas a otros elementos
 * (p. ej. <Link> estilizado como CTA) sin duplicar estilos.
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  className?: string,
): string {
  return cn(baseClasses, variantClasses[variant], className);
}

/** ComponentProps (React 19): incluye `ref`, que fluye vía el spread. */
export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, className)}
      {...props}
    />
  );
}
