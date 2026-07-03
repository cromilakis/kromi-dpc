import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Field — label + control + error/hint. Prototipo §3.6:
 * label 12px/500 con margin-bottom 6px (Carbon, no el Metal del prototipo:
 * regla a11y del proyecto — texto ≤13px nunca más claro que carbon);
 * error en Danger Red.
 * Textos SIEMPRE por props (cero strings hardcodeados).
 * Si se pasa `htmlFor`, el error recibe id `{htmlFor}-error` y el hint
 * `{htmlFor}-hint` para que el consumidor los enlace vía aria-describedby
 * en el control.
 */
export interface FieldProps {
  label: ReactNode;
  /** id del control asociado (se usa en el <label> y para el id del error). */
  htmlFor?: string;
  error?: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-[6px] text-caption leading-caption tracking-caption font-medium text-carbon"
      >
        {label}
      </label>
      {children}
      {hint && !error ? (
        /* Contraste AA en texto pequeño: carbon ≥4.5:1 (overcast fallaba). */
        <p
          id={htmlFor ? `${htmlFor}-hint` : undefined}
          className="mt-[6px] text-caption leading-caption tracking-caption text-carbon"
        >
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="mt-[6px] text-caption leading-caption tracking-caption text-danger-red"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
