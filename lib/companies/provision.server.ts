import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatRut } from "@/lib/companies/rut";
import { computeCompanyScore, type ScoreTier } from "@/lib/companies/scoring.server";
import type { ComplexityFactor, SizeTier } from "@/lib/companies/schema";
import type { Database, Json } from "@/lib/supabase/types";

/**
 * Núcleo reutilizable del alta de empresa (extraído de `createCompany`,
 * `lib/actions/companies.ts`): inserta la empresa con su Complexity Score
 * calculado SOLO EN SERVIDOR. Desde el sub-proyecto #8 el alta NO crea
 * evaluaciones: el cumplimiento vive en el diagnóstico persistido
 * (company_diagnoses), que se puebla con la encuesta (self-service o
 * asistida del consultor).
 *
 * Acepta cliente autenticado (consultor, RLS) o admin (service-role, flujo
 * de aprovisionamiento post-pago): quien llama decide el cliente y hace las
 * cosas que dependen de la sesión (audit_log con actor, redirect).
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
  | {
      ok: true;
      companyId: string;
      complexityScore: number;
      scoreTier: ScoreTier;
    }
  | { ok: false; error: "rutTaken" | "validation" | "unavailable" };

/** Inserta la empresa (sin evaluación: modelo nuevo, #8). Acepta cliente
 *  autenticado (consultor, RLS) o admin (service-role). */
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

  return {
    ok: true,
    companyId: company.id,
    complexityScore: score.score,
    scoreTier: score.scoreTier,
  };
}
