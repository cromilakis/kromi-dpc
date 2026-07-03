"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatRut } from "@/lib/companies/rut";
import {
  createCompanySchema,
  updateCompanyPhaseSchema,
} from "@/lib/companies/schema";
import { computeCompanyScore } from "@/lib/companies/scoring.server";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions del módulo empresas (spec "empresas", risk high).
 * Doctrina en TODAS: "use server" + Zod ANTES de tocar datos, verificación de
 * sesión en la action (defensa en profundidad además de RLS, que ya restringe
 * a consultores) e insert en audit_log en toda mutación sensible.
 *
 * Sin transacciones (supabase-js no las expone): el alta es una secuencia
 * empresa → evaluación ciclo 1 → controles pending → audit. Si un paso
 * intermedio falla se loggea, se devuelve "unavailable" y la empresa puede
 * quedar creada sin evaluación (el detalle tolera ese estado); un reintento
 * con el mismo RUT devuelve "rutTaken", que guía al listado.
 */

/** Código de violación de unicidad de Postgres (companies.rut unique). */
const PG_UNIQUE_VIOLATION = "23505";

export type CompanyActionError =
  | "validation"
  | "session"
  | "rutTaken"
  | "unavailable";

export type CreateCompanyResult = { ok: false; error: CompanyActionError };

/**
 * Alta de empresa (wizard /app/empresas/nueva): inserta la empresa con su
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

  // El catálogo de rubros vive en la base: el código enviado debe existir y
  // de ahí sale el multiplicador (fuente de verdad, no duplicado en código).
  const { data: sector, error: sectorError } = await supabase
    .from("sectors")
    .select("id, code, complexity_multiplier")
    .eq("code", data.sectorCode)
    .maybeSingle();
  if (sectorError) {
    console.error("[companies] lectura de sector falló:", sectorError.message);
    return { ok: false, error: "unavailable" };
  }
  if (!sector) return { ok: false, error: "validation" };

  // Complexity Score interno (server-only, RFC §14.3).
  const score = computeCompanyScore({
    sizeTier: data.sizeTier,
    sectorMultiplier: sector.complexity_multiplier,
    factors: data.factors,
  });

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name: data.name,
      rut: formatRut(data.rut),
      sector_id: sector.id,
      size_tier: data.sizeTier,
      employees_count: data.employeesCount,
      phase: "diagnostico",
      complexity_score: score.score,
      contact: {
        name: data.contactName,
        email: data.contactEmail ?? null,
        phone: data.contactPhone ?? null,
      },
    })
    .select("id")
    .single();
  if (companyError || !company) {
    if (companyError?.code === PG_UNIQUE_VIOLATION) {
      return { ok: false, error: "rutTaken" };
    }
    console.error("[companies] insert de empresa falló:", companyError?.message);
    return { ok: false, error: "unavailable" };
  }

  // Controles aplicables al rubro: transversales (sector_scope null) + los
  // de la vertical del sector. sector.code viene de la base (no del cliente).
  const { data: controls, error: controlsError } = await supabase
    .from("controls")
    .select("id")
    .or(`sector_scope.is.null,sector_scope.cs.{${sector.code}}`);

  let controlsSeeded = 0;
  if (controlsError || !controls) {
    console.error(
      "[companies] lectura de controles falló:",
      controlsError?.message,
    );
    return { ok: false, error: "unavailable" };
  }

  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .insert({ company_id: company.id, cycle: 1 })
    .select("id")
    .single();
  if (assessmentError || !assessment) {
    console.error(
      "[companies] insert de evaluación falló:",
      assessmentError?.message,
    );
    return { ok: false, error: "unavailable" };
  }

  if (controls.length > 0) {
    const { error: seedError } = await supabase.from("assessment_controls").insert(
      controls.map((control) => ({
        assessment_id: assessment.id,
        control_id: control.id,
        // status 'pending' por default de la columna.
      })),
    );
    if (seedError) {
      console.error(
        "[companies] seed de assessment_controls falló:",
        seedError.message,
      );
      return { ok: false, error: "unavailable" };
    }
    controlsSeeded = controls.length;
  }

  // Rastro de auditoría (mutación sensible). Si falla, la mutación ya ocurrió:
  // se loggea y no se interrumpe el flujo (limitación aceptada sin transacción).
  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "company.created",
    entity: "companies",
    entity_id: company.id,
    detail: {
      name: data.name,
      rut: formatRut(data.rut),
      sector_code: sector.code,
      size_tier: data.sizeTier,
      factors: [...data.factors],
      complexity_score: score.score,
      score_tier: score.scoreTier,
      assessment_cycle: 1,
      controls_seeded: controlsSeeded,
    },
  });
  if (auditError) {
    console.error("[companies] audit company.created falló:", auditError.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/empresas");
  redirect(`/app/empresas/${company.id}`);
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
  revalidatePath("/app/empresas");
  revalidatePath(`/app/empresas/${company.id}`, "layout");
  return { ok: true };
}

// NOTA: updateCompany (edición parcial de la ficha) se eliminó: no existía UI
// que la consumiera y toda función exportada desde un archivo "use server"
// queda expuesta como endpoint activo. Reintroducirla junto con el formulario
// de edición de ficha (con su schema en lib/companies/schema.ts y sus claves
// i18n de error).
