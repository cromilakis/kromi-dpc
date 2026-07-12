"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, cn } from "@/components/ui";
import { resumeDiagnosisCheckout } from "@/lib/actions/self-assessment";
import { RISK_LEVEL_LABELS, type Severity } from "@/lib/legal";
import type { PreliminaryPanorama } from "@/lib/self-assessment/panorama";
import type { PortalServiceState } from "@/lib/portal/service-state";

/**
 * Estados A ("pending") y B ("preparing") del portal del cliente (spec
 * company-accounts fase 2, tarea 9): reemplazan el dashboard mientras el
 * servicio no está listo (`portalServiceState() !== "ready"`, ver
 * app/portal/page.tsx). Estilo de la tabla de áreas/severidad tomado de
 * `components/self-assessment/diagnosis-result.tsx` (mismas clases, sin
 * importar su lógica — ese componente es del embudo público).
 */

const SEVERITY_TAG: Record<Severity, string> = {
  critico: "bg-danger-red/10 text-danger-red",
  alto: "bg-warning-yellow/10 text-warning-yellow",
  medio: "bg-ash text-carbon",
  bajo: "bg-ash text-metal",
};

export interface ServiceStatusProps {
  state: Exclude<PortalServiceState, "ready">;
  panorama: PreliminaryPanorama | null;
  /**
   * true cuando el cliente acaba de volver del Checkout de Stripe exitoso
   * (`/portal?paid=1`, ver app/portal/page.tsx). En la ventana de carrera del
   * webhook el estado sigue siendo "pending" (`service_paid_at` aún null): NO
   * se debe mostrar el aviso de "completa tu pago" ni el botón de re-pago acá,
   * porque un clic abriría una SEGUNDA Checkout Session → doble cobro.
   */
  justPaid?: boolean;
}

export function ServiceStatus({ state, panorama, justPaid = false }: ServiceStatusProps) {
  const t = useTranslations("portal.service");
  const tPaid = useTranslations("portal.paidNotice");
  const tLabel = useTranslations("diagnosis.severity.label");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  if (state === "pending" && justPaid) {
    return (
      <Card className="flex flex-col items-start gap-12">
        <p className="text-caption leading-caption tracking-caption text-carbon">
          {tPaid("title")}
        </p>
        <p className="max-w-[52ch] text-body-sm text-metal">{tPaid("description")}</p>
      </Card>
    );
  }

  if (state === "pending") {
    return (
      <Card className="flex flex-col items-start gap-12">
        <p className="text-caption leading-caption tracking-caption text-carbon">
          {t("pendingTitle")}
        </p>
        <p className="max-w-[52ch] text-body-sm text-metal">{t("pendingBody")}</p>
        <Button onClick={handlePay} disabled={isPending} className="self-start">
          {isPending ? t("paying") : t("payButton")}
        </Button>
        {error ? (
          <p role="alert" className="text-caption text-danger-red">
            {error}
          </p>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-16">
      <Card className="flex flex-col gap-12">
        <p className="text-caption leading-caption tracking-caption text-carbon">
          {t("preparingTitle")}
        </p>
        <p className="max-w-[52ch] text-body-sm text-metal">{t("preparingBody")}</p>
      </Card>

      {panorama ? (
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
      ) : null}
    </div>
  );
}
