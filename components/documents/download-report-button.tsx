"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

/**
 * Botón de descarga de documento PDF: hace fetch de la ruta, y si responde ok
 * dispara la descarga del blob; si no, traduce el error (`no_paid`, `not_found`,
 * `unauthorized`, `unavailable`). Nunca descarga un archivo roto.
 */

const KNOWN_ERRORS = ["no_paid", "not_found", "unauthorized", "unavailable"] as const;
type KnownError = (typeof KNOWN_ERRORS)[number];

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^"]+)"?/.exec(header);
  return match ? match[1]! : null;
}

export function DownloadReportButton({
  href,
  variant = "secondary",
}: {
  href: string;
  variant?: "primary" | "secondary";
}) {
  const t = useTranslations("common.downloadReport");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<KnownError | null>(null);

  async function onClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) {
        let key: KnownError = "unavailable";
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error && (KNOWN_ERRORS as readonly string[]).includes(body.error)) {
            key = body.error as KnownError;
          }
        } catch {
          // respuesta sin JSON: se queda en "unavailable".
        }
        setError(key);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        filenameFromDisposition(res.headers.get("Content-Disposition")) ??
        "informe-diagnostico.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Button variant={variant} onClick={onClick} disabled={loading}>
        {loading ? t("downloading") : t("label")}
      </Button>
      {error ? (
        <p role="alert" className="text-caption leading-caption text-danger-red">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}
