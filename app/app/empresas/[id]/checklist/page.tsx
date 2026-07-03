import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import {
  ChecklistFilters,
  CONTROL_STATUS_ORDER,
  ControlStatusButton,
  type ControlStatus,
} from "@/components/app/checklist";
import { PageHeader } from "@/components/app/shell";
import { buttonClasses, Card, ProgressBar, StatusBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

/**
 * /app/empresas/[id]/checklist — Checklist multiregulatorio (prototipo
 * §1.4.5, spec checklist-evaluacion, risk high). Vista de datos del
 * assessment ACTIVO de la empresa (status 'open' del ciclo mayor). Estructura
 * canónica del prototipo: grid `284px 1fr` con RAIL persistente de los 14
 * dominios (código + contador done/total + mini barra, cada ítem enlaza a
 * `?dominio=…`) y panel con el/los dominios visibles, estado cicable por
 * control y contador de evidencias. El filtro por estado (`estado`) y el
 * dominio seleccionado (`dominio`) viven en searchParams (deep-linkeable).
 * Caso borde contractual: sin assessment abierto se muestra empty state con
 * explicación; NUNCA se crea uno silenciosamente desde esta vista.
 * Datos con el cliente AUTENTICADO (RLS autoriza consultores).
 */

const companyIdSchema = z.uuid();

/** Fila de control ya resuelta contra el catálogo (join controls→domains). */
interface ControlRow {
  id: string;
  status: ControlStatus;
  code: string;
  name: string;
  sort: number;
  laws: string[];
  requiredCount: number;
  uploadedCount: number;
}

interface DomainGroup {
  code: string;
  name: string;
  principle: string | null;
  sort: number;
  rows: ControlRow[];
}

/** Umbrales pctColor del prototipo (§3.5): ≥80 verde, ≥50 ámbar, <50 rojo. */
function pctFillClass(pct: number): string {
  if (pct >= 80) return "bg-success-green";
  if (pct >= 50) return "bg-warning-yellow";
  return "bg-danger-red";
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.checklist.meta");
  return { title: t("title") };
}

interface ChecklistPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ChecklistPage({
  params,
  searchParams,
}: ChecklistPageProps) {
  const [{ id }, sp, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("app.checklist"),
  ]);
  if (!companyIdSchema.safeParse(id).success) notFound();

  const supabase = await createClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (companyError) {
    throw new Error(`No fue posible cargar la empresa: ${companyError.message}`);
  }
  if (!company) notFound();

  // Assessment activo: status 'open' del ciclo mayor (contrato de la spec).
  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .select("id, cycle")
    .eq("company_id", id)
    .eq("status", "open")
    .order("cycle", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (assessmentError) {
    throw new Error(
      `No fue posible cargar la evaluación: ${assessmentError.message}`,
    );
  }

  const header = (
    <PageHeader
      eyebrow={t("eyebrow", { company: company.name })}
      title={t("title")}
      description={t("description")}
      actions={
        assessment ? (
          <StatusBadge pill variant="neutral">
            {t("cycleBadge", { cycle: assessment.cycle })}
          </StatusBadge>
        ) : undefined
      }
    />
  );

  // Caso borde: empresa sin ciclo abierto → empty state explicado, sin crear
  // nada silenciosamente.
  if (!assessment) {
    return (
      <>
        {header}
        <Card className="p-32 text-center">
          <h2 className="text-body-sm font-semibold text-ink">
            {t("empty.noAssessment.title")}
          </h2>
          <p className="mx-auto mt-8 max-w-[480px] text-[13px] leading-[1.6] text-carbon">
            {t("empty.noAssessment.text")}
          </p>
          <div className="mt-20">
            <Link
              href={`/app/empresas/${company.id}`}
              className={buttonClasses("secondary")}
            >
              {t("empty.noAssessment.back")}
            </Link>
          </div>
        </Card>
      </>
    );
  }

  const [controlsResult, evidencesResult] = await Promise.all([
    supabase
      .from("assessment_controls")
      .select(
        "id, status, controls ( id, code, name, sort, laws, required_evidences, domains ( code, name, principle, sort ) )",
      )
      .eq("assessment_id", assessment.id),
    supabase.from("evidences").select("control_id, name").eq("company_id", id),
  ]);
  if (controlsResult.error) {
    throw new Error(
      `No fue posible cargar los controles: ${controlsResult.error.message}`,
    );
  }
  if (evidencesResult.error) {
    throw new Error(
      `No fue posible cargar las evidencias: ${evidencesResult.error.message}`,
    );
  }

  // Conteo de evidencias cargadas por control: DOCUMENTOS distintos (name),
  // no filas — cada versión es una fila y contarlas inflaría el "{n}/{m}".
  const uploadedByControl = new Map<string, Set<string>>();
  for (const row of evidencesResult.data ?? []) {
    if (!row.control_id) continue;
    let names = uploadedByControl.get(row.control_id);
    if (!names) {
      names = new Set();
      uploadedByControl.set(row.control_id, names);
    }
    names.add(row.name);
  }

  // Agrupación por dominio (orden del catálogo: domains.sort, controls.sort).
  const groupsByCode = new Map<string, DomainGroup>();
  for (const row of controlsResult.data ?? []) {
    const control = row.controls;
    const domain = control?.domains;
    // Fila sin catálogo (control/dominio borrado): no se puede presentar.
    if (!control || !domain) continue;
    let group = groupsByCode.get(domain.code);
    if (!group) {
      group = {
        code: domain.code,
        name: domain.name,
        principle: domain.principle,
        sort: domain.sort,
        rows: [],
      };
      groupsByCode.set(domain.code, group);
    }
    group.rows.push({
      id: row.id,
      status: row.status,
      code: control.code,
      name: control.name,
      sort: control.sort,
      laws: control.laws,
      requiredCount: control.required_evidences.length,
      uploadedCount: uploadedByControl.get(control.id)?.size ?? 0,
    });
  }
  const groups = [...groupsByCode.values()].sort((a, b) => a.sort - b.sort);
  for (const group of groups) {
    group.rows.sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code));
  }

  // Progreso global (compliant sobre total, sin filtros).
  const allRows = groups.flatMap((group) => group.rows);
  const total = allRows.length;
  const compliant = allRows.filter((row) => row.status === "compliant").length;
  const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;

  // Filtros validados contra el enum y los dominios presentes (searchParams
  // manipulados se ignoran en vez de romper la vista).
  const rawStatus = typeof sp.estado === "string" ? sp.estado : "";
  const statusFilter = (CONTROL_STATUS_ORDER as readonly string[]).includes(
    rawStatus,
  )
    ? (rawStatus as ControlStatus)
    : undefined;
  const rawDomain =
    typeof sp.dominio === "string" ? sp.dominio.toUpperCase() : "";
  const domainFilter = groupsByCode.has(rawDomain) ? rawDomain : undefined;

  const visibleGroups = groups
    .filter((group) => !domainFilter || group.code === domainFilter)
    .map((group) => ({
      ...group,
      visibleRows: statusFilter
        ? group.rows.filter((row) => row.status === statusFilter)
        : group.rows,
    }))
    .filter((group) => group.visibleRows.length > 0);

  // Enlaces del rail: preservan el filtro de estado al cambiar de dominio.
  const checklistBase = `/app/empresas/${company.id}/checklist`;
  function railHref(domainCode?: string): string {
    const query = new URLSearchParams();
    if (statusFilter) query.set("estado", statusFilter);
    if (domainCode) query.set("dominio", domainCode);
    const search = query.toString();
    return search ? `${checklistBase}?${search}` : checklistBase;
  }
  const railItemClasses = (selected: boolean) =>
    `flex flex-col gap-4 rounded-[8px] px-10 py-8 transition-colors ${
      selected ? "bg-ash" : "hover:bg-[#fbfbfc]"
    }`;

  return (
    <>
      {header}

      {total === 0 ? (
        // Assessment sin controles: catálogo mal cargado — estado explicado.
        <Card className="p-32 text-center">
          <h2 className="text-body-sm font-semibold text-ink">
            {t("empty.noControls.title")}
          </h2>
          <p className="mx-auto mt-8 max-w-[480px] text-[13px] leading-[1.6] text-carbon">
            {t("empty.noControls.text")}
          </p>
        </Card>
      ) : (
        <>
          <Card className="mb-20">
            <div className="flex flex-wrap items-center justify-between gap-16">
              <div>
                <h2 className="text-[13px] font-semibold text-ink">
                  {t("summary.title")}
                </h2>
                <p className="mt-4 text-caption leading-caption text-carbon">
                  {t("summary.progressText", { pct, compliant, total })}
                </p>
              </div>
              <p className="text-[26px] font-semibold tracking-[-0.8px] text-ink">
                {pct}%
              </p>
            </div>
            <ProgressBar
              className="mt-12"
              value={pct}
              fillClassName={pctFillClass(pct)}
              aria-label={t("summary.progressLabel")}
            />
          </Card>

          {/* Grid canónico del prototipo §1.4.5: rail 284px + panel. */}
          <div className="grid items-start gap-20 lg:grid-cols-[284px_1fr]">
            <Card padded={false} className="p-[10px]">
              <nav aria-label={t("rail.label")}>
                <p className="px-10 pb-8 pt-4 text-[11px] font-semibold uppercase leading-[1.5] tracking-[0.3px] text-carbon">
                  {t("rail.counter", { count: groups.length })}
                </p>
                <ul className="flex flex-col gap-[2px]">
                  <li>
                    <Link
                      href={railHref()}
                      aria-current={!domainFilter ? "true" : undefined}
                      className={railItemClasses(!domainFilter)}
                    >
                      <span className="text-[13px] font-medium leading-[1.45] text-ink">
                        {t("rail.all")}
                      </span>
                    </Link>
                  </li>
                  {groups.map((group) => {
                    const done = group.rows.filter(
                      (row) => row.status === "compliant",
                    ).length;
                    const selected = domainFilter === group.code;
                    return (
                      <li key={group.code}>
                        <Link
                          href={railHref(group.code)}
                          aria-current={selected ? "true" : undefined}
                          className={railItemClasses(selected)}
                        >
                          <span className="flex items-center justify-between gap-8">
                            <span className="text-[11px] font-semibold leading-[1.5] text-carbon">
                              {group.code}
                            </span>
                            <span className="text-[11px] leading-[1.5] text-carbon">
                              {t("domain.counter", {
                                done,
                                total: group.rows.length,
                              })}
                            </span>
                          </span>
                          <span className="truncate text-[13px] font-medium leading-[1.45] text-ink">
                            {group.name}
                          </span>
                          {/* Decorativa: el contador de al lado ya lo dice. */}
                          <span aria-hidden="true">
                            <ProgressBar
                              className="h-[5px]"
                              value={done}
                              max={group.rows.length}
                            />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </Card>

            <div className="flex min-w-0 flex-col gap-16">
              <ChecklistFilters
                status={statusFilter ?? ""}
                domain={domainFilter ?? ""}
              />

              {visibleGroups.length === 0 ? (
                <Card className="p-32 text-center">
                  <h2 className="text-body-sm font-semibold text-ink">
                    {t("empty.noResults.title")}
                  </h2>
                  <p className="mx-auto mt-8 max-w-[480px] text-[13px] leading-[1.6] text-carbon">
                    {t("empty.noResults.text")}
                  </p>
                  <div className="mt-20">
                    <Link
                      href={
                        domainFilter
                          ? `${checklistBase}?dominio=${domainFilter}`
                          : checklistBase
                      }
                      className={buttonClasses("secondary")}
                    >
                      {t("empty.noResults.clear")}
                    </Link>
                  </div>
                </Card>
              ) : (
                visibleGroups.map((group) => {
                  const domainDone = group.rows.filter(
                    (row) => row.status === "compliant",
                  ).length;
                  return (
                    <section
                      key={group.code}
                      aria-labelledby={`domain-${group.code}`}
                    >
                    <Card padded={false}>
                      <header className="flex flex-wrap items-center gap-12 border-b border-ash bg-[#fbfbfc] px-20 py-12">
                        <span className="rounded-tags bg-ash px-8 py-[2px] text-[11px] font-semibold leading-[1.5] text-carbon">
                          {group.code}
                        </span>
                        <h2
                          id={`domain-${group.code}`}
                          className="text-body-sm font-semibold text-ink"
                        >
                          {group.name}
                        </h2>
                        {group.principle ? (
                          <StatusBadge pill variant="active">
                            {group.principle}
                          </StatusBadge>
                        ) : null}
                        <div className="ml-auto flex items-center gap-8">
                          <span className="text-caption font-semibold leading-caption text-carbon">
                            {t("domain.counter", {
                              done: domainDone,
                              total: group.rows.length,
                            })}
                          </span>
                          <ProgressBar
                            className="h-[5px] w-[90px]"
                            value={domainDone}
                            max={group.rows.length}
                            aria-label={t("domain.progressLabel", {
                              code: group.code,
                            })}
                          />
                        </div>
                      </header>
                      <ul>
                        {group.visibleRows.map((row) => (
                          <li
                            key={row.id}
                            className="flex items-center gap-16 border-t border-ash px-20 py-12 first:border-t-0"
                          >
                            <Link
                              href={`/app/empresas/${company.id}/controles/${row.code}`}
                              aria-label={t("row.open", {
                                code: row.code,
                                name: row.name,
                              })}
                              className="group flex min-w-0 flex-1 flex-col gap-4"
                            >
                              <span className="flex flex-wrap items-center gap-8">
                                <span className="text-[11px] font-semibold leading-[1.5] text-carbon">
                                  {row.code}
                                </span>
                                {row.laws.map((law) => (
                                  <span
                                    key={law}
                                    className="rounded-tags bg-ash px-[7px] py-[2px] text-[11px] leading-[1.5] text-carbon"
                                  >
                                    {law}
                                  </span>
                                ))}
                              </span>
                              <span className="text-body-sm font-medium text-ink group-hover:underline">
                                {row.name}
                              </span>
                            </Link>
                            {row.requiredCount > 0 ? (
                              <span className="shrink-0 text-caption leading-caption text-carbon max-sm:hidden">
                                {t("row.evidences", {
                                  uploaded: row.uploadedCount,
                                  required: row.requiredCount,
                                })}
                              </span>
                            ) : null}
                            <ControlStatusButton
                              assessmentControlId={row.id}
                              status={row.status}
                              controlCode={row.code}
                              className="shrink-0"
                            />
                            <span aria-hidden="true" className="shrink-0 text-metal">
                              ›
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                    </section>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
