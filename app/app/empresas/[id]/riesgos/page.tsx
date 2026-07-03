import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { PageHeader } from "@/components/app/shell";
import { AssignRiskForm, type CatalogRiskOption } from "@/components/risks/assign-risk-form";
import { RiskMatrix, type MatrixRisk } from "@/components/risks/risk-matrix";
import { RisksTable, type AssignedRiskRow } from "@/components/risks/risks-table";
import { createClient } from "@/lib/supabase/server";

/**
 * Riesgos & Gap (/app/empresas/[id]/riesgos) — spec riesgos-gap, prototipo
 * §1.4.7 extendido: matriz impacto × probabilidad 5×5 con conteos y tinte por
 * severidad + tabla de riesgos asignados (editar/quitar inline) + asignar
 * riesgo del catálogo con precarga de defaults. Server component: cliente
 * AUTENTICADO (RLS autoriza consultores); estados de carga (loading.tsx),
 * vacío (tabla/allAssigned) y error (throw → app/app/error.tsx) cubiertos.
 */

const companyIdSchema = z.uuid();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.risks.meta");
  return { title: t("title") };
}

export default async function RisksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // id que no es UUID (URL manipulada) → 404 sin tocar la base.
  if (!companyIdSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [t, companyRes, assignedRes, catalogRes] = await Promise.all([
    getTranslations("app.risks"),
    supabase.from("companies").select("name").eq("id", id).maybeSingle(),
    supabase
      .from("company_risks")
      .select(
        "id, impact, probability, risk_catalog ( code, description, classification )",
      )
      .eq("company_id", id),
    supabase
      .from("risk_catalog")
      .select("id, code, description, classification, default_impact, default_probability")
      .order("code"),
  ]);

  // Falla de lectura → error boundary del shell (estado de error de la vista).
  if (companyRes.error) {
    throw new Error(`No fue posible cargar la empresa: ${companyRes.error.message}`);
  }
  if (!companyRes.data) notFound();
  if (assignedRes.error) {
    throw new Error(
      `No fue posible cargar los riesgos asignados: ${assignedRes.error.message}`,
    );
  }
  if (catalogRes.error) {
    throw new Error(
      `No fue posible cargar el catálogo de riesgos: ${catalogRes.error.message}`,
    );
  }

  const assigned: AssignedRiskRow[] = (assignedRes.data ?? [])
    .map((row) => ({
      id: row.id,
      code: row.risk_catalog.code,
      description: row.risk_catalog.description,
      classification: row.risk_catalog.classification,
      impact: row.impact,
      probability: row.probability,
    }))
    // Orden estable por código R-XXX (el orden del catálogo, no el de alta).
    .sort((a, b) => a.code.localeCompare(b.code));

  const matrixRisks: MatrixRisk[] = assigned.map((risk) => ({
    code: risk.code,
    impact: risk.impact,
    probability: risk.probability,
  }));

  // Solo los riesgos del catálogo aún no asignados se pueden asignar.
  const assignedRiskCodes = new Set(assigned.map((risk) => risk.code));
  const options: CatalogRiskOption[] = (catalogRes.data ?? [])
    .filter((risk) => !assignedRiskCodes.has(risk.code))
    .map((risk) => ({
      id: risk.id,
      code: risk.code,
      description: risk.description,
      defaultImpact: risk.default_impact,
      defaultProbability: risk.default_probability,
    }));

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow", { company: companyRes.data.name })}
        title={t("title")}
        description={t("description")}
      />

      {/* Grid del prototipo (1fr 1.4fr): matriz + asignación del catálogo. */}
      <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
        <RiskMatrix risks={matrixRisks} />
        <AssignRiskForm companyId={id} options={options} />
      </div>

      <div className="mt-16">
        <RisksTable companyId={id} risks={assigned} />
      </div>
    </>
  );
}
