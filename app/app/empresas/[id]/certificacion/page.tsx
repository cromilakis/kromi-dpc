import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { z } from "zod";
import { CertificateActions } from "@/components/certificates/certificate-actions";
import { PageHeader } from "@/components/app/shell";
import {
  buttonClasses,
  Card,
  ProgressBar,
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
  CRITICAL_DOMAIN_CODES,
  type EligibilityGap,
} from "@/lib/certificates/eligibility.server";
import { loadCompanyEligibility } from "@/lib/certificates/load-eligibility.server";
import { todayISODate } from "@/lib/certificates/issue.server";
import { createClient } from "@/lib/supabase/server";

/**
 * /app/empresas/[id]/certificacion — Certificación DPC (prototipo §1.4.11,
 * spec certificados, risk high). Server component: la elegibilidad se calcula
 * SERVER-SIDE (lib/certificates: umbral 80% + regla dura DPC-SEG/DPC-INC) y
 * solo alimenta la UI — las actions la re-verifican antes de mutar. Grid
 * 2 columnas: elegibilidad (resumen de controles + gaps "qué falta") y card
 * oscura del certificado vigente (código, emisión, vigencia, hash, link a
 * /verificar/[codigo]) + historial de emisiones.
 */

const companyIdSchema = z.uuid();

/**
 * date (YYYY-MM-DD) → fecha corta, en UTC (sin drift de TZ). Usa el formatter
 * de next-intl (locale global) en lugar de un Intl.DateTimeFormat hardcodeado.
 */
function formatDateWith(
  format: Awaited<ReturnType<typeof getFormatter>>,
  value: string,
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format.dateTime(date, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Estado de display de un certificado: la BD no auto-expira (status queda
 * 'active'), así que el vencimiento por fecha se deriva aquí igual que en la
 * verificación pública.
 */
function displayStatus(
  status: string,
  validUntil: string,
  today: string,
): { key: "active" | "expired" | "revoked"; variant: StatusBadgeVariant } {
  if (status === "revoked") return { key: "revoked", variant: "negative" };
  if (status === "expired" || validUntil < today) {
    return { key: "expired", variant: "warning" };
  }
  return { key: "active", variant: "positive" };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.certification.meta");
  return { title: t("title") };
}

export default async function CertificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!companyIdSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [t, format, companyResult, certificatesResult, eligibility] = await Promise.all([
    getTranslations("app.certification"),
    getFormatter(),
    supabase
      .from("companies")
      .select("id, name, sectors ( name )")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("certificates")
      .select("id, code, status, issued_at, valid_until, revalidated_at, sha256_hash")
      .eq("company_id", id)
      .order("issued_at", { ascending: false })
      .order("created_at", { ascending: false }),
    // loadCompanyEligibility lanza ante falla de lectura → error boundary.
    loadCompanyEligibility(supabase, id),
  ]);

  if (companyResult.error) {
    throw new Error(`No fue posible cargar la empresa: ${companyResult.error.message}`);
  }
  if (!companyResult.data) notFound();
  if (certificatesResult.error) {
    throw new Error(
      `No fue posible cargar los certificados: ${certificatesResult.error.message}`,
    );
  }

  const company = companyResult.data;
  const certificates = certificatesResult.data ?? [];
  const { assessment, result } = eligibility;

  const today = todayISODate();
  const activeCertificate =
    certificates.find((certificate) => certificate.status === "active") ?? null;
  const activeDisplay = activeCertificate
    ? displayStatus(activeCertificate.status, activeCertificate.valid_until, today)
    : null;

  const counters = [
    { key: "compliant", value: result.compliant, accent: "text-success-green" },
    { key: "partial", value: result.partial, accent: "text-warning-yellow" },
    { key: "nonCompliant", value: result.nonCompliant, accent: "text-danger-red" },
    { key: "pending", value: result.pending, accent: "text-metal" },
  ] as const;

  const gapText = (gap: EligibilityGap): string => {
    switch (gap.kind) {
      case "no_assessment":
        return t("eligibility.gaps.noAssessment");
      case "no_evaluated_controls":
        return t("eligibility.gaps.noEvaluatedControls");
      case "below_threshold":
        return t("eligibility.gaps.belowThreshold", {
          pct: gap.compliancePct,
          threshold: gap.thresholdPct,
          missing: gap.missingCompliantCount,
        });
      case "critical_non_compliant":
        return t("eligibility.gaps.criticalNonCompliant", {
          domain: gap.domainCode,
          controls: gap.controlCodes.join(", "),
        });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow", { company: company.name })}
        title={t("title")}
        description={t("description")}
      />

      <div className="grid grid-cols-2 items-start gap-16 max-lg:grid-cols-1">
        {/* Columna izquierda — elegibilidad calculada server-side. */}
        <Card>
          <div className="flex items-center justify-between gap-16">
            <h2 className="text-body-sm font-semibold text-ink">
              {t("eligibility.title")}
            </h2>
            {assessment ? (
              <StatusBadge variant="neutral">
                {t("eligibility.cycleLabel", { cycle: assessment.cycle })}
              </StatusBadge>
            ) : null}
          </div>

          <div className="mt-16 grid grid-cols-4 gap-8 max-sm:grid-cols-2">
            {counters.map((counter) => (
              <div
                key={counter.key}
                className="rounded-cards border border-ash bg-[#fbfbfc] px-12 py-8"
              >
                <p className={`text-[24px] font-semibold leading-[1.2] ${counter.accent}`}>
                  {counter.value}
                </p>
                <p className="mt-2 text-caption leading-caption text-carbon">
                  {t(`eligibility.counters.${counter.key}`)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16">
            <ProgressBar
              value={result.compliancePct}
              aria-label={t("eligibility.progressLabel")}
              fillClassName={result.eligible ? "bg-success-green" : "bg-ink"}
            />
            <p className="mt-8 text-[13px] text-carbon">
              {t("eligibility.summaryLine", {
                total: result.totalControls,
                pct: result.compliancePct,
              })}
            </p>
          </div>

          {/* Parámetros documentados de la regla (RFC §11; regla dura pendiente
              de validación del equipo). */}
          <div className="mt-16 border-t border-ash pt-12">
            <p className="text-caption leading-caption text-carbon">
              {t("eligibility.thresholdNote", { threshold: result.thresholdPct })}
            </p>
            <p className="mt-4 text-caption leading-caption text-carbon">
              {t("eligibility.hardRuleNote", {
                domains: CRITICAL_DOMAIN_CODES.join(" y "),
              })}
            </p>
          </div>

          {result.eligible ? (
            <div
              role="status"
              className="mt-16 rounded-cards border border-success-green/15 bg-[#e9f2ec] px-16 py-12"
            >
              <p className="text-[13px] font-semibold text-success-green">
                {t("eligibility.eligibleTitle")}
              </p>
              <p className="mt-2 text-[13px] leading-[1.5] text-ink">
                {t("eligibility.eligibleText")}
              </p>
            </div>
          ) : (
            <div className="mt-16 rounded-cards border border-danger-red/15 bg-[#f6e9e8] px-16 py-12">
              <p className="text-[13px] font-semibold text-danger-red">
                {t("eligibility.gapsTitle")}
              </p>
              <ul className="mt-8 flex flex-col gap-8">
                {result.gaps.map((gap, index) => (
                  <li key={index} className="flex items-start gap-8">
                    <span
                      aria-hidden="true"
                      className="mt-[6px] size-[7px] shrink-0 rounded-full bg-danger-red"
                    />
                    <span className="text-[13px] leading-[1.5] text-ink">
                      {gapText(gap)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Columna derecha — card oscura del certificado (prototipo §1.4.11). */}
        <div className="flex flex-col gap-16">
          <div className="rounded-xl bg-ink p-32 text-white max-sm:p-20">
            <div className="flex items-center justify-between gap-16">
              <span className="flex items-center gap-8">
                <span
                  aria-hidden="true"
                  className="flex size-[24px] items-center justify-center rounded-tags bg-white text-[13px] font-bold text-ink"
                >
                  D
                </span>
                <span className="text-[13px] font-semibold text-white">
                  {t("certificate.brand")}
                </span>
              </span>
              {activeCertificate && activeDisplay ? (
                <StatusBadge pill variant={activeDisplay.variant}>
                  {t(`statuses.${activeDisplay.key}`)}
                </StatusBadge>
              ) : (
                <StatusBadge pill variant="warning">
                  {t("certificate.pendingTitle")}
                </StatusBadge>
              )}
            </div>

            <p className="mt-28 text-caption leading-caption text-[#8f99a8]">
              {t("certificate.grantedTo")}
            </p>
            <p className="mt-4 font-serif text-[28px] font-medium leading-[1.2] tracking-[-0.4px] text-white">
              {company.name}
            </p>
            <p className="mt-4 text-[13px] text-[#b5bdc9]">
              {company.sectors?.name
                ? t("certificate.meta", { sector: company.sectors.name })
                : t("certificate.metaNoSector")}
            </p>

            {activeCertificate ? (
              <>
                <dl className="mt-24 grid grid-cols-2 gap-x-16 gap-y-16 border-t border-[#34353a] pt-16">
                  <div>
                    <dt className="text-caption leading-caption text-[#8f99a8]">
                      {t("certificate.codeLabel")}
                    </dt>
                    <dd className="mt-2 text-body-sm font-semibold text-white">
                      {activeCertificate.code}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption leading-caption text-[#8f99a8]">
                      {t("certificate.complianceLabel")}
                    </dt>
                    <dd className="mt-2 text-body-sm font-semibold text-white">
                      {result.compliancePct}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption leading-caption text-[#8f99a8]">
                      {t("certificate.issuedLabel")}
                    </dt>
                    <dd className="mt-2 text-body-sm font-semibold text-white">
                      {formatDateWith(format, activeCertificate.issued_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption leading-caption text-[#8f99a8]">
                      {t("certificate.validUntilLabel")}
                    </dt>
                    <dd className="mt-2 text-body-sm font-semibold text-white">
                      {formatDateWith(format, activeCertificate.valid_until)}
                    </dd>
                  </div>
                  {activeCertificate.revalidated_at ? (
                    <div className="col-span-2">
                      <dt className="text-caption leading-caption text-[#8f99a8]">
                        {t("certificate.revalidatedLabel")}
                      </dt>
                      <dd className="mt-2 text-body-sm font-semibold text-white">
                        {formatDateWith(format, activeCertificate.revalidated_at)}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <p className="mt-16 border-t border-[#34353a] pt-16 text-caption leading-caption text-[#8f99a8]">
                  {t("certificate.hashLabel")}
                </p>
                <p className="mt-4 break-all font-mono text-caption leading-caption text-[#d3d8df]">
                  {activeCertificate.sha256_hash}
                </p>

                <Link
                  href={`/verificar/${encodeURIComponent(activeCertificate.code)}`}
                  target="_blank"
                  className={buttonClasses("secondary", "mt-20 w-full")}
                >
                  {t("certificate.verify")} ↗
                </Link>
              </>
            ) : (
              <p className="mt-24 border-t border-[#34353a] pt-16 text-[13px] leading-[1.55] text-[#b5bdc9]">
                {t("certificate.pendingText")}
              </p>
            )}
          </div>

          <CertificateActions
            companyId={company.id}
            activeCertificateId={activeCertificate?.id ?? null}
            eligible={result.eligible}
          />
        </div>
      </div>

      {/* Historial de emisiones. */}
      <div className="mt-32">
        {certificates.length === 0 ? (
          <Card role="status" className="py-32 text-center">
            <p className="text-body-sm font-semibold text-ink">{t("history.title")}</p>
            <p className="mx-auto mt-4 max-w-[420px] text-body-sm text-metal">
              {t("history.empty")}
            </p>
          </Card>
        ) : (
          <Card padded={false}>
            <div className="flex items-baseline justify-between gap-16 border-b border-stone px-[18px] py-12">
              <h2 className="text-body-sm font-semibold text-ink">
                {t("history.title")}
              </h2>
              <p className="text-caption leading-caption text-carbon">
                {t("history.count", { count: certificates.length })}
              </p>
            </div>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("history.code")}</TableHeaderCell>
                  <TableHeaderCell>{t("history.status")}</TableHeaderCell>
                  <TableHeaderCell>{t("history.issued")}</TableHeaderCell>
                  <TableHeaderCell>{t("history.validUntil")}</TableHeaderCell>
                  <TableHeaderCell>{t("history.revalidated")}</TableHeaderCell>
                  <TableHeaderCell>{t("history.verify")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {certificates.map((certificate) => {
                  const rowDisplay = displayStatus(
                    certificate.status,
                    certificate.valid_until,
                    today,
                  );
                  return (
                    <TableRow key={certificate.id}>
                      <TableCell className="font-medium">{certificate.code}</TableCell>
                      <TableCell>
                        <StatusBadge variant={rowDisplay.variant}>
                          {t(`statuses.${rowDisplay.key}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>{formatDateWith(format, certificate.issued_at)}</TableCell>
                      <TableCell>{formatDateWith(format, certificate.valid_until)}</TableCell>
                      <TableCell>
                        {certificate.revalidated_at ? (
                          formatDateWith(format, certificate.revalidated_at)
                        ) : (
                          <span className="text-metal">{t("history.none")}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* #2f66c9: action-blue oscurecido para AA en texto
                            pequeño (mismo criterio que StatusBadge). */}
                        <Link
                          href={`/verificar/${encodeURIComponent(certificate.code)}`}
                          target="_blank"
                          aria-label={t("history.verifyAria", {
                            code: certificate.code,
                          })}
                          className="text-[13px] font-medium text-[#2f66c9] hover:underline"
                        >
                          {t("history.verify")} ↗
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
