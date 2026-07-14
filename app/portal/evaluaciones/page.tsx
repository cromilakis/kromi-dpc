import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DownloadReportButton } from "@/components/documents/download-report-button";
import { buttonClasses, Card, cn } from "@/components/ui";
import { formatFineClp } from "@/lib/legal/fine";
import { loadClientDiagnosis } from "@/lib/portal/load-diagnosis.server";
import { severityTagClass } from "@/lib/portal/severity-tag";

/**
 * /portal/evaluaciones — lista de brechas del diagnóstico activo del cliente
 * (spec portal de detalle de brechas, tarea 5). Gated a pagado: sin
 * `service_paid_at` no se consulta ni muestra ninguna brecha (estado
 * bloqueado con enlace a /portal, donde vive el botón real de re-pago —
 * `ServiceStatus`/`resumeDiagnosisCheckout`). Server component: usa
 * `loadClientDiagnosis()` (RLS acota a la empresa del cliente), ya ordenada
 * por severidad y área.
 */
export default async function EvaluationsPage() {
  const [{ paid, breaches }, t, tLabel] = await Promise.all([
    loadClientDiagnosis(),
    getTranslations("portal.evaluations"),
    getTranslations("diagnosis.severity.label"),
  ]);

  return (
    <div>
      <h1 className="mb-8 font-serif text-heading-sm font-medium leading-heading-sm tracking-heading-sm text-ink">
        {t("title")}
      </h1>
      <p className="mb-24 max-w-[60ch] text-body-sm text-metal">
        {t("description")}
      </p>

      {!paid ? (
        <Card className="flex flex-col items-start gap-12">
          <h2 className="text-body-sm font-semibold text-ink">
            {t("locked.title")}
          </h2>
          <p className="max-w-[52ch] text-body-sm text-metal">
            {t("locked.body")}
          </p>
          <Link href="/portal" className={buttonClasses("secondary")}>
            {t("locked.payCta")}
          </Link>
        </Card>
      ) : breaches.length === 0 ? (
        <Card>
          <p className="text-body-sm text-metal">{t("empty")}</p>
        </Card>
      ) : (
        <>
          <div className="mb-16 flex justify-end">
            <DownloadReportButton href="/portal/evaluaciones/informe" />
          </div>
          <ul className="flex flex-col gap-12">
            {breaches.map((breach) => {
              const fine = formatFineClp(breach.fineMinUtm, breach.fineMaxUtm);
              return (
                <li key={breach.id}>
                  <Link href={`/portal/evaluaciones/${breach.id}`} className="block">
                    <Card className="flex items-center justify-between gap-16 transition-colors hover:bg-ash/40">
                      <span className="flex min-w-0 flex-1 flex-col gap-4">
                        <span className="text-caption font-semibold uppercase tracking-[0.4px] text-carbon">
                          {t("findingLabel")}
                        </span>
                        <span className="text-body font-medium leading-[1.35] text-ink">
                          {breach.areaLabel}
                        </span>
                        {fine ? (
                          <span className="text-caption text-metal">
                            {t("fineLabel")}: {fine}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-10">
                        <span
                          className={cn(
                            "rounded-full px-8 py-[3px] text-caption font-semibold",
                            severityTagClass(breach.severity),
                          )}
                        >
                          {tLabel(breach.severity)}
                        </span>
                        <span aria-hidden="true" className="text-metal">
                          ›
                        </span>
                      </span>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
