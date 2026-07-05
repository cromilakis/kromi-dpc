"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card } from "@/components/ui";
import { requestRecertification, type RequestRecertResult } from "@/lib/actions/recert";
import { RECERT_CONSENT_VERSION } from "@/lib/recert/gate";
import type { CertStanding } from "@/lib/portal/certificate-status";

/**
 * Tarjeta "Solicita tu re-certificación" del portal del cliente (spec
 * recert-phase4, tarea 3): visible solo cuando el certificado está
 * `por_vencer`/`vencida` (standing calculado por la page con
 * `certificateStanding()`, mismo criterio que la tarjeta de estado). El
 * cliente debe marcar el checkbox de consentimiento (texto placeholder legal,
 * ver `lib/recert/gate.ts`) antes de poder pulsar "Iniciar re-certificación";
 * el botón llama a `requestRecertification(RECERT_CONSENT_VERSION)` (server
 * action gateada, Fase 4 tarea 2). El resultado (`gate` o error) se muestra
 * en línea y reemplaza el formulario; nunca se expone el tramo/score.
 */

type RecertOutcome = Extract<RequestRecertResult, { ok: true }>["gate"] | null;

export function RecertCard({ standing }: { standing: CertStanding }) {
  const t = useTranslations("portal.recert");
  const router = useRouter();
  const [consentChecked, setConsentChecked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<Extract<RequestRecertResult, { ok: false }>["error"] | null>(
    null,
  );
  const [gate, setGate] = useState<RecertOutcome>(null);

  if (standing !== "por_vencer" && standing !== "vencida") return null;

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await requestRecertification(RECERT_CONSENT_VERSION);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGate(result.gate);
      router.refresh();
    });
  }

  return (
    <Card className="mt-16 flex flex-col gap-12">
      <p className="text-caption leading-caption tracking-caption text-carbon">{t("title")}</p>
      <p className="text-body-sm text-metal">{t("explain")}</p>

      {gate ? (
        <p className="text-body-sm font-medium text-ink">{t(`result.${gate}`)}</p>
      ) : (
        <div className="flex flex-col gap-12">
          <p className="text-body-sm text-metal">{t("consentText")}</p>

          <label className="flex items-center gap-8 text-body-sm text-ink">
            <input
              type="checkbox"
              className="h-16 w-16 shrink-0 cursor-pointer rounded-[4px] border-slate accent-ink"
              checked={consentChecked}
              onChange={(event) => setConsentChecked(event.target.checked)}
            />
            {t("consentCheckbox")}
          </label>

          <Button
            onClick={handleStart}
            disabled={!consentChecked || isPending}
            className="cursor-pointer self-start"
          >
            {isPending ? t("starting") : t("startButton")}
          </Button>

          {error ? (
            <p role="alert" className="text-caption text-danger-red">
              {t(`errors.${error}`)}
            </p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
