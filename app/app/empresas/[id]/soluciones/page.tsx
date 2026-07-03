import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { PageHeader } from "@/components/app/shell";
import {
  SolutionCatalog,
  type SolutionCardData,
} from "@/components/solutions/solution-catalog";
import { createClient } from "@/lib/supabase/server";

/**
 * Catálogo de soluciones (/app/empresas/[id]/soluciones) — spec
 * plan-adecuacion, prototipo §1.4.8: cards por solución (título, descripción,
 * control relacionado si tiene) con filtro y acción "Agregar al plan"
 * (addToPlan crea el remediation_item vinculado). Server component: lee
 * solution_catalog + las soluciones ya presentes en el plan de la empresa
 * (cliente AUTENTICADO, RLS autoriza consultores).
 */

const companyIdSchema = z.uuid();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.solutions.meta");
  return { title: t("title") };
}

export default async function SolutionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // id que no es UUID (URL manipulada) → 404 sin tocar la base.
  if (!companyIdSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [t, companyRes, catalogRes, planRes] = await Promise.all([
    getTranslations("app.solutions"),
    supabase.from("companies").select("name").eq("id", id).maybeSingle(),
    supabase
      .from("solution_catalog")
      .select("id, title, description, tags, controls ( code, name )")
      .order("title"),
    supabase
      .from("remediation_items")
      .select("solution_id")
      .eq("company_id", id)
      .not("solution_id", "is", null),
  ]);

  // Falla de lectura → error boundary del shell (estado de error de la vista).
  if (companyRes.error) {
    throw new Error(`No fue posible cargar la empresa: ${companyRes.error.message}`);
  }
  if (!companyRes.data) notFound();
  if (catalogRes.error) {
    throw new Error(
      `No fue posible cargar el catálogo de soluciones: ${catalogRes.error.message}`,
    );
  }
  if (planRes.error) {
    throw new Error(
      `No fue posible cargar el plan de la empresa: ${planRes.error.message}`,
    );
  }

  const inPlan = new Set(
    (planRes.data ?? [])
      .map((item) => item.solution_id)
      .filter((solutionId): solutionId is string => solutionId !== null),
  );

  const solutions: SolutionCardData[] = (catalogRes.data ?? []).map((solution) => ({
    id: solution.id,
    title: solution.title,
    description: solution.description,
    tags: solution.tags,
    control: solution.controls
      ? { code: solution.controls.code, name: solution.controls.name }
      : null,
    inPlan: inPlan.has(solution.id),
  }));

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow", { company: companyRes.data.name })}
        title={t("title")}
        description={t("description")}
      />
      <SolutionCatalog companyId={id} solutions={solutions} />
    </>
  );
}
