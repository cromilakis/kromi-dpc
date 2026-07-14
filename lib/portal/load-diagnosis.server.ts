import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface DiagnosisBreachRow {
  id: string;
  breachCode: string;
  area: string;
  areaLabel: string;
  severity: string;
  articles: string[];
  fineMinUtm: number | null;
  fineMaxUtm: number | null;
  description: string;
}

export interface ClientDiagnosis {
  paid: boolean;
  diagnosisId: string | null;
  breaches: DiagnosisBreachRow[];
}

const SEVERITY_ORDER: Record<string, number> = {
  critico: 0,
  alto: 1,
  medio: 2,
  bajo: 3,
};

function mapBreach(row: {
  id: string;
  breach_code: string;
  area: string;
  area_label: string;
  severity: string;
  articles: string[] | null;
  fine_min_utm: number | null;
  fine_max_utm: number | null;
  description: string;
}): DiagnosisBreachRow {
  return {
    id: row.id,
    breachCode: row.breach_code,
    area: row.area,
    areaLabel: row.area_label,
    severity: row.severity,
    articles: row.articles ?? [],
    fineMinUtm: row.fine_min_utm,
    fineMaxUtm: row.fine_max_utm,
    description: row.description,
  };
}

/** Diagnóstico activo del cliente + brechas, gated a pagado. RLS acota a su empresa. */
export async function loadClientDiagnosis(): Promise<ClientDiagnosis> {
  try {
    const supabase = await createClient();

    const { data: company } = await supabase
      .from("company_client_view")
      .select("service_paid_at")
      .maybeSingle();
    const paid = Boolean(company?.service_paid_at);
    if (!paid) return { paid: false, diagnosisId: null, breaches: [] };

    const { data: diagnosis } = await supabase
      .from("company_diagnoses")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!diagnosis) return { paid: true, diagnosisId: null, breaches: [] };

    const { data: rows } = await supabase
      .from("diagnosis_breaches")
      .select(
        "id, breach_code, area, area_label, severity, articles, fine_min_utm, fine_max_utm, description",
      )
      .eq("diagnosis_id", diagnosis.id);

    const breaches = (rows ?? [])
      .map(mapBreach)
      .sort(
        (a, b) =>
          (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
          a.areaLabel.localeCompare(b.areaLabel),
      );

    return { paid: true, diagnosisId: diagnosis.id, breaches };
  } catch {
    return { paid: false, diagnosisId: null, breaches: [] };
  }
}

/** Una brecha por id (del diagnóstico activo, pagado). null si no aplica. */
export async function loadClientBreach(
  breachId: string,
): Promise<DiagnosisBreachRow | null> {
  const { breaches } = await loadClientDiagnosis();
  return breaches.find((b) => b.id === breachId) ?? null;
}
