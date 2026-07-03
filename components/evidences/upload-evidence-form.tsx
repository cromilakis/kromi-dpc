"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Field, Select } from "@/components/ui";
import { uploadEvidence, type UploadEvidenceError } from "@/lib/actions/evidences";
import {
  EVIDENCE_ACCEPT_ATTRIBUTE,
  EVIDENCE_MAX_FILE_BYTES,
  isAllowedEvidenceMimeType,
} from "@/lib/evidences/constraints";

/**
 * Formulario de subida de evidencias (client) — prototipo §1.4.10
 * "+ Subir evidencia", aquí como card de formulario real (el upload no existe
 * en el prototipo; pendiente documentado en prototype-analysis.md §nota 6).
 * Pre-valida MIME/tamaño en cliente (feedback inmediato, mismas constantes
 * del bucket) y delega la validación AUTORITATIVA a la server action
 * uploadEvidence (sesión + Zod + tipo/tamaño). Estados: pending, error por
 * código, éxito con nombre del archivo.
 */

const MAX_MB = Math.round(EVIDENCE_MAX_FILE_BYTES / (1024 * 1024));

interface ControlOption {
  id: string;
  code: string;
  name: string;
}

export function UploadEvidenceForm({
  companyId,
  controls,
}: {
  companyId: string;
  controls: ControlOption[];
}) {
  const t = useTranslations("app.evidences.upload");
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<UploadEvidenceError | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setUploadedName(null);

    // Pre-validación en cliente (espejo del bucket): errores inmediatos sin
    // viajar 50 MB al servidor. La server action repite el chequeo.
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("file_missing");
      return;
    }
    if (file.size > EVIDENCE_MAX_FILE_BYTES) {
      setError("file_too_large");
      return;
    }
    if (!isAllowedEvidenceMimeType(file.type)) {
      setError("file_type");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await uploadEvidence(formData);
      if (result.ok) {
        setUploadedName(file.name);
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="mb-24">
      <h2 className="text-body-sm font-semibold text-ink">{t("title")}</h2>
      <p className="mt-4 text-caption leading-caption text-carbon">{t("hint")}</p>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mt-16 flex flex-wrap items-end gap-16"
        aria-busy={pending}
      >
        <input type="hidden" name="companyId" value={companyId} />

        <Field
          label={t("fileLabel")}
          htmlFor="evidence-file"
          hint={t("fileHint", { maxMb: MAX_MB })}
          className="min-w-[260px] flex-1"
        >
          <input
            id="evidence-file"
            name="file"
            type="file"
            required
            accept={EVIDENCE_ACCEPT_ATTRIBUTE}
            aria-describedby={error ? "evidence-upload-error" : "evidence-file-hint"}
            className="rounded-inputs border border-slate bg-white px-12 py-8 text-body-sm text-ink file:mr-12 file:rounded-buttons file:border file:border-slate file:bg-white file:px-12 file:py-4 file:text-[13px] file:font-medium file:text-ink"
          />
        </Field>

        <Field
          label={t("controlLabel")}
          htmlFor="evidence-control"
          className="min-w-[220px]"
        >
          <Select id="evidence-control" name="controlId" defaultValue="">
            <option value="">{t("controlNone")}</option>
            {controls.map((control) => (
              <option key={control.id} value={control.id}>
                {control.code} · {control.name}
              </option>
            ))}
          </Select>
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </form>

      {error ? (
        <p
          id="evidence-upload-error"
          role="alert"
          className="mt-12 rounded-cards border border-danger-red/15 bg-[#f6e9e8] px-12 py-[10px] text-[13px] leading-[1.5] text-danger-red"
        >
          {t(`errors.${error}`, { maxMb: MAX_MB })}
        </p>
      ) : null}
      {uploadedName ? (
        <p
          role="status"
          className="mt-12 rounded-cards border border-success-green/15 bg-[#e9f2ec] px-12 py-[10px] text-[13px] leading-[1.5] text-success-green"
        >
          {t("success", { name: uploadedName })}
        </p>
      ) : null}
    </Card>
  );
}
