import "server-only";

import { createClient } from "@/lib/supabase/server";
import { checklistProgress } from "@/lib/companies/display";
import type { PreliminaryPanorama } from "@/lib/self-assessment/panorama";
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

export interface ClientDashboardProposal {
  id: string;
  plan: string;
  amountClp: number;
  status: Database["public"]["Enums"]["proposal_status"];
}

export interface ClientDashboard {
  company: ClientDashboardCompany | null;
  cert: ClientDashboardCertificate | null;
  progress: { evaluated: number; total: number; pct: number };
  /** La propuesta más reciente que ya dejó de ser 'draft' (spec fase 2, tarea
   * 3): el consultor la "publica" (status 'sent') al crearla, así que el
   * cliente nunca ve borradores. `null` si aún no hay ninguna publicada. */
  proposal: ClientDashboardProposal | null;
  /** Fecha de pago del servicio (spec company-accounts fase 2, tarea 9):
   * junto a `clientReadyAt` determina el estado A/B/C del portal vía
   * `portalServiceState()`. */
  servicePaidAt: string | null;
  /** Fecha en que el consultor publicó el trabajo para el cliente (estado
   * "ready" del portal). */
  clientReadyAt: string | null;
  /** Panorama preliminar del diagnóstico (estado "preparing"): jsonb de
   * `company_client_view.preliminary_panorama`, casteado a su forma tipada. */
  panorama: PreliminaryPanorama | null;
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

    const { data: proposalRow } = await supabase
      .from("proposals")
      .select("id,plan,amount_clp,status")
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      company: company?.id && company.name
        ? { id: company.id, name: company.name }
        : null,
      cert: cert ?? null,
      progress,
      proposal: proposalRow
        ? {
            id: proposalRow.id,
            plan: proposalRow.plan,
            amountClp: proposalRow.amount_clp,
            status: proposalRow.status,
          }
        : null,
      servicePaidAt: company?.service_paid_at ?? null,
      clientReadyAt: company?.client_ready_at ?? null,
      panorama: (company?.preliminary_panorama as PreliminaryPanorama | null) ?? null,
    };
  } catch {
    return {
      company: null,
      cert: null,
      progress: EMPTY_PROGRESS,
      proposal: null,
      servicePaidAt: null,
      clientReadyAt: null,
      panorama: null,
    };
  }
}
