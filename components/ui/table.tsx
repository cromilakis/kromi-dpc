import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

/**
 * Table primitives — estilos del prototipo (§3.6 "Tabla por CSS grid"):
 * header 11px/600 uppercase (ls 0.3px), celdas 14px Ink, padding 14px 18px,
 * divisores de fila #f3f4f6 (Ash) y línea del header en Stone. Se implementa
 * con <table> semántico (doctrina Nivel 1: estructura semántica y a11y) en
 * lugar del grid de divs del prototipo.
 * El header usa Carbon (no el #8f99a8 del prototipo, que falla AA a 11px —
 * regla a11y del proyecto: texto ≤13px nunca más claro que carbon) y fija
 * scope="col" por defecto (sobrescribible vía props).
 * Envolver en <Card padded={false}> reproduce la "Card con tabla" (§3.3).
 */
export function Table({
  className,
  ...props
}: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse", className)} {...props} />
    </div>
  );
}

export function TableHead({
  className,
  ...props
}: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      className={cn("[&_tr]:border-b [&_tr]:border-stone", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: ComponentPropsWithoutRef<"tbody">) {
  return (
    <tbody
      className={cn(
        "[&_tr]:border-b [&_tr]:border-ash [&_tr:last-child]:border-0",
        className,
      )}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: ComponentPropsWithoutRef<"tr">) {
  return <tr className={cn("transition-colors", className)} {...props} />;
}

export function TableHeaderCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "px-[18px] py-12 text-left text-[11px] font-semibold uppercase leading-[1.5] tracking-[0.3px] text-carbon",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className={cn(
        "px-[18px] py-[14px] align-middle text-body-sm leading-body-sm tracking-body-sm text-ink",
        className,
      )}
      {...props}
    />
  );
}
