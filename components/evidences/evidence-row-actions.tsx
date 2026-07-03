"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Select } from "@/components/ui";
import {
  getEvidenceDownloadUrl,
  setEvidenceStatus,
  type DownloadUrlResult,
  type SetEvidenceStatusResult,
} from "@/lib/actions/evidences";

/**
 * Acciones por fila del repositorio (client): descarga por URL firmada de
 * 60 s (server action — nunca URL pública) y cambio del estado de validación
 * (validated/partial/rejected) vía setEvidenceStatus (audit_log old→new en
 * servidor). `missing` no es asignable: significa "sin documento" y solo
 * puede venir del seed/estado inicial.
 */

const SETTABLE_STATUSES = ["validated", "partial", "rejected"] as const;

type DownloadError = Extract<DownloadUrlResult, { ok: false }>["error"];
type ReviewError = Extract<SetEvidenceStatusResult, { ok: false }>["error"];

export function EvidenceRowActions({
  evidenceId,
  name,
  status,
  hasFile,
}: {
  evidenceId: string;
  name: string;
  status: string;
  hasFile: boolean;
}) {
  const t = useTranslations("app.evidences");
  const [downloading, startDownload] = useTransition();
  const [reviewing, startReview] = useTransition();
  const [downloadError, setDownloadError] = useState<DownloadError | null>(null);
  const [reviewError, setReviewError] = useState<ReviewError | null>(null);

  function handleDownload() {
    setDownloadError(null);
    startDownload(async () => {
      const result = await getEvidenceDownloadUrl({ evidenceId });
      if (result.ok) {
        // URL firmada de 60 s con content-disposition de descarga.
        window.location.assign(result.url);
      } else {
        setDownloadError(result.error);
      }
    });
  }

  function handleStatusChange(next: string) {
    if (next === status) return;
    setReviewError(null);
    startReview(async () => {
      const result = await setEvidenceStatus({ evidenceId, status: next });
      if (!result.ok) setReviewError(result.error);
      // ok → revalidatePath del server refresca la fila (badge y select).
    });
  }

  const isSettable = (SETTABLE_STATUSES as readonly string[]).includes(status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-8">
        {hasFile ? (
          <Button
            variant="secondary"
            onClick={handleDownload}
            disabled={downloading}
            aria-label={t("download.actionAria", { name })}
            className="px-8 py-4 text-[13px]"
          >
            {downloading ? t("download.preparing") : t("download.action")}
          </Button>
        ) : (
          <span
            className="text-caption leading-caption text-carbon"
            title={t("download.noFileTitle")}
          >
            {t("table.none")}
          </span>
        )}

        <Select
          value={isSettable ? status : ""}
          onChange={(event) => handleStatusChange(event.target.value)}
          disabled={reviewing}
          aria-label={t("review.selectAria", { name })}
          className="w-auto min-w-[140px] py-4 text-[13px]"
        >
          {!isSettable ? (
            <option value="" disabled>
              {t("review.keepCurrent", { status: t(`statuses.${status}`) })}
            </option>
          ) : null}
          {SETTABLE_STATUSES.map((option) => (
            <option key={option} value={option}>
              {t(`statuses.${option}`)}
            </option>
          ))}
        </Select>
      </div>

      {downloadError ? (
        <p role="alert" className="text-caption leading-caption text-danger-red">
          {t(`download.errors.${downloadError}`)}
        </p>
      ) : null}
      {reviewError ? (
        <p role="alert" className="text-caption leading-caption text-danger-red">
          {t(`review.errors.${reviewError}`)}
        </p>
      ) : null}
    </div>
  );
}
