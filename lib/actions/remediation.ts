"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Database, Json } from "../supabase/types";
import { createClient } from "../supabase/server";

/**
 * Server actions del plan de adecuación (spec plan-adecuacion, doctrina risk
 * high): Zod ANTES de tocar datos; verificación de sesión en la action
 * (defensa en profundidad además de RLS); audit_log en toda mutación —
 * en particular 'remediation.status_changed' al editar el estado de una tarea.
 *
 * Misma decisión que lib/actions/risks.ts: sin transacciones en supabase-js,
 * el audit_log se inserta DESPUÉS de la mutación (best effort con
 * console.error; Sentry llega en Connect).
 */

export type RemediationActionError =
  | "validation"
  | "unauthorized"
  | "conflict"
  | "not_found"
  | "unavailable";

export type RemediationActionResult =
  | { ok: true }
  | { ok: false; error: RemediationActionError };

type RemediationStatus = Database["public"]["Enums"]["remediation_status"];

const statusSchema = z.enum(["pending", "in_progress", "done"] as const satisfies readonly RemediationStatus[]);

const addToPlanSchema = z.object({
  companyId: z.uuid(),
  solutionId: z.uuid(),
});

const createItemSchema = z.object({
  companyId: z.uuid(),
  title: z.string().trim().min(1).max(300),
  responsible: z.string().trim().max(200).optional(),
  /** Fecha ISO (YYYY-MM-DD) del input type="date". */
  dueDate: z.iso.date().optional(),
});

const updateStatusSchema = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  status: statusSchema,
});

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getSessionUserId(supabase: SupabaseServerClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function writeAudit(
  supabase: SupabaseServerClient,
  entry: {
    actorId: string;
    action: string;
    entityId: string;
    /** Objeto JSON-compatible (columna jsonb audit_log.detail). */
    detail: { [key: string]: Json | undefined };
  },
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity: "remediation_items",
    entity_id: entry.entityId,
    detail: entry.detail,
  });
  if (error) {
    console.error(`[remediation] audit_log (${entry.action}) falló:`, error.message);
  }
}

/**
 * Agrega una solución del catálogo al plan de la empresa como tarea
 * (remediation_item vinculado por solution_id, título de la solución).
 */
export async function addToPlan(input: unknown): Promise<RemediationActionResult> {
  const parsed = addToPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false, error: "unauthorized" };

  const { companyId, solutionId } = parsed.data;

  // La solución debe existir en el catálogo (el título nombra la tarea).
  const { data: solution, error: solutionError } = await supabase
    .from("solution_catalog")
    .select("id, title")
    .eq("id", solutionId)
    .maybeSingle();
  if (solutionError) {
    console.error("[remediation] addToPlan (catálogo) falló:", solutionError.message);
    return { ok: false, error: "unavailable" };
  }
  if (!solution) return { ok: false, error: "not_found" };

  // Sin unique (company_id, solution_id) en BD: dedupe explícito para no
  // duplicar la misma solución en el plan (carrera residual aceptada).
  const { data: duplicated, error: dupError } = await supabase
    .from("remediation_items")
    .select("id")
    .eq("company_id", companyId)
    .eq("solution_id", solutionId)
    .limit(1);
  if (dupError) {
    console.error("[remediation] addToPlan (dedupe) falló:", dupError.message);
    return { ok: false, error: "unavailable" };
  }
  if (duplicated && duplicated.length > 0) return { ok: false, error: "conflict" };

  const { data, error } = await supabase
    .from("remediation_items")
    .insert({
      company_id: companyId,
      title: solution.title,
      solution_id: solutionId,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "42501") return { ok: false, error: "unauthorized" };
    console.error("[remediation] addToPlan falló:", error?.message);
    return { ok: false, error: "unavailable" };
  }

  await writeAudit(supabase, {
    actorId: userId,
    action: "remediation.item_added",
    entityId: data.id,
    detail: {
      company_id: companyId,
      source: "catalog",
      solution_id: solutionId,
      title: solution.title,
    },
  });

  revalidatePath(`/app/empresas/${companyId}/plan`);
  revalidatePath(`/app/empresas/${companyId}/soluciones`);
  return { ok: true };
}

/** Crea una tarea manual del plan (título, responsable y vencimiento). */
export async function createRemediationItem(
  input: unknown,
): Promise<RemediationActionResult> {
  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false, error: "unauthorized" };

  const { companyId, title, responsible, dueDate } = parsed.data;
  const { data, error } = await supabase
    .from("remediation_items")
    .insert({
      company_id: companyId,
      title,
      responsible: responsible || null,
      due_date: dueDate ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "42501") return { ok: false, error: "unauthorized" };
    console.error("[remediation] createRemediationItem falló:", error?.message);
    return { ok: false, error: "unavailable" };
  }

  await writeAudit(supabase, {
    actorId: userId,
    action: "remediation.item_added",
    entityId: data.id,
    detail: {
      company_id: companyId,
      source: "manual",
      title,
      responsible: responsible || null,
      due_date: dueDate ?? null,
    },
  });

  revalidatePath(`/app/empresas/${companyId}/plan`);
  return { ok: true };
}

/**
 * Edita el estado de una tarea (pending / in_progress / done) — mutación
 * sensible del ciclo: audit_log 'remediation.status_changed' con from/to.
 */
export async function updateRemediationStatus(
  input: unknown,
): Promise<RemediationActionResult> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false, error: "unauthorized" };

  const { id, companyId, status } = parsed.data;

  // Estado previo para el detail del audit_log (y 404 temprano).
  const { data: existing, error: readError } = await supabase
    .from("remediation_items")
    .select("status, title")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (readError) {
    console.error(
      "[remediation] updateRemediationStatus (lectura previa) falló:",
      readError.message,
    );
    return { ok: false, error: "unavailable" };
  }
  if (!existing) return { ok: false, error: "not_found" };

  const { data, error } = await supabase
    .from("remediation_items")
    .update({ status })
    .eq("id", id)
    .eq("company_id", companyId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return { ok: false, error: "unauthorized" };
    console.error("[remediation] updateRemediationStatus falló:", error.message);
    return { ok: false, error: "unavailable" };
  }
  if (!data) return { ok: false, error: "not_found" };

  await writeAudit(supabase, {
    actorId: userId,
    action: "remediation.status_changed",
    entityId: id,
    detail: {
      company_id: companyId,
      title: existing.title,
      from: existing.status,
      to: status,
    },
  });

  revalidatePath(`/app/empresas/${companyId}/plan`);
  return { ok: true };
}
