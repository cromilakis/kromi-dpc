"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Textarea } from "@/components/ui";
import { extractDiagnosisFromTranscript } from "@/lib/actions/interview";
import type { ExtractionResult } from "@/lib/llm/extract-diagnosis";

/**
 * Botón + panel para importar una transcripción de reunión y disparar la
 * extracción del LLM (Tarea 5 del plan de autocompletado). Este componente
 * SOLO obtiene la extracción validada y la entrega vía `onExtracted` — la
 * revisión/fusión al borrador (aceptar/editar/descartar cada sugerencia) es
 * responsabilidad de `ExtractionReview` (Tarea 6), no de esta pieza.
 */

type TranscriptImportError = "llm_disabled" | "llm_failed" | "generic";

export function TranscriptImport({
  sessionId,
  onExtracted,
  disabled,
}: {
  sessionId: string;
  onExtracted: (result: ExtractionResult) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("app.diagnosis.transcript");

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<TranscriptImportError | null>(null);

  function openPanel() {
    setOpen(true);
    setError(null);
  }

  function closeAndReset() {
    setOpen(false);
    setText("");
    setError(null);
  }

  function handleAnalyze() {
    if (!text.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await extractDiagnosisFromTranscript(sessionId, text);
      if (result.ok) {
        onExtracted(result.extraction);
        closeAndReset();
      } else {
        setError(
          result.error === "llm_disabled" || result.error === "llm_failed"
            ? result.error
            : "generic",
        );
      }
    });
  }

  if (!open) {
    return (
      <div>
        <Button variant="secondary" onClick={openPanel} disabled={disabled}>
          {t("button")}
        </Button>
        {disabled ? (
          <p className="mt-4 text-caption leading-caption text-carbon">
            {t("buttonUnavailable")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="flex flex-col gap-12">
      <h2 className="text-body-sm font-semibold text-ink">{t("panelTitle")}</h2>
      <p className="text-caption leading-caption text-carbon">{t("privacyNote")}</p>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t("placeholder")}
        disabled={pending}
        className="min-h-[160px]"
      />
      {error ? (
        <p role="alert" className="text-caption leading-caption text-danger-red">
          {t(`errors.${error}`)}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-8">
        <Button onClick={handleAnalyze} disabled={pending || !text.trim()}>
          {pending ? t("analyzing") : t("analyze")}
        </Button>
        <Button variant="ghost" onClick={closeAndReset} disabled={pending}>
          {t("cancel")}
        </Button>
      </div>
    </Card>
  );
}
