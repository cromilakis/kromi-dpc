import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import {
  ControlNotesForm,
  ControlStatusButton,
  EVIDENCE_STATUS_VARIANT,
  type EvidenceStatus,
} from "@/components/app/checklist";
import { buttonClasses, Card, StatusBadge } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

/**
 * /app/empresas/[id]/controles/[codigo] — Ficha de control (prototipo
 * §1.4.6, spec checklist-evaluacion, risk high): objetivo + detalle,
 * criterios de verificación numerados, fundamento legal primario/conectado,
 * riesgo mitigado, evidencias requeridas con estado (regla del spec:
 * requerida sin fila en evidences = 'faltante'), estado del control cicable
 * (mismo componente que el checklist), hallazgos/notas editables (server
 * action) y navegación prev/next entre controles del mismo dominio.
 * Datos con el cliente AUTENTICADO (RLS autoriza consultores).
 */

const companyIdSchema = z.uuid();
// Códigos del catálogo estilo DPC-XXX-NNN; se valida en forma laxa (letras,
// dígitos y guiones) para tolerar evolución del catálogo sin tocar la ruta.
const controlCodeSchema = z.string().regex(/^[A-Z][A-Z0-9-]{2,31}$/);

/** Estilo compartido de los labels de sección de la ficha (11px uppercase). */
const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.3px] leading-[1.5]";

function parseCode(raw: string): string | null {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const code = decoded.toUpperCase();
  return controlCodeSchema.safeParse(code).success ? code : null;
}

interface ControlPageProps {
  params: Promise<{ id: string; codigo: string }>;
}

export async function generateMetadata({
  params,
}: ControlPageProps): Promise<Metadata> {
  const [{ codigo }, t] = await Promise.all([
    params,
    getTranslations("app.checklist.meta"),
  ]);
  const code = parseCode(codigo);
  return { title: t("controlTitle", { code: code ?? codigo }) };
}

export default async function ControlPage({ params }: ControlPageProps) {
  const [{ id, codigo }, t] = await Promise.all([
    params,
    getTranslations("app.checklist.control"),
  ]);
  if (!companyIdSchema.safeParse(id).success) notFound();
  const code = parseCode(codigo);
  if (!code) notFound();

  const supabase = await createClient();

  const [companyResult, controlResult] = await Promise.all([
    supabase.from("companies").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("controls")
      .select(
        "id, code, name, objective, detail, verification_criteria, legal_primary, legal_connected, risk_mitigated, required_evidences, laws, domain_id, domains ( code, name )",
      )
      .eq("code", code)
      .maybeSingle(),
  ]);
  if (companyResult.error) {
    throw new Error(
      `No fue posible cargar la empresa: ${companyResult.error.message}`,
    );
  }
  if (!companyResult.data) notFound();
  if (controlResult.error) {
    throw new Error(
      `No fue posible cargar el control: ${controlResult.error.message}`,
    );
  }
  const control = controlResult.data;
  if (!control || !control.domains) notFound();
  const company = companyResult.data;
  const domain = control.domains;

  // Assessment activo (status 'open' del ciclo mayor) + fila evaluada,
  // evidencias del control en el repositorio de la empresa y hermanos del
  // dominio para prev/next.
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

  const [assessmentControlResult, evidencesResult, siblingsResult] =
    await Promise.all([
      assessment
        ? supabase
            .from("assessment_controls")
            .select("id, status, findings, notes")
            .eq("assessment_id", assessment.id)
            .eq("control_id", control.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("evidences")
        .select("id, name, status, version")
        .eq("company_id", id)
        .eq("control_id", control.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("controls")
        .select("code, name, sort")
        .eq("domain_id", control.domain_id)
        .order("sort", { ascending: true })
        .order("code", { ascending: true }),
    ]);
  if (assessmentControlResult.error) {
    throw new Error(
      `No fue posible cargar el estado del control: ${assessmentControlResult.error.message}`,
    );
  }
  if (evidencesResult.error) {
    throw new Error(
      `No fue posible cargar las evidencias: ${evidencesResult.error.message}`,
    );
  }
  if (siblingsResult.error) {
    throw new Error(
      `No fue posible cargar los controles del dominio: ${siblingsResult.error.message}`,
    );
  }
  const assessmentControl = assessmentControlResult.data;
  const uploaded = evidencesResult.data ?? [];

  // Estado de cada evidencia requerida. Regla dura del spec: requerida sin
  // fila en evidences = 'faltante'. Sin FK evidencia↔ítem requerido todavía
  // (lo aporta la spec evidencias), la atribución es posicional con los
  // documentos más recientes primero — heurística documentada, no contrato.
  const requiredStatuses: EvidenceStatus[] = control.required_evidences.map(
    (_, index) => uploaded[index]?.status ?? "missing",
  );
  const requiredTotal = control.required_evidences.length;
  const requiredDone = requiredStatuses.filter(
    (status) => status === "validated",
  ).length;

  // Navegación prev/next dentro del dominio (orden del catálogo).
  const siblings = siblingsResult.data ?? [];
  const position = siblings.findIndex((item) => item.code === control.code);
  const prev = position > 0 ? siblings[position - 1] : null;
  const next =
    position >= 0 && position < siblings.length - 1
      ? siblings[position + 1]
      : null;

  const checklistPath = `/app/empresas/${company.id}/checklist`;

  return (
    <>
      <div className="mb-16">
        <Link href={checklistPath} className={buttonClasses("ghost", "-ml-12")}>
          {t("backToChecklist")}
        </Link>
      </div>

      <header className="mb-24">
        <p className="mb-8 flex flex-wrap items-center gap-8">
          <span className="rounded-tags bg-ash px-8 py-[2px] text-caption font-semibold leading-caption text-carbon">
            {control.code}
          </span>
          <span className="text-[13px] leading-[1.5] text-carbon">
            {domain.name}
          </span>
        </p>
        {/* H1 de ficha: serif 32px (prototipo §3.1), fuera del type scale. */}
        <h1 className="max-w-[760px] font-serif text-[32px] font-medium leading-[1.15] tracking-[-0.5px] text-ink">
          {control.name}
        </h1>
      </header>

      <div className="grid grid-cols-[1fr_340px] items-start gap-24 max-lg:grid-cols-1">
        <Card padded={false}>
          <section className="px-24 py-20">
            <h2 className={`${SECTION_LABEL} mb-8 text-carbon`}>
              {t("sections.objective")}
            </h2>
            {control.objective ? (
              <p className="text-body-sm font-medium leading-body-sm text-ink">
                {control.objective}
              </p>
            ) : null}
            {control.detail ? (
              <p className="mt-8 text-body-sm leading-[1.65] text-carbon">
                {control.detail}
              </p>
            ) : null}
            {!control.objective && !control.detail ? (
              <p className="text-body-sm text-carbon">{t("sections.none")}</p>
            ) : null}
          </section>

          <section className="border-t border-ash px-24 py-20">
            <h2 className={`${SECTION_LABEL} mb-12 text-carbon`}>
              {t("sections.criteria")}
            </h2>
            {control.verification_criteria.length > 0 ? (
              <ol className="flex flex-col gap-12">
                {/* key con index: el catálogo puede repetir texto de criterio. */}
                {control.verification_criteria.map((criterion, index) => (
                  <li key={`${index}-${criterion}`} className="flex items-start gap-12">
                    <span
                      aria-hidden="true"
                      className="mt-[1px] flex h-20 w-20 shrink-0 items-center justify-center rounded-[6px] bg-ash text-[11px] font-semibold text-carbon"
                    >
                      {index + 1}
                    </span>
                    <span className="text-body-sm leading-[1.55] text-ink">
                      {criterion}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-body-sm text-carbon">{t("sections.none")}</p>
            )}
          </section>

          <section className="border-t border-ash px-24 py-20">
            <h2 className={`${SECTION_LABEL} mb-8 text-carbon`}>
              {t("sections.legalPrimary")}
            </h2>
            <p className="text-body-sm leading-[1.65] text-ink">
              {control.legal_primary ?? t("sections.none")}
            </p>
          </section>

          <section className="border-t border-ash px-24 py-20">
            <h2 className={`${SECTION_LABEL} mb-8 text-carbon`}>
              {t("sections.legalConnected")}
            </h2>
            <p className="text-body-sm leading-[1.65] text-ink">
              {control.legal_connected ?? t("sections.none")}
            </p>
          </section>

          <section className="border-t border-ash px-24 py-20">
            {/* Label en rojo (prototipo §1.4.6: "Riesgo mitigado"). */}
            <h2 className={`${SECTION_LABEL} mb-8 text-danger-red`}>
              {t("sections.risk")}
            </h2>
            <p className="text-body-sm leading-[1.65] text-ink">
              {control.risk_mitigated ?? t("sections.none")}
            </p>
          </section>
        </Card>

        <div className="flex flex-col gap-16">
          <Card>
            <h2 className="text-[13px] font-semibold text-ink">
              {t("result.title")}
            </h2>
            <div className="mt-12">
              {!assessment ? (
                <p className="text-caption leading-caption text-carbon">
                  {t("result.noAssessment")}
                </p>
              ) : !assessmentControl ? (
                <p className="text-caption leading-caption text-carbon">
                  {t("result.notInAssessment")}
                </p>
              ) : (
                <ControlStatusButton
                  assessmentControlId={assessmentControl.id}
                  status={assessmentControl.status}
                  controlCode={control.code}
                  size="large"
                />
              )}
            </div>
            {control.laws.length > 0 ? (
              <div className="mt-16 border-t border-ash pt-12">
                <h3 className={`${SECTION_LABEL} mb-8 text-carbon`}>
                  {t("result.lawsLabel")}
                </h3>
                <div className="flex flex-wrap gap-8">
                  {control.laws.map((law) => (
                    <span
                      key={law}
                      className="rounded-tags bg-ash px-[7px] py-[2px] text-[11px] leading-[1.5] text-carbon"
                    >
                      {law}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-8">
              <h2 className="text-[13px] font-semibold text-ink">
                {t("evidences.title")}
              </h2>
              {requiredTotal > 0 ? (
                <span className="text-caption leading-caption text-carbon">
                  {t("evidences.counterLabel", {
                    done: requiredDone,
                    total: requiredTotal,
                  })}
                </span>
              ) : null}
            </div>
            {requiredTotal === 0 ? (
              <p className="mt-12 text-caption leading-caption text-carbon">
                {t("evidences.none")}
              </p>
            ) : (
              <ul className="mt-12 flex flex-col">
                {/* key con index: el catálogo puede repetir nombres. */}
                {control.required_evidences.map((name, index) => {
                  const status = requiredStatuses[index]!;
                  return (
                    <li
                      key={`${index}-${name}`}
                      className="flex items-center justify-between gap-12 border-t border-ash py-8 first:border-t-0"
                    >
                      <span className="min-w-0 text-[13px] leading-[1.5] text-ink">
                        {name}
                      </span>
                      <StatusBadge
                        variant={EVIDENCE_STATUS_VARIANT[status]}
                        className="shrink-0"
                      >
                        {t(`evidences.statuses.${status}`)}
                      </StatusBadge>
                    </li>
                  );
                })}
              </ul>
            )}
            <h3 className="mt-16 border-t border-ash pt-12 text-caption font-semibold leading-caption text-ink">
              {t("evidences.uploadedTitle")}
            </h3>
            {uploaded.length === 0 ? (
              <p className="mt-8 text-caption leading-caption text-carbon">
                {t("evidences.uploadedEmpty")}
              </p>
            ) : (
              <ul className="mt-8 flex flex-col gap-8">
                {uploaded.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-8">
                    <span className="min-w-0 flex-1 truncate text-[13px] leading-[1.5] text-ink">
                      {doc.name}
                    </span>
                    <span className="shrink-0 rounded-tags bg-ash px-[7px] py-[2px] text-[11px] font-semibold leading-[1.5] text-carbon">
                      {t("evidences.version", { version: doc.version })}
                    </span>
                    <StatusBadge
                      variant={EVIDENCE_STATUS_VARIANT[doc.status]}
                      className="shrink-0"
                    >
                      {t(`evidences.statuses.${doc.status}`)}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {assessmentControl ? (
            <Card>
              <h2 className="mb-16 text-[13px] font-semibold text-ink">
                {t("notes.title")}
              </h2>
              <ControlNotesForm
                assessmentControlId={assessmentControl.id}
                findings={assessmentControl.findings}
                notes={assessmentControl.notes}
              />
            </Card>
          ) : null}
        </div>
      </div>

      <nav
        aria-label={t("nav.label", { code: domain.code })}
        className="mt-32 flex items-center justify-between gap-16 border-t border-stone pt-20"
      >
        {prev ? (
          <Link
            href={`/app/empresas/${company.id}/controles/${prev.code}`}
            className={buttonClasses("secondary")}
          >
            {t("nav.prev", { code: prev.code })}
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
        {position >= 0 ? (
          <p className="text-caption leading-caption text-carbon">
            {t("nav.position", {
              index: position + 1,
              total: siblings.length,
              domain: domain.name,
            })}
          </p>
        ) : null}
        {next ? (
          <Link
            href={`/app/empresas/${company.id}/controles/${next.code}`}
            className={buttonClasses("secondary")}
          >
            {t("nav.next", { code: next.code })}
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
      </nav>
    </>
  );
}
