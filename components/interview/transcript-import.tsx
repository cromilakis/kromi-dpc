"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Textarea } from "@/components/ui";
import { extractDiagnosisFromTranscript } from "@/lib/actions/interview";
import type { ExtractionResult } from "@/lib/llm/extract-diagnosis";

/**
 * Panel CONTROLADO para importar una transcripción y disparar la extracción del
 * LLM. El disparador es un icono en la barra de acciones del DiagnosisManager;
 * este componente se monta SOLO cuando está abierto y se cierra vía `onClose`
 * (al cancelar o tras una extracción exitosa). Entrega la extracción validada
 * por `onExtracted`; la revisión/fusión la hace `ExtractionReview`.
 */

type TranscriptImportError = "llm_disabled" | "llm_failed" | "generic";

export function TranscriptImport({
  sessionId,
  onExtracted,
  onClose,
}: {
  sessionId: string;
  onExtracted: (result: ExtractionResult) => void;
  onClose: () => void;
}) {
  const t = useTranslations("app.diagnosis.transcript");

  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<TranscriptImportError | null>(null);

  function handleAnalyze() {
    if (!text.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await extractDiagnosisFromTranscript(sessionId, text);
      if (result.ok) {
        onExtracted(result.extraction);
        onClose();
      } else {
        setError(
          result.error === "llm_disabled" || result.error === "llm_failed"
            ? result.error
            : "generic",
        );
      }
    });
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
        <Button variant="ghost" onClick={onClose} disabled={pending}>
          {t("cancel")}
        </Button>
      </div>
    </Card>
  );
}
