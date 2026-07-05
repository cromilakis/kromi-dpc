import { getTranslations } from "next-intl/server";
import { Card, ProgressBar, StatusBadge, type StatusBadgeVariant } from "@/components/ui";
import { ProposalCard } from "@/components/portal/proposal-card";
import { EvidenceSection } from "@/components/portal/evidence-section";
import { RecertCard } from "@/components/portal/recert-card";
import { progressFillClass } from "@/lib/companies/display";
import { certificateStanding, type CertStanding } from "@/lib/portal/certificate-status";
import { loadClientDashboard } from "@/lib/portal/load-dashboard.server";
import { loadClientEvidences } from "@/lib/portal/load-evidences.server";

/**
 * /portal — dashboard de cumplimiento de solo lectura del cliente (spec
 * company-accounts fase 1, tarea 2). Reemplaza el placeholder de la fase 0:
 * carga `loadClientDashboard()` (RLS del cliente) y deriva el estado del
 * certificado con `certificateStanding()`. Sin datos internos: solo lo que
 * el loader ya expone (company_client_view / certificates / assessment
 * controls, todo acotado por `current_company_id()`).
 */

const STANDING_VARIANT: Record<CertStanding, StatusBadgeVariant> = {
  vigente: "positive",
  por_vencer: "warning",
  vencida: "negative",
  revocada: "negative",
  sin_certificado: "neutral",
};

function formatDate(value: string): string {
  // Las fechas del loader vienen como 'YYYY-MM-DD'; se anclan a mediodía UTC
  // para evitar corrimientos de día por zona horaria al formatear.
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string | string[] }>;
}) {
  const [{ company, cert, progress, proposal }, evidenceSlots, t, tHome, tPaid, params] =
    await Promise.all([
      loadClientDashboard(),
      loadClientEvidences(),
      getTranslations("portal.dashboard"),
      getTranslations("portal.home"),
      getTranslations("portal.paidNotice"),
      searchParams,
    ]);
  // El estado real de pago lo fija el webhook (fuente de verdad, tarea 5),
  // NUNCA este query param del redirect de retorno (manipulable por el
  // cliente): acá solo se usa para mostrar un aviso transitorio.
  const showPaidNotice = params.paid === "1";

  const today = new Date().toISOString().slice(0, 10);
  const standing = certificateStanding(cert, today);

  return (
    <div>
      <p className="mb-8 text-caption font-semibold uppercase tracking-[0.4px] text-carbon">
        {tHome("eyebrow")}
      </p>
      <h1 className="mb-24 font-serif text-heading-sm font-medium leading-heading-sm tracking-heading-sm text-ink">
        {tHome("title", { company: company?.name ?? "" })}
      </h1>

      {showPaidNotice ? (
        <div className="mb-16 rounded-lg border border-stone bg-ash p-16">
          <p className="text-body-sm font-medium text-ink">{tPaid("title")}</p>
          <p className="mt-4 text-caption leading-caption tracking-caption text-carbon">
            {tPaid("description")}
          </p>
        </div>
      ) : null}

      <div className="grid gap-16 sm:grid-cols-2">
        <Card className="flex flex-col gap-12">
          <p className="text-caption leading-caption tracking-caption text-carbon">
            {t("certificate.title")}
          </p>
          <div>
            <StatusBadge variant={STANDING_VARIANT[standing]}>
              {t(`certificate.standing.${standing}`)}
            </StatusBadge>
          </div>
          {cert ? (
            <div className="flex flex-col gap-4 text-body-sm text-metal">
              <p>{t("certificate.issuedAt", { date: formatDate(cert.issued_at) })}</p>
              <p>{t("certificate.validUntil", { date: formatDate(cert.valid_until) })}</p>
              <p>
                {t("certificate.code")}: <span className="text-ink">{cert.code}</span>
              </p>
              <a
                href={`/verify/${cert.code}`}
                target="_blank"
                rel="noreferrer"
                className="mt-8 cursor-pointer text-body-sm font-medium text-action-blue hover:underline"
              >
                {t("certificate.verifyOnline")}
              </a>
            </div>
          ) : (
            <p className="text-body-sm text-metal">{t("certificate.empty")}</p>
          )}
        </Card>

        <Card className="flex flex-col gap-12">
          <p className="text-caption leading-caption tracking-caption text-carbon">
            {t("progress.title")}
          </p>
          <p className="text-[26px] font-semibold leading-[1.15] tracking-[-0.8px] text-ink">
            {progress.pct}%
          </p>
          <ProgressBar
            value={progress.pct}
            aria-label={t("progress.title")}
            fillClassName={progressFillClass(progress.pct)}
          />
          <p className="text-caption leading-caption tracking-caption text-carbon">
            {t("progress.summary", { evaluated: progress.evaluated, total: progress.total })}
          </p>
          <p className="text-caption leading-caption tracking-caption text-carbon">
            {t("progress.note")}
          </p>
        </Card>
      </div>

      <RecertCard standing={standing} />

      {proposal ? (
        <div className="mt-16 grid gap-16 sm:grid-cols-2">
          <ProposalCard proposal={proposal} />
        </div>
      ) : null}

      <div className="mt-16">
        <EvidenceSection slots={evidenceSlots} />
      </div>
    </div>
  );
}
