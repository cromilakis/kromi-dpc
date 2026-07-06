"use client";

import { Button } from "@/components/ui";

/**
 * Botón "Imprimir" de la vista imprimible del guion (Task 4). Client
 * component mínimo: lo único que necesita del navegador es `window.print()`.
 * Se oculta en impresión (`no-print`, ver `<style>` de la página) para no
 * aparecer en el papel.
 */
export function PrintGuideButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="no-print"
      onClick={() => window.print()}
    >
      {label}
    </Button>
  );
}
