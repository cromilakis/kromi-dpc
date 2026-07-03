"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

/**
 * Error boundary del shell interno: captura errores de las vistas y del
 * layout de empresa manteniendo sidebar/topbar visibles. Ofrece reintento
 * (reset re-renderiza el segmento). Los strings vienen de app.shell.error
 * (el NextIntlClientProvider del layout /app envuelve este boundary).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("app.shell.error");

  useEffect(() => {
    // Observabilidad local; Sentry se conecta en Connect (init.md pendientes).
    console.error("[app-shell]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-12 py-80 text-center">
      <h2 className="font-serif text-heading-sm font-medium leading-heading-sm tracking-heading-sm text-ink">
        {t("title")}
      </h2>
      <p className="max-w-[420px] text-body-sm leading-body-sm tracking-body-sm text-metal">
        {t("text")}
      </p>
      <Button variant="secondary" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
