import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { z } from "zod";
import { CompanyMemberInviteForm } from "@/components/companies/company-member-invite-form";
import { PhaseForm } from "@/components/companies/phase-form";
import { ProposalForm } from "@/components/companies/proposal-form";
import { PageHeader } from "@/components/app/shell";
import { DownloadReportButton } from "@/components/documents/download-report-button";
import { Card, ProgressBar, StatusBadge, type StatusBadgeVariant } from "@/components/ui";
import { checklistProgress, PHASE_BADGE_VARIANT, progressFillClass } from "@/lib/companies/display";
import { scoreTierOf, type ScoreTier } from "@/lib/companies/scoring.server";
import { riskSeverity, severityBadgeVariant } from "@/lib/risks/severity";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

/**
 * /app/companies/[id] — Resumen de empresa (prototipo §1.4.4 isResumen):
 * ficha (datos, rubro, tramo, contacto), Complexity Score interno (SOLO acá
 * y en la plataforma — herramienta del equipo, RFC §11/§14.3), métricas del
 * checklist del ciclo vigente (dona + porcentajes por estado), riesgos
 * principales, últimos movimientos (audit_log — SELECT solo admin por RLS;
 * consultores ven el estado vacío) y cambio de fase (server action + audit).
 */

const companyIdSchema = z.uuid();

type ControlStatus = Database["public"]["Enums"]["control_result"];

/** Orden y color (tokens semánticos del prototipo §3.5) de la dona. */
const DONUT_SEGMENTS: { status: ControlStatus; color: string }[] = [
  { status: "compliant", color: "#075a39" },
  { status: "partial", color: "#705500" },
  { status: "non_compliant", color: "#772322" },
  { status: "pending", color: "#d3d8df" },
];

/** Tinte de las mini-cards por estado (prototipo §1.4.11 "Resumen de controles"). */
const STATUS_CARD_CLASSES: Record<ControlStatus, string> = {
  compliant: "border-[#e9f2ec] bg-[#f6faf7] text-success-green",
  partial: "border-[#f6f0df] bg-[#fbf8ef] text-warning-yellow",
  non_compliant: "border-[#f6e9e8] bg-[#fbf3f2] text-danger-red",
  pending: "border-stone bg-[#fbfbfc] text-carbon",
  not_applicable: "border-stone bg-[#fbfbfc] text-carbon",
};

/** Tramo del score → variante semántica (tierColor del prototipo §3.5). */
const SCORE_TIER_VARIANT: Record<ScoreTier, StatusBadgeVariant> = {
  low: "positive",
  medium: "active",
  high: "warning",
  critical: "negative",
};

/** audit_log.action → clave i18n conocida (fallback: código crudo). */
const AUDIT_ACTION_KEYS: Record<string, string> = {
  "company.created": "companyCreated",
  "company.updated": "companyUpdated",
  "company.phase_changed": "phaseChanged",
  "control.status_changed": "controlStatusChanged",
  "control.notes_updated": "controlNotesUpdated",
  "evidence.uploaded": "evidenceUploaded",
  "evidence.status_changed": "evidenceStatusChanged",
  "risk.assigned": "riskAssigned",
  "risk.updated": "riskUpdated",
  "risk.removed": "riskRemoved",
  "remediation.item_added": "remediationItemAdded",
  "remediation.status_changed": "remediationStatusChanged",
  "certificate.issued": "certificateIssued",
  "certificate.revalidated": "certificateRevalidated",
  "certificate.revoked": "certificateRevoked",
  "certificate.updated": "certificateUpdated",
};

/** Dona SVG server-rendered (sin JS): un arco por estado del checklist. */
function StatusDonut({
  counts,
  centerPct,
  centerLabel,
  ariaLabel,
}: {
  counts: Record<ControlStatus, number>;
  centerPct: number;
  centerLabel: string;
  ariaLabel: string;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const total = DONUT_SEGMENTS.reduce(
    (sum, segment) => sum + counts[segment.status],
    0,
  );
  // Fracción y offset acumulado de cada arco (sin reasignaciones en render).
  const arcs = DONUT_SEGMENTS.map((segment, index) => {
    const fractionOf = (status: ControlStatus) =>
      total > 0 ? counts[status] / total : 0;
    return {
      ...segment,
      fraction: fractionOf(segment.status),
      offset: DONUT_SEGMENTS.slice(0, index).reduce(
        (sum, previous) => sum + fractionOf(previous.status),
        0,
      ),
    };
  });

  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={ariaLabel}
      className="h-[132px] w-[132px] shrink-0"
    >
      <circle cx={60} cy={60} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={14} />
      {arcs
        .filter((arc) => arc.fraction > 0)
        .map((arc) => (
          <circle
            key={arc.status}
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={14}
            strokeDasharray={`${arc.fraction * circumference} ${circumference}`}
            strokeDashoffset={-arc.offset * circumference}
            transform="rotate(-90 60 60)"
          />
        ))}
      <text
        x={60}
        y={58}
        textAnchor="middle"
        className="fill-ink font-sans text-[22px] font-semibold"
      >
        {centerPct}%
      </text>
      <text
        x={60}
        y={76}
        textAnchor="middle"
        className="fill-carbon font-sans text-[10px] font-medium"
      >
        {centerLabel}
      </text>
    </svg>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.companies.meta");
  return { title: t("detailTitle") };
}

export default async function CompanySummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!companyIdSchema.safeParse(id).success) notFound();

  const [t, tShell, format] = await Promise.all([
    getTranslations("app.companies"),
    getTranslations("app.shell"),
    getFormatter(),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [companyResult, assessmentResult, risksResult, auditResult, profileResult] =
    await Promise.all([
      supabase
        .from("companies")
        .select(
          "id, name, rut, phase, complexity_score, size_tier, employees_count, notes, contact, created_at, sectors ( name, laws )",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("assessments")
        .select("id, cycle, status, origin, assessment_controls ( status )")
        .eq("company_id", id)
        .order("cycle", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("company_risks")
        .select("id, impact, probability, risk_catalog ( code, description )")
        .eq("company_id", id),
      // audit_log: SELECT solo admin (RLS) → para consultores llega vacío.
      supabase
        .from("audit_log")
        .select("id, action, created_at")
        .or(`entity_id.eq.${id},detail->>company_id.eq.${id}`)
        .order("created_at", { ascending: false })
        .limit(6),
      // Rol del usuario en sesión (solo el consultor ve "Invitar acceso del
      // cliente" — la RLS de company_members ya lo exige para el INSERT,
      // esto es solo para no ofrecer un botón que fallaría en el servidor).
      user
        ? supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (companyResult.error) {
    throw new Error(
      `No fue posible cargar la empresa: ${companyResult.error.message}`,
    );
  }
  const company = companyResult.data;
  if (!company) notFound();

  if (assessmentResult.error) {
    throw new Error(
      `No fue posible cargar la evaluación: ${assessmentResult.error.message}`,
    );
  }
  if (risksResult.error) {
    throw new Error(
      `No fue posible cargar los riesgos: ${risksResult.error.message}`,
    );
  }
  if (auditResult.error) {
    throw new Error(
      `No fue posible cargar la bitácora: ${auditResult.error.message}`,
    );
  }

  const isConsultant =
    profileResult.data?.role === "consultant" || profileResult.data?.role === "admin";

  const assessment = assessmentResult.data;
  // Los controles "No aplica" (fuera de alcance por aplicabilidad) se excluyen
  // del avance y del conteo: el progreso se mide sobre lo aplicable.
  const statuses = (assessment?.assessment_controls ?? [])
    .map((control) => control.status)
    .filter((status) => status !== "not_applicable");
  const progress = checklistProgress(statuses);
  const counts: Record<ControlStatus, number> = {
    pending: 0,
    compliant: 0,
    partial: 0,
    non_compliant: 0,
    not_applicable: 0,
  };
  for (const status of statuses) counts[status] += 1;
  const compliantPct =
    progress.total > 0
      ? Math.round((counts.compliant / progress.total) * 100)
      : 0;

  // Riesgos ordenados por severidad (impacto × probabilidad) descendente.
  const topRisks = [...(risksResult.data ?? [])]
    .sort((a, b) => b.impact * b.probability - a.impact * a.probability)
    .slice(0, 5);
  const risksCount = (risksResult.data ?? []).length;

  const auditEntries = auditResult.data ?? [];

  // Aviso para el consultor: el ciclo abierto más reciente lo abrió el
  // cliente desde el portal (Fase 4, `assessments.origin`), no el equipo.
  const isClientRecertRequested =
    assessment?.status === "open" && assessment?.origin === "client_recert";

  const scoreTier =
    company.complexity_score !== null
      ? scoreTierOf(company.complexity_score)
      : null;

  // contact es jsonb: extracción defensiva de name/email/phone.
  const contactRecord =
    company.contact &&
    typeof company.contact === "object" &&
    !Array.isArray(company.contact)
      ? (company.contact as Record<string, unknown>)
      : {};
  const contactParts = [
    contactRecord.name,
    contactRecord.email,
    contactRecord.phone,
  ].filter(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  );

  const createdAt = format.dateTime(new Date(company.created_at), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const recordRows: { key: string; value: ReactNode }[] = [
    { key: "rut", value: company.rut ?? t("none") },
    {
      key: "contact",
      value: contactParts.length > 0 ? contactParts.join(" · ") : t("none"),
    },
    { key: "sector", value: company.sectors?.name ?? t("none") },
    {
      key: "laws",
      value: company.sectors?.laws?.length ? (
        <span className="flex flex-wrap gap-4">
          {company.sectors.laws.map((law) => (
            <span
              key={law}
              className="rounded-tags bg-ash px-8 py-[2px] text-[11px] font-medium text-carbon"
            >
              {law}
            </span>
          ))}
        </span>
      ) : (
        t("none")
      ),
    },
  ];
  if (company.notes) {
    recordRows.push({ key: "notes", value: company.notes });
  }

  return (
    <>
      <PageHeader
        eyebrow={t("detail.eyebrow")}
        title={company.name}
        description={t("detail.subtitle", {
          sector: company.sectors?.name ?? t("none"),
          size: company.size_tier
            ? t(`sizeTiers.${company.size_tier}`)
            : t("none"),
          date: createdAt,
        })}
        actions={
          <>
            {isClientRecertRequested ? (
              <StatusBadge pill variant="warning">
                {t("detail.clientRecertRequested")}
              </StatusBadge>
            ) : null}
            <DownloadReportButton href={`/app/companies/${company.id}/informe`} />
          </>
        }
      />

      {/* 4 stat-cards: fase, score interno, avance del checklist, riesgos. */}
      <div className="mb-24 grid gap-12 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex flex-col gap-8">
          <p className="text-caption leading-caption tracking-caption text-carbon">
            {t("detail.stats.phase")}
          </p>
          <div>
            <StatusBadge pill variant={PHASE_BADGE_VARIANT[company.phase]}>
              {tShell(`phases.${company.phase}`)}
            </StatusBadge>
          </div>
        </Card>
        <Card className="flex flex-col gap-4">
          <p className="text-caption leading-caption tracking-caption text-carbon">
            {t("detail.stats.score")}
          </p>
          {company.complexity_score !== null && scoreTier !== null ? (
            <>
              <p className="text-[26px] font-semibold leading-[1.15] tracking-[-0.8px] text-ink">
                {company.complexity_score}
              </p>
              <p className="flex items-center gap-8 text-caption leading-caption text-carbon">
                <StatusBadge variant={SCORE_TIER_VARIANT[scoreTier]}>
                  {t(`scoreTiers.${scoreTier}`)}
                </StatusBadge>
                {t("detail.stats.scoreInternal")}
              </p>
            </>
          ) : (
            <p className="text-body-sm text-metal">
              {t("detail.stats.scoreMissing")}
            </p>
          )}
        </Card>
        <Card className="flex flex-col gap-4">
          <p className="text-caption leading-caption tracking-caption text-carbon">
            {t("detail.stats.progress")}
          </p>
          <p className="text-[26px] font-semibold leading-[1.15] tracking-[-0.8px] text-ink">
            {progress.pct}%
          </p>
          <ProgressBar
            value={progress.pct}
            aria-label={t("detail.stats.progress")}
            fillClassName={progressFillClass(progress.pct)}
          />
          <p className="text-caption leading-caption tracking-caption text-carbon">
            {t("detail.stats.progressSub", {
              evaluated: progress.evaluated,
              total: progress.total,
            })}
          </p>
        </Card>
        <Card className="flex flex-col gap-4">
          <p className="text-caption leading-caption tracking-caption text-carbon">
            {t("detail.stats.risks")}
          </p>
          <p
            className={
              risksCount > 0
                ? "text-[26px] font-semibold leading-[1.15] tracking-[-0.8px] text-danger-red"
                : "text-[26px] font-semibold leading-[1.15] tracking-[-0.8px] text-ink"
            }
          >
            {risksCount}
          </p>
          <p className="text-caption leading-caption tracking-caption text-carbon">
            {t("detail.stats.risksSub")}
          </p>
        </Card>
      </div>

      <div className="grid items-start gap-20 lg:grid-cols-[1.4fr_1fr]">
        {/* Columna principal: checklist + ficha */}
        <div className="flex flex-col gap-20">
          <Card padded={false}>
            <div className="flex items-center justify-between gap-12 border-b border-ash bg-[#fbfbfc] px-[18px] py-[14px]">
              <h2 className="text-[13px] font-semibold text-ink">
                {t("detail.checklist.title")}
                {assessment ? (
                  <span className="ml-8 font-medium text-carbon">
                    {t("detail.checklist.cycle", { cycle: assessment.cycle })}
                  </span>
                ) : null}
              </h2>
              {assessment ? (
                <Link
                  href={`/app/companies/${company.id}/checklist`}
                  className="text-caption font-medium text-carbon transition-colors hover:text-ink"
                >
                  {t("detail.checklist.open")}
                </Link>
              ) : null}
            </div>
            {progress.total > 0 ? (
              <div className="flex flex-wrap items-center gap-24 p-20">
                <StatusDonut
                  counts={counts}
                  centerPct={compliantPct}
                  centerLabel={t("detail.checklist.centerLabel")}
                  ariaLabel={t("detail.checklist.donutLabel")}
                />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-8">
                  {DONUT_SEGMENTS.map(({ status }) => {
                    const pct =
                      progress.total > 0
                        ? Math.round((counts[status] / progress.total) * 100)
                        : 0;
                    return (
                      <div
                        key={status}
                        className={`rounded-cards border px-12 py-8 ${STATUS_CARD_CLASSES[status]}`}
                      >
                        <p className="text-[20px] font-semibold leading-[1.2]">
                          {counts[status]}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3px]">
                          {t(`detail.checklist.statuses.${status}`)} ·{" "}
                          {t("detail.checklist.statusPct", { pct })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Sin evaluación o sin controles: estado vacío explícito. */
              <p className="p-20 text-body-sm leading-body-sm tracking-body-sm text-metal">
                {t("detail.checklist.empty")}
              </p>
            )}
          </Card>

          <Card padded={false}>
            <div className="border-b border-ash bg-[#fbfbfc] px-[18px] py-[14px]">
              <h2 className="text-[13px] font-semibold text-ink">
                {t("detail.record.title")}
              </h2>
            </div>
            <dl className="grid gap-x-24 gap-y-12 p-20 sm:grid-cols-2">
              {recordRows.map((row) => (
                <div key={row.key} className={row.key === "notes" ? "sm:col-span-2" : undefined}>
                  <dt className="text-caption leading-caption tracking-caption text-carbon">
                    {t(`detail.record.${row.key}`)}
                  </dt>
                  <dd className="mt-[2px] text-body-sm leading-body-sm tracking-body-sm text-ink">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        {/* Columna lateral: riesgos, movimientos, cambio de fase */}
        <div className="flex flex-col gap-20">
          <Card padded={false}>
            <div className="flex items-center justify-between gap-12 border-b border-ash bg-[#fbfbfc] px-[18px] py-[14px]">
              <h2 className="text-[13px] font-semibold text-ink">
                {t("detail.risks.title")}
              </h2>
              <Link
                href={`/app/companies/${company.id}/risks`}
                className="text-caption font-medium text-carbon transition-colors hover:text-ink"
              >
                {t("detail.risks.viewAll")}
              </Link>
            </div>
            {topRisks.length > 0 ? (
              <ul>
                {topRisks.map((risk) => {
                  const severity = riskSeverity(risk.impact, risk.probability);
                  return (
                    <li
                      key={risk.id}
                      className="flex items-start justify-between gap-12 border-b border-ash px-[18px] py-12 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="font-sans text-[11px] font-bold text-carbon">
                          {risk.risk_catalog?.code}
                          <span className="ml-8 font-medium">
                            {t("detail.risks.impactProbability", {
                              impact: risk.impact,
                              probability: risk.probability,
                            })}
                          </span>
                        </p>
                        <p className="mt-[2px] line-clamp-2 text-[13px] leading-[1.45] text-ink">
                          {risk.risk_catalog?.description}
                        </p>
                      </div>
                      <StatusBadge pill variant={severityBadgeVariant[severity]}>
                        {t(`detail.risks.severities.${severity}`)}
                      </StatusBadge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-[18px] text-body-sm leading-body-sm tracking-body-sm text-metal">
                {t("detail.risks.empty")}
              </p>
            )}
          </Card>

          <Card padded={false}>
            <div className="border-b border-ash bg-[#fbfbfc] px-[18px] py-[14px]">
              <h2 className="text-[13px] font-semibold text-ink">
                {t("detail.activity.title")}
              </h2>
            </div>
            {auditEntries.length > 0 ? (
              <ul>
                {auditEntries.map((entry) => {
                  const actionKey = AUDIT_ACTION_KEYS[entry.action];
                  return (
                    <li
                      key={entry.id}
                      className="flex items-baseline justify-between gap-12 border-b border-ash px-[18px] py-[10px] last:border-0"
                    >
                      {actionKey ? (
                        <span className="text-[13px] font-medium text-ink">
                          {t(`detail.activity.actions.${actionKey}`)}
                        </span>
                      ) : (
                        <code className="font-sans text-[12px] font-semibold text-carbon">
                          {entry.action}
                        </code>
                      )}
                      <time
                        dateTime={entry.created_at}
                        className="shrink-0 text-caption text-carbon"
                      >
                        {format.dateTime(new Date(entry.created_at), {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </li>
                  );
                })}
              </ul>
            ) : (
              /* RLS: SELECT de audit_log solo admin — consultores ven esto. */
              <p className="p-[18px] text-body-sm leading-body-sm tracking-body-sm text-metal">
                {t("detail.activity.empty")}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-12 text-[13px] font-semibold text-ink">
              {t("detail.phaseForm.title")}
            </h2>
            <PhaseForm companyId={company.id} currentPhase={company.phase} />
          </Card>

          {isConsultant ? (
            <Card>
              <h2 className="mb-4 text-[13px] font-semibold text-ink">
                {t("detail.proposal.title")}
              </h2>
              <p className="mb-12 text-caption leading-caption tracking-caption text-carbon">
                {t("detail.proposal.description")}
              </p>
              <ProposalForm companyId={company.id} />
            </Card>
          ) : null}

          {isConsultant ? (
            <Card>
              <h2 className="mb-4 text-[13px] font-semibold text-ink">
                {t("detail.clientAccess.title")}
              </h2>
              <p className="mb-12 text-caption leading-caption tracking-caption text-carbon">
                {t("detail.clientAccess.description")}
              </p>
              <CompanyMemberInviteForm companyId={company.id} />
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
