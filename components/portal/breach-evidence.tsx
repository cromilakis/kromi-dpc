"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { uploadBreachEvidence } from "@/lib/actions/portal-breach-evidences";
import { getEvidenceDownloadUrl } from "@/lib/actions/portal-evidences";

/**
 * Evidencias de mitigación de una brecha (sub-proyecto #7): lista de lo ya
 * subido (con estado de revisión del consultor) + subida de nuevos respaldos.
 * La descarga reutiliza getEvidenceDownloadUrl (URL firmada 60s).
 */

export interface BreachEvidenceItem {
  id: string;
  name: string;
  status: string;
  version: number;
}

export function BreachEvidence({
  breachId,
  evidences,
}: {
  breachId: string;
  evidences: BreachEvidenceItem[];
}) {
  const t = useTranslations("portal.evaluations.evidence");
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("breachId", breachId);
    startTransition(async () => {
      const result = await uploadBreachEvidence(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  async function onDownload(evidenceId: string) {
    const result = await getEvidenceDownloadUrl(evidenceId);
    if (result.ok) window.open(result.url, "_blank", "noopener");
  }

  return (
    <div className="flex flex-col gap-12">
      <p className="text-body-sm font-semibold text-ink">{t("title")}</p>
      <p className="max-w-[60ch] text-caption leading-[1.5] text-carbon">
        {t("hint")}
      </p>

      {evidences.length > 0 ? (
        <ul className="flex flex-col gap-8">
          {evidences.map((evidence) => (
            <li
              key={evidence.id}
              className="flex flex-wrap items-center justify-between gap-12 rounded-cards border border-stone bg-white px-12 py-8"
            >
              <span className="min-w-0">
                <span className="block truncate text-body-sm font-medium text-ink">
                  {evidence.name}
                </span>
                <span className="text-caption text-carbon">
                  {t(`statuses.${evidence.status}`)} · v{evidence.version}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onDownload(evidence.id)}
                className="text-[13px] font-medium text-[#2f66c9] hover:underline"
              >
                {t("download")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-metal">{t("empty")}</p>
      )}

      <form ref={formRef} action={onSubmit} className="flex flex-col gap-8">
        <label className="text-caption font-semibold text-carbon" htmlFor="evidence-name">
          {t("nameLabel")}
        </label>
        <input
          id="evidence-name"
          name="evidenceName"
          required
          maxLength={200}
          placeholder={t("namePlaceholder")}
          className="w-full max-w-[420px] rounded-inputs border border-slate px-10 py-[7px] text-body-sm text-ink placeholder:text-metal"
        />
        <label className="text-caption font-semibold text-carbon" htmlFor="evidence-file">
          {t("fileLabel")}
        </label>
        <input
          id="evidence-file"
          name="file"
          type="file"
          required
          className="max-w-[420px] text-body-sm text-carbon"
        />
        <div>
          <Button variant="secondary" type="submit" disabled={pending}>
            {pending ? t("uploading") : t("upload")}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-caption leading-caption text-danger-red">
            {t(`errors.${error}`)}
          </p>
        ) : null}
      </form>
    </div>
  );
}
