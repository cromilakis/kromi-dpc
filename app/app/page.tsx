import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
} from "@/components/ui";
import {
  checklistProgress,
  companyInitials,
  PHASE_BADGE_VARIANT,
  progressFillClass,
} from "@/lib/companies/display";
import { createClient } from "@/lib/supabase/server";

/**
 * /app — Panel general del consultor (prototipo §1.4.1 isDashboard):
 * 4 stat-cards del portafolio + tabla de cartera (empresa, rubro, tamaño,
 * fase, avance del checklist del ciclo vigente, riesgos). Datos REALES vía
 * el cliente server AUTENTICADO (RLS autoriza consultores). Estado vacío
 * invita a registrar la primera empresa; los errores de datos suben al
 * error boundary del shell (app/app/error.tsx, con reintento).
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.dashboard.meta");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const t = await getTranslations("app.dashboard");
  const tCompanies = await getTranslations("app.companies");
  const tShell = await getTranslations("app.shell");

  const supabase = await createClient();
  // Embed acotado: SOLO la evaluación ABIERTA de ciclo mayor por empresa
  // (order + limit en el recurso embebido) — sin esto viajaban los controles
  // de TODOS los ciclos para descartarse en JS. El criterio coincide con el
  // stat "controles evaluados en evaluaciones abiertas".
  const { data: companies, error } = await supabase
    .from("companies")
    .select(
      "id, name, phase, size_tier, sectors ( name ), assessments ( cycle, assessment_controls ( status ) ), company_risks ( id )",
    )
    .eq("assessments.status", "open")
    .order("created_at", { ascending: false })
    .order("cycle", { referencedTable: "assessments", ascending: false })
    .limit(1, { referencedTable: "assessments" });

  if (error) {
    throw new Error(`No fue posible cargar la cartera: ${error.message}`);
  }

  // Avance del checklist por empresa: la evaluación abierta de ciclo mayor
  // (el reduce queda como defensa por si el embed trae más de una fila).
  const rows = (companies ?? []).map((company) => {
    const latest = company.assessments.reduce<
      (typeof company.assessments)[number] | null
    >((best, assessment) => {
      return !best || assessment.cycle > best.cycle ? assessment : best;
    }, null);
    const progress = checklistProgress(
      (latest?.assessment_controls ?? []).map((control) => control.status),
    );
    return { company, progress, risksCount: company.company_risks.length };
  });

  const totals = rows.reduce(
    (acc, { company, progress }) => {
      acc.evaluated += progress.evaluated;
      acc.controls += progress.total;
      if (company.phase === "diagnostico") acc.inDiagnosis += 1;
      if (company.phase === "certificacion" || company.phase === "revalidacion") {
        acc.certified += 1;
      }
      return acc;
    },
    { evaluated: 0, controls: 0, inDiagnosis: 0, certified: 0 },
  );

  const stats = [
    {
      key: "activeCompanies",
      value: rows.length,
      sub: t("stats.activeCompaniesSub"),
    },
    {
      key: "inDiagnosis",
      value: totals.inDiagnosis,
      sub: t("stats.inDiagnosisSub"),
    },
    { key: "certified", value: totals.certified, sub: t("stats.certifiedSub") },
    {
      key: "controlsEvaluated",
      value: totals.evaluated,
      sub: t("stats.controlsEvaluatedSub", { total: totals.controls }),
    },
  ] as const;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {rows.length === 0 ? (
        /* Estado vacío: la cartera parte con la primera empresa. */
        <Card className="flex flex-col items-center gap-12 py-60 text-center">
          <h2 className="text-body font-semibold text-ink">
            {t("empty.title")}
          </h2>
          <p className="max-w-[440px] text-body-sm leading-body-sm tracking-body-sm text-metal">
            {t("empty.text")}
          </p>
          <Link href="/app/empresas/nueva" className={buttonClasses("primary")}>
            {t("empty.cta")}
          </Link>
        </Card>
      ) : (
        <>
          {/* Stat-cards del portafolio (prototipo: label 12px + valor 30px/600). */}
          <div className="mb-24 grid gap-12 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.key} className="flex flex-col gap-4">
                <p className="text-caption leading-caption tracking-caption text-carbon">
                  {t(`stats.${stat.key}`)}
                </p>
                <p className="text-[30px] font-semibold leading-[1.15] tracking-[-0.9px] text-ink">
                  {stat.value}
                </p>
                <p className="text-caption leading-caption tracking-caption text-carbon">
                  {stat.sub}
                </p>
              </Card>
            ))}
          </div>

          {/* Cartera de empresas: fila → resumen de la empresa. */}
          <Card padded={false}>
            <div className="flex items-center justify-between gap-12 border-b border-ash bg-[#fbfbfc] px-[18px] py-[14px]">
              <h2 className="text-[13px] font-semibold text-ink">
                {t("portfolio.title")}
              </h2>
              <Link
                href="/app/empresas"
                className="text-caption font-medium text-carbon transition-colors hover:text-ink"
              >
                {t("portfolio.viewAll")}
              </Link>
            </div>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("portfolio.columns.company")}</TableHeaderCell>
                  <TableHeaderCell>{t("portfolio.columns.sector")}</TableHeaderCell>
                  <TableHeaderCell>{t("portfolio.columns.size")}</TableHeaderCell>
                  <TableHeaderCell>{t("portfolio.columns.phase")}</TableHeaderCell>
                  <TableHeaderCell>{t("portfolio.columns.progress")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    {t("portfolio.columns.risks")}
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(({ company, progress, risksCount }) => (
                  <TableRow key={company.id} className="hover:bg-[#fbfbfc]">
                    <TableCell>
                      <span className="flex items-center gap-[10px]">
                        <span
                          aria-hidden="true"
                          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-md bg-ash text-[11px] font-semibold text-carbon"
                        >
                          {companyInitials(company.name)}
                        </span>
                        <Link
                          href={`/app/empresas/${company.id}`}
                          aria-label={t("portfolio.open", { name: company.name })}
                          className="truncate text-[13px] font-medium text-ink hover:underline"
                        >
                          {company.name}
                        </Link>
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px] text-carbon">
                      {company.sectors?.name ?? tCompanies("none")}
                    </TableCell>
                    <TableCell className="text-[13px] text-carbon">
                      {company.size_tier
                        ? tCompanies(`sizeTiers.${company.size_tier}`)
                        : tCompanies("none")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge pill variant={PHASE_BADGE_VARIANT[company.phase]}>
                        {tShell(`phases.${company.phase}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {progress.total > 0 ? (
                        <span className="flex items-center gap-8">
                          <ProgressBar
                            value={progress.pct}
                            aria-label={t("portfolio.progressLabel", {
                              name: company.name,
                            })}
                            fillClassName={progressFillClass(progress.pct)}
                            className="max-w-[90px]"
                          />
                          <span className="text-[13px] font-semibold text-ink">
                            {t("portfolio.progressValue", { pct: progress.pct })}
                          </span>
                        </span>
                      ) : (
                        <span className="text-caption text-carbon">
                          {t("portfolio.noAssessment")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          risksCount > 0
                            ? "text-[13px] font-semibold text-danger-red"
                            : "text-[13px] text-carbon"
                        }
                      >
                        {risksCount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
