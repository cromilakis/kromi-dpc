import type { ReactNode } from "react";
import { cn } from "@/components/ui";

/**
 * PageHeader — encabezado estándar de las vistas del shell interno
 * (prototipo §1.4: eyebrow 13px/600, H1 serif 40px, subtítulo 15px Metal).
 * API ESTABLE para todos los módulos (checklist, riesgos, plan, etc.):
 * título obligatorio; eyebrow, descripción y slot de acciones opcionales.
 * Server-friendly (sin hooks); los textos SIEMPRE llegan por props (i18n del
 * módulo consumidor).
 */
export interface PageHeaderProps {
  /** Micro-label sobre el título (p. ej. "Checklist DPC · Empresa X"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Slot de acciones (botones/links) alineado a la derecha del título. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-28 flex items-start justify-between gap-16",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-8 text-[13px] font-semibold text-ink">{eyebrow}</p>
        ) : null}
        <h1 className="font-serif text-heading font-medium leading-heading tracking-heading text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-[6px] text-[15px] tracking-[-0.2px] text-metal">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-8 pt-8">{actions}</div>
      ) : null}
    </header>
  );
}
