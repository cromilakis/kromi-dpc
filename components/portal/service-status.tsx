"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, buttonClasses, Card, cn } from "@/components/ui";
import { resumeDiagnosisCheckout } from "@/lib/actions/self-assessment";
import { RISK_LEVEL_LABELS, type Severity } from "@/lib/legal";
import type { PreliminaryPanorama } from "@/lib/self-assessment/panorama";
import type { PortalServiceState } from "@/lib/portal/service-state";

/**
 * Estados A ("pending") y B ("preparing") del portal del cliente. Rediseño
 * 2026-07-21: el post-pago debe dar confianza inmediata (viene de pagar en
 * Stripe) — confirmación visible, qué sigue, y acceso directo al diagnóstico
 * y los documentos que YA están disponibles con el pago.
 */

const SEVERITY_TAG: Record<Severity, string> = {
  critico: "bg-danger-red/10 text-danger-red",
  alto: "bg-warning-yellow/10 text-warning-yellow",
  medio: "bg-ash text-carbon",
  bajo: "bg-ash text-metal",
};

/** Pasos del servicio que se muestran tras el pago ("qué sigue"). */
const NEXT_STEPS = ["review", "mitigation", "certification"] as const;

export interface ServiceStatusProps {
  state: Exclude<PortalServiceState, "ready">;
  panorama: PreliminaryPanorama | null;
  /**
   * true cuando el cliente acaba de volver del Checkout de Stripe exitoso
   * (`/portal?paid=1`). En la ventana de carrera del webhook el estado sigue
   * siendo "pending" (`service_paid_at` aún null): NO se debe mostrar el aviso
   * de "completa tu pago" ni el botón de re-pago acá, porque un clic abriría
   * una SEGUNDA Checkout Session → doble cobro.
   */
  justPaid?: boolean;
}

function CheckBadge() {
  return (
    <span
      aria-hidden
      className="flex size-[36px] shrink-0 items-center justify-center rounded-full bg-success-green text-white"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function PanoramaCard({ panorama }: { panorama: PreliminaryPanorama }) {
  const t = useTranslations("portal.service");
  const tLabel = useTranslations("diagnosis.severity.label");
  return (
    <Card className="flex flex-col gap-12">
      <p className="text-caption leading-caption tracking-caption text-carbon">
        {t("panoramaTitle")}
      </p>
      <div className="flex items-center gap-10">
        <span className="text-body-sm font-semibold text-ink">
          {RISK_LEVEL_LABELS[panorama.riskLevel]}
        </span>
      </div>
      <ul className="border-t border-stone">
        {panorama.areas.map((area) => (
          <li
            key={`${area.areaLabel}-${area.severity}`}
            className="flex items-center justify-between gap-16 border-b border-stone py-[14px]"
          >
            <span className="text-body font-medium leading-[1.35] text-ink">
              {area.areaLabel}
            </span>
            <div className="flex shrink-0 items-center gap-10">
              <span className="text-caption tabular-nums text-metal">{area.count}</span>
              <span
                className={cn(
                  "rounded-full px-8 py-[3px] text-caption font-semibold",
                  SEVERITY_TAG[area.severity],
                )}
              >
                {tLabel(area.severity)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ServiceStatus({ state, panorama, justPaid = false }: ServiceStatusProps) {
  const t = useTranslations("portal.service");
  const tPaid = useTranslations("portal.paidNotice");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Carrera del webhook: mientras el pago recién hecho no se refleje
  // (state sigue "pending"), la página se refresca sola cada pocos segundos —
  // el cliente no debe tener que adivinar que hay que recargar.
  const waitingWebhook = state === "pending" && justPaid;
  useEffect(() => {
    if (!waitingWebhook) return;
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [waitingWebhook, router]);

  function handlePay() {
    setError(null);
    startTransition(async () => {
      const result = await resumeDiagnosisCheckout();
      if (!result.ok) {
        setError(t(`payErrors.${result.error}`));
        return;
      }
      window.location.href = result.url;
    });
  }

  if (waitingWebhook) {
    return (
      <Card className="flex items-start gap-16">
        <CheckBadge />
        <div className="flex flex-col gap-8">
          <p className="text-body font-semibold text-ink">{tPaid("title")}</p>
          <p className="max-w-[52ch] text-body-sm leading-[1.55] text-carbon">
            {tPaid("description")}
          </p>
          <p className="flex items-center gap-8 text-caption text-metal">
            <span
              aria-hidden
              className="size-8 shrink-0 rounded-full bg-metal motion-safe:animate-dpc-blink"
            />
            {tPaid("refreshing")}
          </p>
        </div>
      </Card>
    );
  }

  if (state === "pending") {
    return (
      <div className="flex flex-col gap-16">
        <Card className="flex flex-col items-start gap-12">
          <p className="text-body font-semibold text-ink">{t("pendingTitle")}</p>
          <p className="max-w-[52ch] text-body-sm leading-[1.55] text-carbon">
            {t("pendingBody")}
          </p>
          <Button onClick={handlePay} disabled={isPending} className="self-start">
            {isPending ? t("paying") : t("payButton")}
          </Button>
          {error ? (
            <p role="alert" className="text-caption text-danger-red">
              {error}
            </p>
          ) : null}
        </Card>
        {panorama ? <PanoramaCard panorama={panorama} /> : null}
      </div>
    );
  }

  // Estado "preparing": pago confirmado. El diagnóstico y los documentos ya
  // están disponibles; el equipo prepara la revisión y la propuesta.
  return (
    <div className="flex flex-col gap-16">
      <Card className="flex items-start gap-16">
        <CheckBadge />
        <div className="flex flex-col gap-8">
          <p className="text-body font-semibold text-ink">{t("preparingTitle")}</p>
          <p className="max-w-[56ch] text-body-sm leading-[1.55] text-carbon">
            {t("preparingBody")}
          </p>
          <div className="mt-8 flex flex-wrap gap-10">
            <Link href="/portal/evaluaciones" className={buttonClasses("primary")}>
              {t("ctaEvaluations")}
            </Link>
            <Link href="/portal/documentos" className={buttonClasses("secondary")}>
              {t("ctaDocuments")}
            </Link>
          </div>
        </div>
      </Card>

      {/* Qué sigue: el servicio contratado, paso a paso. */}
      <Card className="flex flex-col gap-12">
        <p className="text-caption leading-caption tracking-caption text-carbon">
          {t("nextTitle")}
        </p>
        <ol className="flex flex-col">
          {NEXT_STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-12 border-b border-ash py-12 last:border-b-0"
            >
              <span
                aria-hidden
                className="flex size-[24px] shrink-0 items-center justify-center rounded-full bg-ash text-caption font-semibold text-carbon"
              >
                {index + 1}
              </span>
              <span>
                <span className="block text-body-sm font-semibold text-ink">
                  {t(`next.${step}.title`)}
                </span>
                <span className="mt-2 block max-w-[64ch] text-caption leading-[1.5] text-carbon">
                  {t(`next.${step}.text`)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {panorama ? <PanoramaCard panorama={panorama} /> : null}
    </div>
  );
}
