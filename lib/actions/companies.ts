"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatRut } from "@/lib/companies/rut";
import { provisionCompany } from "@/lib/companies/provision.server";
import {
  createCompanySchema,
  updateCompanyPhaseSchema,
} from "@/lib/companies/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions del módulo empresas (spec "empresas", risk high).
 * Doctrina en TODAS: "use server" + Zod ANTES de tocar datos, verificación de
 * sesión en la action (defensa en profundidad además de RLS, que ya restringe
 * a consultores) e insert en audit_log en toda mutación sensible.
 *
 * El alta (empresa → evaluación ciclo 1 → controles pending) vive en el
 * núcleo reutilizable `provisionCompany` (lib/companies/provision.server.ts,
 * también usado por el aprovisionamiento post-pago); esta action se limita a
 * validar, resolver la sesión, invocar el núcleo y dejar rastro de auditoría.
 */

export type CompanyActionError =
  | "validation"
  | "session"
  | "rutTaken"
  | "unavailable";

export type CreateCompanyResult = { ok: false; error: CompanyActionError };

/**
 * Alta de empresa (wizard /app/companies/new): inserta la empresa con su
 * Complexity Score calculado SOLO EN SERVIDOR, crea la evaluación ciclo 1 con
 * assessment_controls 'pending' para todos los controles aplicables al rubro
 * (sector_scope null = transversal, o que incluya el sector) y deja rastro en
 * audit_log. Redirige al detalle si todo sale bien.
 */
export async function createCompany(
  input: unknown,
): Promise<CreateCompanyResult> {
  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "session" };

  const result = await provisionCompany(supabase, {
    name: data.name,
    rut: data.rut,
    sectorCode: data.sectorCode,
    sizeTier: data.sizeTier,
    factors: data.factors,
    contact: {
      name: data.contactName,
      email: data.contactEmail ?? null,
      phone: data.contactPhone ?? null,
    },
  });
  if (!result.ok) return { ok: false, error: result.error };

  // Rastro de auditoría (mutación sensible). Si falla, la mutación ya ocurrió:
  // se loggea y no se interrumpe el flujo (limitación aceptada sin transacción).
  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "company.created",
    entity: "companies",
    entity_id: result.companyId,
    detail: {
      name: data.name,
      rut: formatRut(data.rut),
      sector_code: data.sectorCode,
      size_tier: data.sizeTier,
      factors: [...data.factors],
      assessment_cycle: 1,
    },
  });
  if (auditError) {
    console.error("[companies] audit company.created falló:", auditError.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/companies");
  redirect(`/app/companies/${result.companyId}`);
}

export type UpdatePhaseState =
  | { ok: true }
  | { ok: false; error: CompanyActionError }
  | null;

/**
 * Cambio de fase del ciclo de servicio (acción del resumen de empresa).
 * Firma (prevState, formData) para useActionState en el cliente.
 */
export async function updateCompanyPhase(
  _prevState: UpdatePhaseState,
  formData: FormData,
): Promise<UpdatePhaseState> {
  const parsed = updateCompanyPhaseSchema.safeParse({
    companyId: formData.get("companyId"),
    phase: formData.get("phase"),
  });
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "session" };

  // Se lee la fase vigente para dejar el "from" en el rastro de auditoría.
  const { data: company, error: readError } = await supabase
    .from("companies")
    .select("id, phase")
    .eq("id", parsed.data.companyId)
    .maybeSingle();
  if (readError) {
    console.error("[companies] lectura de empresa falló:", readError.message);
    return { ok: false, error: "unavailable" };
  }
  if (!company) return { ok: false, error: "validation" };
  if (company.phase === parsed.data.phase) return { ok: true };

  const { error: updateError } = await supabase
    .from("companies")
    .update({ phase: parsed.data.phase })
    .eq("id", company.id);
  if (updateError) {
    console.error("[companies] cambio de fase falló:", updateError.message);
    return { ok: false, error: "unavailable" };
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "company.phase_changed",
    entity: "companies",
    entity_id: company.id,
    detail: { from: company.phase, to: parsed.data.phase },
  });
  if (auditError) {
    console.error(
      "[companies] audit company.phase_changed falló:",
      auditError.message,
    );
  }

  revalidatePath("/app");
  revalidatePath("/app/companies");
  revalidatePath(`/app/companies/${company.id}`, "layout");
  return { ok: true };
}

// NOTA: updateCompany (edición parcial de la ficha) se eliminó: no existía UI
// que la consumiera y toda función exportada desde un archivo "use server"
// queda expuesta como endpoint activo. Reintroducirla junto con el formulario
// de edición de ficha (con su schema en lib/companies/schema.ts y sus claves
// i18n de error).
