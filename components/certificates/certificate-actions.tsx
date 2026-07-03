"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import {
  issueCertificate,
  revalidateCertificate,
  revokeCertificate,
  type CertificateActionError,
} from "@/lib/actions/certificates";

/**
 * Acciones de certificación (client) — emisión, revalidación y revocación.
 * El flag `eligible` solo controla la UI (botón deshabilitado + nota); la
 * regla se RE-VERIFICA en las server actions. La revocación exige
 * confirmación explícita en dos pasos (mutación sensible e irreversible en
 * la práctica: la verificación pública deja de dar vigente).
 * Manejo de foco del alertdialog de revocación: al abrir, el foco pasa al
 * contenedor (tabIndex -1); Escape cancela; al cerrar sin revocar, el foco
 * vuelve al botón "Revocar" (que permanece en el DOM deshabilitado mientras
 * la confirmación está abierta, para no perder el punto de retorno).
 */

export function CertificateActions({
  companyId,
  activeCertificateId,
  eligible,
}: {
  companyId: string;
  /** id del certificado con status active, o null si no hay vigente. */
  activeCertificateId: string | null;
  eligible: boolean;
}) {
  const t = useTranslations("app.certification.actions");
  const [pending, startTransition] = useTransition();
  const [runningAction, setRunningAction] = useState<
    "issue" | "revalidate" | "revoke" | null
  >(null);
  const [error, setError] = useState<CertificateActionError | null>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const revokeTriggerRef = useRef<HTMLButtonElement>(null);
  const wasConfirmingRef = useRef(false);

  // Al abrir la confirmación el foco entra al diálogo; al cerrarla vuelve al
  // trigger (si la revocación tuvo éxito el trigger desaparece: no-op).
  useEffect(() => {
    if (confirmingRevoke) {
      dialogRef.current?.focus();
    } else if (wasConfirmingRef.current) {
      revokeTriggerRef.current?.focus();
    }
    wasConfirmingRef.current = confirmingRevoke;
  }, [confirmingRevoke]);

  function run(
    action: "issue" | "revalidate" | "revoke",
    task: () => Promise<{ ok: true } | { ok: false; error: CertificateActionError }>,
  ) {
    setError(null);
    setRunningAction(action);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error);
      setRunningAction(null);
      setConfirmingRevoke(false);
      // ok → revalidatePath del server refresca card, historial y botones.
    });
  }

  return (
    <div className="flex flex-col gap-12">
      {activeCertificateId === null ? (
        <>
          <Button
            onClick={() => run("issue", () => issueCertificate({ companyId }))}
            disabled={pending || !eligible}
            className="w-full"
          >
            {runningAction === "issue" ? t("issuing") : t("issue")}
          </Button>
          {!eligible ? (
            <p className="text-caption leading-caption text-carbon">
              {t("issueBlocked")}
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex flex-wrap gap-8">
          <Button
            variant="secondary"
            onClick={() =>
              run("revalidate", () =>
                revalidateCertificate({ certificateId: activeCertificateId }),
              )
            }
            disabled={pending}
          >
            {runningAction === "revalidate" ? t("revalidating") : t("revalidate")}
          </Button>
          {/* Permanece en el DOM (deshabilitado) mientras la confirmación
              está abierta: es el punto de retorno del foco al cancelar. */}
          <Button
            ref={revokeTriggerRef}
            variant="ghost"
            onClick={() => setConfirmingRevoke(true)}
            disabled={pending || confirmingRevoke}
            className="text-danger-red hover:text-danger-red"
          >
            {t("revoke")}
          </Button>
        </div>
      )}

      {confirmingRevoke && activeCertificateId ? (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="alertdialog"
          aria-labelledby="revoke-confirm-title"
          aria-describedby="revoke-confirm-text"
          onKeyDown={(event) => {
            if (event.key === "Escape" && !pending) {
              event.stopPropagation();
              setConfirmingRevoke(false);
            }
          }}
          className="rounded-cards border border-danger-red/25 bg-[#f6e9e8] p-16 outline-none focus-visible:ring-2 focus-visible:ring-danger-red/40"
        >
          <p
            id="revoke-confirm-title"
            className="text-[13px] font-semibold text-danger-red"
          >
            {t("revokeConfirmTitle")}
          </p>
          <p id="revoke-confirm-text" className="mt-4 text-[13px] leading-[1.5] text-ink">
            {t("revokeConfirmText")}
          </p>
          <div className="mt-12 flex gap-8">
            <Button
              onClick={() =>
                run("revoke", () =>
                  revokeCertificate({ certificateId: activeCertificateId }),
                )
              }
              disabled={pending}
              className="border-danger-red bg-danger-red hover:bg-danger-red/90"
            >
              {runningAction === "revoke" ? t("revoking") : t("revokeConfirm")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setConfirmingRevoke(false)}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-cards border border-danger-red/15 bg-[#f6e9e8] px-12 py-[10px] text-[13px] leading-[1.5] text-danger-red"
        >
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}
