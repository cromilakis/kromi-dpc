"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Json } from "../supabase/types";
import { createClient } from "../supabase/server";

/**
 * Server actions del módulo Riesgos & Gap (spec riesgos-gap, doctrina risk
 * high): Zod ANTES de tocar datos; verificación de sesión en la action
 * (defensa en profundidad — RLS ya restringe a consultores); audit_log en
 * TODA mutación (asignar/editar/quitar riesgo de una empresa).
 *
 * Decisión documentada: supabase-js no expone transacciones, por lo que el
 * rastro de auditoría se inserta DESPUÉS de la mutación (best effort). Si el
 * insert de audit_log falla se registra en consola (Sentry llega en Connect)
 * sin revertir la mutación ya aplicada.
 */

export type RiskActionError =
  | "validation"
  | "unauthorized"
  | "conflict"
  | "not_found"
  | "unavailable";

export type RiskActionResult = { ok: true } | { ok: false; error: RiskActionError };

/** Escala 1–5 de la matriz (check de BD: impact/probability between 1 and 5). */
const scaleSchema = z.number().int().min(1).max(5);

const assignRiskSchema = z.object({
  companyId: z.uuid(),
  riskId: z.uuid(),
  impact: scaleSchema,
  probability: scaleSchema,
  notes: z.string().trim().max(2000).optional(),
});

const updateRiskSchema = z.object({
  /** id de la fila company_risks (no del catálogo). */
  id: z.uuid(),
  companyId: z.uuid(),
  impact: scaleSchema,
  probability: scaleSchema,
  notes: z.string().trim().max(2000).optional(),
});

const removeRiskSchema = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
});

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Sesión verificada en la action (además del middleware y de RLS). */
async function getSessionUserId(supabase: SupabaseServerClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Inserta el rastro en audit_log (best effort, ver decisión de cabecera). */
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
    entity: "company_risks",
    entity_id: entry.entityId,
    detail: entry.detail,
  });
  if (error) {
    console.error(`[risks] audit_log (${entry.action}) falló:`, error.message);
  }
}

/** Asigna un riesgo del catálogo a la empresa con impacto/probabilidad 1–5. */
export async function assignRisk(input: unknown): Promise<RiskActionResult> {
  const parsed = assignRiskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false, error: "unauthorized" };

  const { companyId, riskId, impact, probability, notes } = parsed.data;
  const { data, error } = await supabase
    .from("company_risks")
    .insert({
      company_id: companyId,
      risk_id: riskId,
      impact,
      probability,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    // 23505 = unique (company_id, risk_id): ya estaba asignado.
    if (error?.code === "23505") return { ok: false, error: "conflict" };
    // 42501 = RLS/privilegios: usuario autenticado fuera del allowlist.
    if (error?.code === "42501") return { ok: false, error: "unauthorized" };
    console.error("[risks] assignRisk falló:", error?.message);
    return { ok: false, error: "unavailable" };
  }

  await writeAudit(supabase, {
    actorId: userId,
    action: "risk.assigned",
    entityId: data.id,
    detail: { company_id: companyId, risk_id: riskId, impact, probability },
  });

  revalidatePath(`/app/empresas/${companyId}/riesgos`);
  return { ok: true };
}

/** Actualiza impacto/probabilidad (y notas) de un riesgo ya asignado. */
export async function updateRisk(input: unknown): Promise<RiskActionResult> {
  const parsed = updateRiskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false, error: "unauthorized" };

  const { id, companyId, impact, probability, notes } = parsed.data;

  // Valores previos para el detail del audit_log (y 404 temprano).
  const { data: existing, error: readError } = await supabase
    .from("company_risks")
    .select("impact, probability, risk_id")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (readError) {
    console.error("[risks] updateRisk (lectura previa) falló:", readError.message);
    return { ok: false, error: "unavailable" };
  }
  if (!existing) return { ok: false, error: "not_found" };

  const { data, error } = await supabase
    .from("company_risks")
    .update({
      impact,
      probability,
      ...(notes !== undefined ? { notes: notes || null } : {}),
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return { ok: false, error: "unauthorized" };
    console.error("[risks] updateRisk falló:", error.message);
    return { ok: false, error: "unavailable" };
  }
  if (!data) return { ok: false, error: "not_found" };

  await writeAudit(supabase, {
    actorId: userId,
    action: "risk.updated",
    entityId: id,
    detail: {
      company_id: companyId,
      risk_id: existing.risk_id,
      from: { impact: existing.impact, probability: existing.probability },
      to: { impact, probability },
    },
  });

  revalidatePath(`/app/empresas/${companyId}/riesgos`);
  return { ok: true };
}

/** Quita un riesgo asignado (borrado — mutación sensible, siempre auditada). */
export async function removeRisk(input: unknown): Promise<RiskActionResult> {
  const parsed = removeRiskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false, error: "unauthorized" };

  const { id, companyId } = parsed.data;
  const { data, error } = await supabase
    .from("company_risks")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .select("risk_id, impact, probability")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") return { ok: false, error: "unauthorized" };
    console.error("[risks] removeRisk falló:", error.message);
    return { ok: false, error: "unavailable" };
  }
  if (!data) return { ok: false, error: "not_found" };

  await writeAudit(supabase, {
    actorId: userId,
    action: "risk.removed",
    entityId: id,
    detail: {
      company_id: companyId,
      risk_id: data.risk_id,
      impact: data.impact,
      probability: data.probability,
    },
  });

  revalidatePath(`/app/empresas/${companyId}/riesgos`);
  return { ok: true };
}
