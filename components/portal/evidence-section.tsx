"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type StatusBadgeVariant,
} from "@/components/ui";
import {
  EVIDENCE_ACCEPT_ATTRIBUTE,
} from "@/lib/evidences/constraints";
import {
  getEvidenceDownloadUrl,
  uploadEvidence,
  type DownloadResult,
  type UploadResult,
} from "@/lib/actions/portal-evidences";
import type { EvidenceSlot } from "@/lib/portal/load-evidences.server";

type UploadErrorCode = Exclude<UploadResult, { ok: true }>["error"];
type DownloadErrorCode = Exclude<DownloadResult, { ok: true }>["error"];

/**
 * Sección "Tus evidencias" del portal del cliente (spec company-portal-
 * phase3, tarea 2): un slot por (control aplicable, evidencia requerida).
 * Mismo patrón de client component que ProposalCard: useTransition +
 * `revalidatePath("/portal")` del server (dentro de `uploadEvidence`)
 * refresca la lista tras subir, sin necesidad de `router.refresh()` manual.
 *
 * Estado→badge: `validated`→positive, `partial`→warning, `rejected`→
 * negative, `missing` sin archivo→neutral ("Pendiente"), `missing` CON
 * archivo→active ("En revisión" — convención v1 del plan: fila con
 * storage_path y status 'missing' significa "enviada, falta que el
 * consultor la valide").
 */

type DisplayStatus = "validated" | "partial" | "rejected" | "in_review" | "pending";

const STATUS_VARIANT: Record<DisplayStatus, StatusBadgeVariant> = {
  validated: "positive",
  partial: "warning",
  rejected: "negative",
  in_review: "active",
  pending: "neutral",
};

function displayStatus(slot: EvidenceSlot): DisplayStatus {
  if (slot.status === "validated") return "validated";
  if (slot.status === "partial") return "partial";
  if (slot.status === "rejected") return "rejected";
  // status === "missing"
  return slot.hasFile ? "in_review" : "pending";
}

function EvidenceRow({ slot }: { slot: EvidenceSlot }) {
  const t = useTranslations("portal.evidences");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, startUpload] = useTransition();
  const [isDownloading, startDownload] = useTransition();
  const [uploadError, setUploadError] = useState<UploadErrorCode | null>(null);
  const [downloadError, setDownloadError] = useState<DownloadErrorCode | null>(null);

  const status = displayStatus(slot);
  const canUpload = !slot.hasFile || slot.status === "rejected";

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploadError(null);
    startUpload(async () => {
      const formData = new FormData();
      formData.set("controlId", slot.controlId);
      formData.set("evidenceName", slot.evidenceName);
      formData.set("file", file);
      const result = await uploadEvidence(formData);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      // ok → revalidatePath("/portal") del server refresca esta fila.
    });
  }

  function handleDownload() {
    if (!slot.evidenceId) return;
    setDownloadError(null);
    startDownload(async () => {
      const result = await getEvidenceDownloadUrl(slot.evidenceId!);
      if (!result.ok) {
        setDownloadError(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <TableRow>
      <TableCell>
        <p className="text-body-sm font-medium text-ink">{slot.controlCode}</p>
        <p className="text-caption leading-caption tracking-caption text-carbon">
          {slot.controlName}
        </p>
      </TableCell>
      <TableCell>{slot.evidenceName}</TableCell>
      <TableCell>
        <StatusBadge variant={STATUS_VARIANT[status]}>{t(`status.${status}`)}</StatusBadge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-8">
          {canUpload ? (
            <div className="flex flex-wrap items-center gap-8">
              <input
                ref={fileInputRef}
                type="file"
                accept={EVIDENCE_ACCEPT_ATTRIBUTE}
                aria-label={t("chooseFile")}
                className="cursor-pointer text-caption text-ink"
              />
              <Button onClick={handleUpload} disabled={isUploading} className="cursor-pointer">
                {isUploading ? t("uploading") : t("upload")}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              variant="secondary"
              className="cursor-pointer"
            >
              {isDownloading ? t("downloading") : t("download")}
            </Button>
          )}
          {uploadError ? (
            <p role="alert" className="text-caption text-danger-red">
              {t(`errors.${uploadError}`)}
            </p>
          ) : null}
          {downloadError ? (
            <p role="alert" className="text-caption text-danger-red">
              {t(`errors.${downloadError}`)}
            </p>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function EvidenceSection({ slots }: { slots: EvidenceSlot[] }) {
  const t = useTranslations("portal.evidences");

  return (
    <Card className="flex flex-col gap-16" padded={false}>
      <div className="flex flex-col gap-4 px-[18px] pt-16">
        <p className="text-body-sm font-medium text-ink">{t("title")}</p>
        <p className="text-caption leading-caption tracking-caption text-carbon">
          {t("subtitle")}
        </p>
      </div>

      {slots.length === 0 ? (
        <p className="px-[18px] pb-16 text-body-sm text-metal">{t("empty")}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("columns.control")}</TableHeaderCell>
              <TableHeaderCell>{t("columns.evidence")}</TableHeaderCell>
              <TableHeaderCell>{t("columns.status")}</TableHeaderCell>
              <TableHeaderCell>{t("columns.action")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {slots.map((slot) => (
              <EvidenceRow key={`${slot.controlId}::${slot.evidenceName}`} slot={slot} />
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
