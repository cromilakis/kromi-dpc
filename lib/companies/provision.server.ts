import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatRut } from "@/lib/companies/rut";
import { computeCompanyScore } from "@/lib/companies/scoring.server";
import type { ComplexityFactor, SizeTier } from "@/lib/companies/schema";
import type { Database, Json } from "@/lib/supabase/types";

/**
 * Núcleo reutilizable del alta de empresa (extraído de `createCompany`,
 * `lib/actions/companies.ts`): inserta la empresa con su Complexity Score
 * calculado SOLO EN SERVIDOR, crea la evaluación ciclo 1 con
 * assessment_controls 'pending' para todos los controles aplicables al rubro
 * (sector_scope null = transversal, o que incluya el sector).
 *
 * Acepta cliente autenticado (consultor, RLS) o admin (service-role, flujo
 * de aprovisionamiento post-pago): quien llama decide el cliente y hace las
 * cosas que dependen de la sesión (audit_log con actor, redirect).
 *
 * Sin transacciones (supabase-js no las expone): el alta es una secuencia
 * empresa → evaluación ciclo 1 → controles pending. Si un paso intermedio
 * falla se loggea y se devuelve "unavailable"; la empresa puede quedar
 * creada sin evaluación (el detalle tolera ese estado) y un reintento con el
 * mismo RUT devuelve "rutTaken".
 */

/** Código de violación de unicidad de Postgres (companies.rut unique). */
const PG_UNIQUE_VIOLATION = "23505";

export interface ProvisionCompanyParams {
  name: string;
  rut: string;
  sectorCode: string;
  sizeTier: SizeTier;
  factors: ComplexityFactor[];
  contact: { name: string; email: string | null; phone: string | null };
  preliminaryPanorama?: unknown;
}

export type ProvisionCompanyResult =
  | { ok: true; companyId: string }
  | { ok: false; error: "rutTaken" | "validation" | "unavailable" };

/** Inserta empresa + evaluación ciclo 1 + assessment_controls pending. Acepta
 *  cliente autenticado (consultor, RLS) o admin (service-role). */
export async function provisionCompany(
  client: SupabaseClient<Database>,
  params: ProvisionCompanyParams,
): Promise<ProvisionCompanyResult> {
  // El catálogo de rubros vive en la base: el código enviado debe existir y
  // de ahí sale el multiplicador (fuente de verdad, no duplicado en código).
  const { data: sector, error: sectorError } = await client
    .from("sectors")
    .select("id, code, complexity_multiplier")
    .eq("code", params.sectorCode)
    .maybeSingle();
  if (sectorError) {
    console.error("[companies] lectura de sector falló:", sectorError.message);
    return { ok: false, error: "unavailable" };
  }
  if (!sector) return { ok: false, error: "validation" };

  // Complexity Score interno (server-only, RFC §14.3).
  const score = computeCompanyScore({
    sizeTier: params.sizeTier,
    sectorMultiplier: sector.complexity_multiplier,
    factors: params.factors,
  });

  const { data: company, error: companyError } = await client
    .from("companies")
    .insert({
      name: params.name,
      rut: formatRut(params.rut),
      sector_id: sector.id,
      size_tier: params.sizeTier,
      phase: "diagnostico",
      complexity_score: score.score,
      factors: [...params.factors],
      contact: {
        name: params.contact.name,
        email: params.contact.email ?? null,
        phone: params.contact.phone ?? null,
      },
      preliminary_panorama: (params.preliminaryPanorama ?? null) as Json | null,
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
  const { data: controls, error: controlsError } = await client
    .from("controls")
    .select("id")
    .or(`sector_scope.is.null,sector_scope.cs.{${sector.code}}`);

  if (controlsError || !controls) {
    console.error(
      "[companies] lectura de controles falló:",
      controlsError?.message,
    );
    return { ok: false, error: "unavailable" };
  }

  const { data: assessment, error: assessmentError } = await client
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
    const { error: seedError } = await client.from("assessment_controls").insert(
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
  }

  return { ok: true, companyId: company.id };
}
