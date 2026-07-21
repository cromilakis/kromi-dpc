import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  loadClientDiagnosis,
  type DiagnosisBreachRow,
} from "@/lib/portal/load-diagnosis.server";
import type { ReportResult } from "./report-http";

const SEVERITY_ORDER: Record<string, number> = { critico: 0, alto: 1, medio: 2, bajo: 3 };

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
  resolution_status: string;
  resolved_at: string | null;
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
    resolutionStatus: row.resolution_status,
    resolvedAt: row.resolved_at,
  };
}

function sortBreaches(rows: DiagnosisBreachRow[]): DiagnosisBreachRow[] {
  return rows.sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      a.areaLabel.localeCompare(b.areaLabel),
  );
}

/** Informe del CLIENTE: sesión + pago + diagnóstico activo (RLS acota a su empresa). */
export async function loadClientReportData(): Promise<ReportResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: company } = await supabase
      .from("company_client_view")
      .select("name, rut, service_paid_at")
      .maybeSingle();
    if (!company) return { ok: false, error: "unauthorized" };
    if (!company.service_paid_at) return { ok: false, error: "no_paid" };

    const { diagnosisId, breaches } = await loadClientDiagnosis();
    if (!diagnosisId) return { ok: false, error: "not_found" };

    const { data: diag } = await supabase
      .from("company_diagnoses")
      .select("risk_level, total_breaches")
      .eq("id", diagnosisId)
      .maybeSingle();

    return {
      ok: true,
      data: {
        companyName: company.name ?? "",
        rut: company.rut ?? "",
        riskLevel: diag?.risk_level ?? "",
        totalBreaches: diag?.total_breaches ?? breaches.length,
        breaches,
      },
    };
  } catch (cause) {
    console.error("[documents] loadClientReportData falló:", cause);
    return { ok: false, error: "unavailable" };
  }
}

/** Informe para el CONSULTOR: verifica rol y lee por service-role (sin RLS de diagnóstico). */
export async function loadCompanyReportData(companyId: string): Promise<ReportResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile || (profile.role !== "consultant" && profile.role !== "admin")) {
      return { ok: false, error: "unauthorized" };
    }

    const admin = createAdminClient();
    const { data: company } = await admin
      .from("companies")
      .select("name, rut")
      .eq("id", companyId)
      .maybeSingle();
    if (!company) return { ok: false, error: "not_found" };

    const { data: diagnosis } = await admin
      .from("company_diagnoses")
      .select("id, risk_level, total_breaches")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!diagnosis) return { ok: false, error: "not_found" };

    const { data: rows } = await admin
      .from("diagnosis_breaches")
      .select(
        "id, breach_code, area, area_label, severity, articles, fine_min_utm, fine_max_utm, description, resolution_status, resolved_at",
      )
      .eq("diagnosis_id", diagnosis.id);

    return {
      ok: true,
      data: {
        companyName: company.name,
        rut: company.rut,
        riskLevel: diagnosis.risk_level,
        totalBreaches: diagnosis.total_breaches,
        breaches: sortBreaches((rows ?? []).map(mapBreach)),
      },
    };
  } catch (cause) {
    console.error("[documents] loadCompanyReportData falló:", cause);
    return { ok: false, error: "unavailable" };
  }
}
