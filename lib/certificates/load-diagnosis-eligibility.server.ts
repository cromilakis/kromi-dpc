import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  computeDiagnosisEligibility,
  type DiagnosisEligibilityResult,
  type EligibilityBreach,
} from "./diagnosis-eligibility.server";

/**
 * Carga la elegibilidad de certificación desde el diagnóstico activo
 * (modelo nuevo). Compartido por la página de certificación (display) y por
 * las actions issue/revalidate (re-chequeo autoritativo antes de emitir).
 *
 * Autorización: verifica rol consultant/admin con el cliente del caller y
 * lee por service-role (las RLS de company_diagnoses/diagnosis_breaches solo
 * exponen SELECT al cliente de la propia empresa — mismo patrón que
 * loadCompanyReportData).
 */

export interface CompanyDiagnosisEligibility {
  diagnosis: { id: string; source: string; createdAt: string } | null;
  result: DiagnosisEligibilityResult;
}

export async function loadCompanyDiagnosisEligibility(
  companyId: string,
): Promise<CompanyDiagnosisEligibility> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión requerida para calcular elegibilidad.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "consultant" && profile.role !== "admin")) {
    throw new Error("Rol consultor requerido para calcular elegibilidad.");
  }

  const admin = createAdminClient();
  const { data: diagnosis, error: diagnosisError } = await admin
    .from("company_diagnoses")
    .select("id, source, created_at")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (diagnosisError) {
    throw new Error(
      `No fue posible cargar el diagnóstico activo: ${diagnosisError.message}`,
    );
  }
  if (!diagnosis) {
    return { diagnosis: null, result: computeDiagnosisEligibility(null) };
  }

  const { data: rows, error: breachesError } = await admin
    .from("diagnosis_breaches")
    .select("breach_code, area_label, severity, resolution_status")
    .eq("diagnosis_id", diagnosis.id);
  if (breachesError) {
    throw new Error(
      `No fue posible cargar las brechas del diagnóstico: ${breachesError.message}`,
    );
  }

  const breaches: EligibilityBreach[] = (rows ?? []).map((row) => ({
    breachCode: row.breach_code,
    areaLabel: row.area_label,
    severity: row.severity,
    resolutionStatus: row.resolution_status,
  }));

  return {
    diagnosis: {
      id: diagnosis.id,
      source: diagnosis.source,
      createdAt: diagnosis.created_at,
    },
    result: computeDiagnosisEligibility(breaches),
  };
}
