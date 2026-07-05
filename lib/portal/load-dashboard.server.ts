import "server-only";

import { createClient } from "@/lib/supabase/server";
import { checklistProgress } from "@/lib/companies/display";
import type { Database } from "@/lib/supabase/types";

/**
 * Carga los datos del dashboard `/portal` con el cliente AUTENTICADO: RLS
 * de Fase 0 ya acota cada tabla a la empresa del cliente vía
 * `current_company_id()`, así que este loader no recibe `companyId`.
 * Reusa el mismo patrón de lectura que `load-eligibility.server.ts`
 * (assessment más reciente + sus `assessment_controls`), pero sirviendo al
 * cliente en vez del consultor, y agrega la empresa (`company_client_view`)
 * y el certificado más reciente.
 *
 * Si algo falla (o el cliente no tiene empresa/assessment/certificado
 * todavía) se devuelve una estructura vacía coherente en vez de propagar el
 * error: el portal es de solo lectura y no debe filtrar detalles internos.
 */

export interface ClientDashboardCompany {
  id: string;
  name: string;
}

export interface ClientDashboardCertificate {
  code: string;
  status: Database["public"]["Enums"]["certificate_status"];
  issued_at: string;
  valid_until: string;
}

export interface ClientDashboard {
  company: ClientDashboardCompany | null;
  cert: ClientDashboardCertificate | null;
  progress: { evaluated: number; total: number; pct: number };
}

const EMPTY_PROGRESS = { evaluated: 0, total: 0, pct: 0 };

export async function loadClientDashboard(): Promise<ClientDashboard> {
  try {
    const supabase = await createClient();

    const { data: company } = await supabase
      .from("company_client_view")
      .select("*")
      .maybeSingle();

    const { data: cert } = await supabase
      .from("certificates")
      .select("code,status,issued_at,valid_until")
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: assessment } = await supabase
      .from("assessments")
      .select("id")
      .order("cycle", { ascending: false })
      .limit(1)
      .maybeSingle();

    let progress = EMPTY_PROGRESS;
    if (assessment) {
      const { data: rows } = await supabase
        .from("assessment_controls")
        .select("status")
        .eq("assessment_id", assessment.id);

      progress = checklistProgress((rows ?? []).map((row) => row.status));
    }

    return {
      company: company?.id && company.name
        ? { id: company.id, name: company.name }
        : null,
      cert: cert ?? null,
      progress,
    };
  } catch {
    return { company: null, cert: null, progress: EMPTY_PROGRESS };
  }
}
