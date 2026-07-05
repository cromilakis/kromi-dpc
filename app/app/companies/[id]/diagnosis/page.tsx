import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { PageHeader } from "@/components/app/shell";
import { DiagnosisManager } from "@/components/interview/diagnosis-manager";
import { StatusBadge } from "@/components/ui";
import type { AppliesWhen } from "@/lib/interview/applicability";
import { buildComplianceQuestions, type ControlLike } from "@/lib/interview/questions";
import { createClient } from "@/lib/supabase/server";

/**
 * /app/companies/[id]/diagnosis — Entrevista de diagnóstico (spec
 * diagnóstico, risk high: alimenta el checklist y la elegibilidad de
 * certificación). Server component: carga la empresa, el assessment
 * ACTIVO (status 'open' del ciclo mayor, mismo criterio que checklist), el
 * catálogo de controles con `verification_criteria` (ordenado por dominio y
 * control, igual que el checklist) y la sesión de entrevista más reciente de
 * la empresa (si existe). Toda la interacción (RAT, respuestas de
 * cumplimiento, autoguardado, enlace de autodiagnóstico, materializar) vive
 * en el client component `DiagnosisManager`. Datos con el cliente
 * AUTENTICADO (RLS autoriza consultores).
 */

const companyIdSchema = z.uuid();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.diagnosis.meta");
  return { title: t("title") };
}

export default async function DiagnosisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // id que no es UUID (URL manipulada) → 404 sin tocar la base.
  if (!companyIdSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [t, companyRes, assessmentRes, controlsRes, sessionRes] = await Promise.all([
    getTranslations("app.diagnosis"),
    supabase.from("companies").select("id, name, factors").eq("id", id).maybeSingle(),
    supabase
      .from("assessments")
      .select("id, cycle")
      .eq("company_id", id)
      .eq("status", "open")
      .order("cycle", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("controls")
      .select("code, name, domain_id, verification_criteria, applies_when, sort, domains ( sort )"),
    supabase
      .from("interview_sessions")
      .select("id, status, answers")
      .eq("company_id", id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (companyRes.error) {
    throw new Error(`No fue posible cargar la empresa: ${companyRes.error.message}`);
  }
  if (!companyRes.data) notFound();
  if (assessmentRes.error) {
    throw new Error(`No fue posible cargar la evaluación: ${assessmentRes.error.message}`);
  }
  if (controlsRes.error) {
    throw new Error(`No fue posible cargar los controles: ${controlsRes.error.message}`);
  }
  if (sessionRes.error) {
    throw new Error(`No fue posible cargar la sesión de diagnóstico: ${sessionRes.error.message}`);
  }

  // Orden canónico del catálogo (mismo criterio que el checklist): dominio →
  // control, ordenado en JS porque PostgREST no ordena por tabla embebida al
  // mismo tiempo que por la tabla base con este SDK.
  const orderedControlRows = [...(controlsRes.data ?? [])].sort(
    (a, b) => (a.domains?.sort ?? 0) - (b.domains?.sort ?? 0) || a.sort - b.sort,
  );
  const controls: ControlLike[] = orderedControlRows.map((row) => ({
    code: row.code,
    name: row.name,
    domain_id: row.domain_id,
    verification_criteria: row.verification_criteria,
    // jsonb crudo de la base: null = siempre aplica; { factors_any: [...] } =
    // aplica solo si la empresa declaró alguno de esos factores (Tarea 3).
    appliesWhen: (row.applies_when as AppliesWhen) ?? null,
  }));
  const questions = buildComplianceQuestions(controls);

  const session = sessionRes.data;

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow", { company: companyRes.data.name })}
        title={t("title")}
        description={t("description")}
        actions={
          assessmentRes.data ? (
            <StatusBadge pill variant="neutral">
              {t("cycleBadge", { cycle: assessmentRes.data.cycle })}
            </StatusBadge>
          ) : undefined
        }
      />

      <DiagnosisManager
        companyId={companyRes.data.id}
        sessionId={session?.id ?? null}
        sessionStatus={session?.status ?? null}
        questions={questions}
        initialAnswers={session?.answers ?? null}
        companyFactors={companyRes.data.factors ?? []}
      />
    </>
  );
}
