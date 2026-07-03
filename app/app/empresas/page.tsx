import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { PageHeader } from "@/components/app/shell";
import {
  Button,
  buttonClasses,
  Card,
  Field,
  Input,
  ProgressBar,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { COMPANY_PHASES } from "@/lib/companies/schema";
import {
  checklistProgress,
  companyInitials,
  PHASE_BADGE_VARIANT,
  progressFillClass,
} from "@/lib/companies/display";
import { scoreTierOf, type ScoreTier } from "@/lib/companies/scoring.server";
import { createClient } from "@/lib/supabase/server";

/**
 * /app/empresas — listado de empresas (prototipo §1.4.2 isEmpresas):
 * búsqueda por nombre + filtros de fase y rubro resueltos EN SERVIDOR vía
 * searchParams (form GET, sin JS), tabla con link al detalle y CTA "Nueva
 * empresa". Columnas del prototipo: Empresa · Rubro · Fase · Cumplimiento
 * (barra pctColor + %) · Score (coloreado por tramo) · Riesgos (rojo si >0)
 * · Tiempo (días en cartera). Estado vacío invita a registrar la primera;
 * sin resultados de filtros ofrece limpiarlos. Errores de datos → error
 * boundary del shell.
 */

/** Filtros tolerantes: un valor inválido se ignora (no rompe la vista). */
const searchSchema = z.object({
  q: z.string().trim().min(1).max(120).optional().catch(undefined),
  fase: z.enum(COMPANY_PHASES).optional().catch(undefined),
  rubro: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{2,40}$/)
    .optional()
    .catch(undefined),
});

/** Escapa los metacaracteres de LIKE/ILIKE (%, _, \) del término buscado. */
function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** tierColor del prototipo §1.4.2 (score 13px/600 coloreado por tramo). */
const SCORE_TIER_TEXT: Record<ScoreTier, string> = {
  low: "text-success-green",
  // Mismo azul accesible del StatusBadge `active` (action-blue oscurecido).
  medium: "text-[#2f66c9]",
  high: "text-warning-yellow",
  critical: "text-danger-red",
};

/** Días completos transcurridos desde `iso` (Tiempo "en proceso"). */
function daysSince(iso: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000),
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.companies.meta");
  return { title: t("listTitle") };
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = searchSchema.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    fase: typeof params.fase === "string" ? params.fase : undefined,
    rubro: typeof params.rubro === "string" ? params.rubro : undefined,
  });

  const t = await getTranslations("app.companies");
  const tShell = await getTranslations("app.shell");

  const supabase = await createClient();

  // El catálogo de rubros alimenta el select del filtro y resuelve code → id.
  const { data: sectors, error: sectorsError } = await supabase
    .from("sectors")
    .select("id, code, name")
    .order("sort", { ascending: true });
  if (sectorsError) {
    throw new Error(
      `No fue posible cargar el catálogo de rubros: ${sectorsError.message}`,
    );
  }

  const selectedSector =
    filters.rubro !== undefined
      ? (sectors ?? []).find((sector) => sector.code === filters.rubro)
      : undefined;

  // Embed acotado a la evaluación ABIERTA de ciclo mayor (mismo criterio que
  // el panel general): evita transferir los controles de todos los ciclos.
  let query = supabase
    .from("companies")
    .select(
      "id, name, phase, complexity_score, created_at, sectors ( name ), assessments ( cycle, assessment_controls ( status ) ), company_risks ( id )",
    )
    .eq("assessments.status", "open")
    .order("name", { ascending: true })
    .order("cycle", { referencedTable: "assessments", ascending: false })
    .limit(1, { referencedTable: "assessments" });
  if (filters.q !== undefined) {
    query = query.ilike("name", `%${escapeLikePattern(filters.q)}%`);
  }
  if (filters.fase !== undefined) {
    query = query.eq("phase", filters.fase);
  }
  if (selectedSector !== undefined) {
    query = query.eq("sector_id", selectedSector.id);
  }

  const { data: companies, error } = await query;
  if (error) {
    throw new Error(`No fue posible cargar las empresas: ${error.message}`);
  }

  // Avance del checklist (ciclo mayor), riesgos y días en cartera por fila —
  // mismas derivaciones que el panel general (§1.4.1).
  const rows = (companies ?? []).map((company) => {
    const latest = company.assessments.reduce<
      (typeof company.assessments)[number] | null
    >((best, assessment) => {
      return !best || assessment.cycle > best.cycle ? assessment : best;
    }, null);
    const progress = checklistProgress(
      (latest?.assessment_controls ?? []).map((control) => control.status),
    );
    return {
      company,
      progress,
      risksCount: company.company_risks.length,
      days: daysSince(company.created_at),
      scoreTier:
        company.complexity_score !== null
          ? scoreTierOf(company.complexity_score)
          : null,
    };
  });
  const hasFilters =
    filters.q !== undefined ||
    filters.fase !== undefined ||
    selectedSector !== undefined;

  return (
    <>
      <PageHeader
        title={t("list.title")}
        description={t("list.description")}
        actions={
          <Link href="/app/empresas/nueva" className={buttonClasses("primary")}>
            {t("list.newCompany")}
          </Link>
        }
      />

      {rows.length === 0 && !hasFilters ? (
        /* Cartera vacía: invitación a crear la primera empresa. */
        <Card className="flex flex-col items-center gap-12 py-60 text-center">
          <h2 className="text-body font-semibold text-ink">
            {t("list.empty.title")}
          </h2>
          <p className="max-w-[460px] text-body-sm leading-body-sm tracking-body-sm text-metal">
            {t("list.empty.text")}
          </p>
          <Link href="/app/empresas/nueva" className={buttonClasses("primary")}>
            {t("list.empty.cta")}
          </Link>
        </Card>
      ) : (
        <>
          {/* Filtros server-side: form GET sobre la misma ruta. */}
          <form
            method="get"
            className="mb-16 flex flex-wrap items-end gap-12"
            aria-label={t("list.filters.legend")}
          >
            <Field
              label={t("list.filters.searchLabel")}
              htmlFor="companies-q"
              className="min-w-[220px] flex-1"
            >
              <Input
                id="companies-q"
                type="search"
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder={t("list.filters.searchPlaceholder")}
              />
            </Field>
            <Field label={t("list.filters.phaseLabel")} htmlFor="companies-fase">
              <Select
                id="companies-fase"
                name="fase"
                defaultValue={filters.fase ?? ""}
                className="min-w-[170px]"
              >
                <option value="">{t("list.filters.allPhases")}</option>
                {COMPANY_PHASES.map((phase) => (
                  <option key={phase} value={phase}>
                    {tShell(`phases.${phase}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("list.filters.sectorLabel")} htmlFor="companies-rubro">
              <Select
                id="companies-rubro"
                name="rubro"
                defaultValue={selectedSector?.code ?? ""}
                className="min-w-[190px]"
              >
                <option value="">{t("list.filters.allSectors")}</option>
                {(sectors ?? []).map((sector) => (
                  <option key={sector.code} value={sector.code}>
                    {sector.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-center gap-8">
              <Button type="submit" variant="secondary">
                {t("list.filters.apply")}
              </Button>
              {hasFilters ? (
                <Link
                  href="/app/empresas"
                  className={buttonClasses("ghost")}
                >
                  {t("list.filters.clear")}
                </Link>
              ) : null}
            </div>
          </form>

          {rows.length === 0 ? (
            /* Sin resultados para los filtros aplicados. */
            <Card className="flex flex-col items-center gap-12 py-48 text-center">
              <h2 className="text-body font-semibold text-ink">
                {t("list.noResults.title")}
              </h2>
              <p className="max-w-[420px] text-body-sm leading-body-sm tracking-body-sm text-metal">
                {t("list.noResults.text")}
              </p>
              <Link href="/app/empresas" className={buttonClasses("secondary")}>
                {t("list.noResults.clear")}
              </Link>
            </Card>
          ) : (
            <Card padded={false}>
              <div className="border-b border-ash bg-[#fbfbfc] px-[18px] py-[14px]">
                <h2 className="text-[13px] font-semibold text-ink">
                  {t("list.count", { count: rows.length })}
                </h2>
              </div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("list.columns.company")}</TableHeaderCell>
                    <TableHeaderCell>{t("list.columns.sector")}</TableHeaderCell>
                    <TableHeaderCell>{t("list.columns.phase")}</TableHeaderCell>
                    <TableHeaderCell>{t("list.columns.progress")}</TableHeaderCell>
                    <TableHeaderCell>{t("list.columns.score")}</TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      {t("list.columns.risks")}
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      {t("list.columns.time")}
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(({ company, progress, risksCount, days, scoreTier }) => (
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
                            aria-label={t("list.open", { name: company.name })}
                            className="truncate text-[13px] font-medium text-ink hover:underline"
                          >
                            {company.name}
                          </Link>
                        </span>
                      </TableCell>
                      <TableCell className="text-[13px] text-carbon">
                        {company.sectors?.name ?? t("none")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          pill
                          variant={PHASE_BADGE_VARIANT[company.phase]}
                        >
                          {tShell(`phases.${company.phase}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        {progress.total > 0 ? (
                          <span className="flex items-center gap-8">
                            <ProgressBar
                              value={progress.pct}
                              aria-label={t("list.progressLabel", {
                                name: company.name,
                              })}
                              fillClassName={progressFillClass(progress.pct)}
                              className="max-w-[90px]"
                            />
                            <span className="text-[13px] font-semibold text-ink">
                              {t("list.progressValue", { pct: progress.pct })}
                            </span>
                          </span>
                        ) : (
                          <span className="text-caption text-carbon">
                            {t("list.noAssessment")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {company.complexity_score !== null && scoreTier !== null ? (
                          <span
                            className={`text-[13px] font-semibold ${SCORE_TIER_TEXT[scoreTier]}`}
                          >
                            {company.complexity_score}
                          </span>
                        ) : (
                          <span className="text-[13px] text-carbon">
                            {t("none")}
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
                      <TableCell className="whitespace-nowrap text-right text-[13px] text-carbon">
                        {t("list.daysValue", { days })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </>
  );
}
