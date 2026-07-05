import type { ReactNode } from "react";

/**
 * InfoTooltip — ícono "(?)" de ayuda contextual (qué es el campo, para qué
 * sirve y un ejemplo). El disparador es un <span role="button" tabIndex=0>
 * (no un <button>) para poder anidarse dentro de un <label> sin romper la
 * semántica; la ayuda se revela en hover del grupo y con foco de teclado
 * (group-focus-within), sin JS. Decorativo/complementario: el label del campo
 * sigue siendo la fuente principal de significado.
 */
export function InfoTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex align-middle">
      <span
        role="button"
        tabIndex={0}
        aria-label={label}
        className="flex h-[16px] w-[16px] cursor-help items-center justify-center rounded-full border border-slate text-[10px] font-semibold leading-none text-carbon transition-colors hover:border-carbon hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-blue/40"
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-50 w-[264px] -translate-x-1/2 rounded-cards border border-stone bg-white p-12 text-left text-[12px] font-normal leading-[1.5] tracking-normal text-carbon opacity-0 shadow-subtle-2 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 max-sm:w-[220px]"
      >
        {children}
      </span>
    </span>
  );
}
