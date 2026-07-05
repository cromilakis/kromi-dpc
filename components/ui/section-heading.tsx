import { createElement, type ElementType, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * SectionHeading — Style Reference Attio: headlines >= 28px SIEMPRE en serif
 * (Newsreader como sustituto de Tiempos Text), weight 500, letter-spacing
 * negativo según el type scale. Eyebrow opcional en Ink (13px/600, patrón de
 * encabezado del prototipo §2.1) y descripción 16px Metal.
 */
export type SectionHeadingSize = "sm" | "md" | "lg" | "display";

const sizeClasses: Record<SectionHeadingSize, string> = {
  /* 28px — heading-sm */
  sm: "text-heading-sm leading-heading-sm tracking-heading-sm",
  /* 40px — heading (H2 landing / H1 vistas app) */
  md: "text-heading leading-heading tracking-heading",
  /* 56px — heading-lg */
  lg: "text-heading-lg leading-heading-lg tracking-heading-lg",
  /* 64px — display (H1 hero landing) */
  display: "text-display leading-display tracking-display",
};

export interface SectionHeadingProps {
  title: ReactNode;
  /** Etiqueta corta sobre el título (13px/600 Ink). */
  eyebrow?: ReactNode;
  /** Párrafo de apoyo bajo el título (16px Metal). */
  description?: ReactNode;
  /** Nivel semántico del heading; el tamaño visual lo controla `size`. */
  as?: ElementType;
  size?: SectionHeadingSize;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  title,
  eyebrow,
  description,
  as: Heading = "h2",
  size = "md",
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        align === "center" && "text-center",
        className,
      )}
    >
      {eyebrow ? (
        /* Eyebrow canónico ink — accent default del prototipo; overcast fallaba AA. */
        <p className="mb-12 text-[13px] font-semibold leading-[1.2] text-ink">
          {eyebrow}
        </p>
      ) : null}
      {/* createElement (no JSX) para el tag dinámico: evita el conflicto de
          tipos de JSX.IntrinsicElements introducido por react-three-fiber. */}
      {createElement(
        Heading,
        { className: cn("font-serif font-medium text-ink", sizeClasses[size]) },
        title,
      )}
      {description ? (
        <p
          className={cn(
            "mt-16 text-body leading-body tracking-body text-carbon",
            align === "center" && "mx-auto max-w-[640px]",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
