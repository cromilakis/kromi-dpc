import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { PageHeader } from "@/components/app/shell";
import { CreateTaskForm } from "@/components/plan/create-task-form";
import { PlanTable, type PlanTaskRow } from "@/components/plan/plan-table";
import { Card, ProgressBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

/**
 * Plan de adecuación (/app/empresas/[id]/plan) — spec plan-adecuacion,
 * prototipo §1.4.9: summary-cards (total/completadas/en curso/pendientes) +
 * progreso del plan (ProgressBar) + tabla de tareas ordenada por vencimiento
 * (estado ciclable con audit_log) + crear tarea manual. Server component:
 * cliente AUTENTICADO (RLS autoriza consultores); estados de carga
 * (loading.tsx), vacío (tabla) y error (throw → app/app/error.tsx).
 */

const companyIdSchema = z.uuid();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.plan.meta");
  return { title: t("title") };
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // id que no es UUID (URL manipulada) → 404 sin tocar la base.
  if (!companyIdSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [t, companyRes, itemsRes] = await Promise.all([
    getTranslations("app.plan"),
    supabase.from("companies").select("name").eq("id", id).maybeSingle(),
    supabase
      .from("remediation_items")
      .select("id, title, responsible, due_date, status, solution_catalog ( title )")
      .eq("company_id", id)
      // Orden por vencimiento (spec); las tareas sin fecha van al final.
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);

  // Falla de lectura → error boundary del shell (estado de error de la vista).
  if (companyRes.error) {
    throw new Error(`No fue posible cargar la empresa: ${companyRes.error.message}`);
  }
  if (!companyRes.data) notFound();
  if (itemsRes.error) {
    throw new Error(
      `No fue posible cargar el plan de adecuación: ${itemsRes.error.message}`,
    );
  }

  const tasks: PlanTaskRow[] = (itemsRes.data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    solutionTitle: item.solution_catalog?.title ?? null,
    responsible: item.responsible,
    dueDate: item.due_date,
    status: item.status,
  }));

  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  const inProgress = tasks.filter((task) => task.status === "in_progress").length;
  const pending = total - done - inProgress;

  // 4 summary-cards del prototipo (§1.4.9): valor 28px/600 + label 12px.
  const summary = [
    { key: "total", value: total },
    { key: "done", value: done },
    { key: "inProgress", value: inProgress },
    { key: "pending", value: pending },
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow", { company: companyRes.data.name })}
        title={t("title")}
        description={t("description")}
      />

      <div className="grid grid-cols-2 gap-16 md:grid-cols-4">
        {summary.map((stat) => (
          <Card key={stat.key}>
            <p className="text-caption leading-caption tracking-caption text-carbon">
              {t(`summary.${stat.key}`)}
            </p>
            <p className="mt-4 text-heading-sm font-semibold leading-heading-sm tracking-heading-sm text-ink">
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <Card className="mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-8">
          <h2
            id="plan-progress-title"
            className="text-body-sm font-semibold leading-body-sm tracking-body-sm text-ink"
          >
            {t("progress.title")}
          </h2>
          <p className="text-caption leading-caption tracking-caption text-carbon">
            {t("progress.detail", { done, total })}
          </p>
        </div>
        <ProgressBar
          className="mt-12"
          value={done}
          max={total > 0 ? total : 1}
          aria-labelledby="plan-progress-title"
        />
      </Card>

      <div className="mt-16">
        <PlanTable companyId={id} tasks={tasks} />
      </div>

      <div className="mt-16">
        <CreateTaskForm companyId={id} />
      </div>
    </>
  );
}
