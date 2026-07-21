"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";

/**
 * Resolución de brechas por el cliente (sub-proyecto #6): marcar una brecha
 * del diagnóstico activo como resuelta (o reabrirla si fue un error).
 *
 * Doctrina de mutaciones del proyecto: Zod ANTES de tocar datos; verificación
 * de sesión y de pertenencia en la action. La PERTENENCIA se verifica leyendo
 * la brecha con el cliente del usuario (la RLS de diagnosis_breaches solo
 * expone las filas de su empresa); la ESCRITURA va por service-role porque la
 * RLS de la tabla es de solo lectura para clientes (decisión del sub-proyecto
 * #1: el snapshot lo muta únicamente el servidor). audit_log después de la
 * mutación (best effort, mismo criterio que lib/actions/remediation.ts).
 */

export type ResolutionActionError =
  | "validation"
  | "unauthorized"
  | "not_found"
  | "unavailable";

export type ResolutionActionResult =
  | { ok: true }
  | { ok: false; error: ResolutionActionError };

const setResolutionSchema = z.object({
  breachId: z.uuid(),
  resolved: z.boolean(),
});

export async function setBreachResolution(
  input: unknown,
): Promise<ResolutionActionResult> {
  const parsed = setResolutionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { breachId, resolved } = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    // Gate de pagado (mismo criterio que el resto del portal).
    const { data: company } = await supabase
      .from("company_client_view")
      .select("service_paid_at")
      .maybeSingle();
    if (!company?.service_paid_at) return { ok: false, error: "unauthorized" };

    // Pertenencia vía RLS: si la brecha no es de su empresa, no existe para él.
    const { data: breach } = await supabase
      .from("diagnosis_breaches")
      .select("id, breach_code, resolution_status")
      .eq("id", breachId)
      .maybeSingle();
    if (!breach) return { ok: false, error: "not_found" };

    const nextStatus = resolved ? "resolved" : "open";
    if (breach.resolution_status === nextStatus) return { ok: true };

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("diagnosis_breaches")
      .update({
        resolution_status: nextStatus,
        resolved_at: resolved ? new Date().toISOString() : null,
      })
      .eq("id", breachId);
    if (updateError) {
      console.error("[portal] setBreachResolution update falló:", updateError.message);
      return { ok: false, error: "unavailable" };
    }

    const { error: auditError } = await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "diagnosis.breach_resolution_changed",
      entity: "diagnosis_breaches",
      entity_id: breachId,
      detail: { breach_code: breach.breach_code, resolution_status: nextStatus },
    });
    if (auditError) {
      console.error("[portal] audit_log de resolución falló:", auditError.message);
    }

    revalidatePath("/portal/evaluaciones");
    revalidatePath(`/portal/evaluaciones/${breachId}`);
    revalidatePath("/portal");
    return { ok: true };
  } catch (cause) {
    console.error("[portal] setBreachResolution falló:", cause);
    return { ok: false, error: "unavailable" };
  }
}
