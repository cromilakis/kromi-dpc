import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  computeEligibility,
  type EligibilityControl,
  type EligibilityResult,
} from "./eligibility.server";

/**
 * Carga la elegibilidad de certificación de una empresa desde la BD y la
 * evalúa con la lib pura (eligibility.server.ts). Compartido por la página
 * /app/empresas/[id]/certificacion (display) y por la action issueCertificate
 * (re-chequeo autoritativo antes de emitir — nunca se confía en el cliente).
 * Usa SIEMPRE el cliente AUTENTICADO del caller: RLS autoriza consultores.
 *
 * "Assessment activo" = el ciclo más reciente de la empresa (mayor `cycle`),
 * cualquiera sea su estado: es la última foto de cumplimiento disponible.
 */

export interface CompanyEligibility {
  assessment: {
    id: string;
    cycle: number;
    status: Database["public"]["Enums"]["assessment_status"];
  } | null;
  result: EligibilityResult;
}

export async function loadCompanyEligibility(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<CompanyEligibility> {
  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .select("id, cycle, status")
    .eq("company_id", companyId)
    .order("cycle", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assessmentError) {
    throw new Error(
      `No fue posible cargar el assessment activo: ${assessmentError.message}`,
    );
  }
  if (!assessment) {
    return { assessment: null, result: computeEligibility(null) };
  }

  const { data: rows, error: controlsError } = await supabase
    .from("assessment_controls")
    .select("status, controls ( code, domains ( code ) )")
    .eq("assessment_id", assessment.id);

  if (controlsError) {
    throw new Error(
      `No fue posible cargar los controles del assessment: ${controlsError.message}`,
    );
  }

  const controls: EligibilityControl[] = (rows ?? []).map((row) => ({
    controlCode: row.controls?.code ?? "",
    domainCode: row.controls?.domains?.code ?? "",
    status: row.status,
  }));

  return { assessment, result: computeEligibility(controls) };
}
