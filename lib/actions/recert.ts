"use server";

import { z } from "zod";
import { certificateStanding } from "@/lib/portal/certificate-status";
import { scoreTierOf } from "@/lib/companies/scoring.server";
import { recertGate, RECERT_CONSENT_VERSION, type RecertGate } from "@/lib/recert/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Server action del módulo "solicitud de re-certificación" (spec Fase 4,
 * tarea 2): el cliente, cuando su certificado está por vencer/vencido, pide
 * abrir un nuevo ciclo de evaluación desde el portal. Doctrina de siempre
 * (proposals.ts/evidences.ts):
 * 1. "use server" + Zod ANTES de tocar datos.
 * 2. Lectura de pertenencia (empresa + certificado) con el cliente
 *    AUTENTICADO: RLS de Fase 0 acota cada tabla a `current_company_id()`.
 * 3. Escritura (assessments/audit_log) con **service-role**: el cliente no
 *    tiene INSERT en ninguna de las dos tablas por diseño de RLS.
 * 4. `audit_log` en toda mutación sensible (acá van DOS entradas: el
 *    consentimiento aceptado y la solicitud en sí).
 *
 * Global Constraint clave: el Complexity Score (`companies.complexity_score`)
 * es SIEMPRE interno — se lee con service-role para derivar el tramo, pero
 * NUNCA se devuelve al cliente ni se registra en el audit_log en texto
 * plano; solo el `gate` resultante ('self_service_pending' | 'consultant_review')
 * sale de esta función.
 */

export type RequestRecertError =
  | "validation"
  | "unauthorized"
  | "not_eligible"
  | "already_open"
  | "unavailable";

export type RequestRecertResult =
  | { ok: true; gate: RecertGate }
  | { ok: false; error: RequestRecertError };

const requestRecertSchema = z.object({
  consentVersion: z.literal(RECERT_CONSENT_VERSION),
});

/**
 * Solicita la re-certificación de la empresa del cliente autenticado.
 * Idempotente: si ya hay un ciclo `client_recert` abierto para la empresa,
 * devuelve `already_open` en vez de abrir otro (evita duplicar el trabajo
 * del consultor si el cliente reintenta el flujo).
 */
export async function requestRecertification(
  consentVersion: string,
): Promise<RequestRecertResult> {
  const parsed = requestRecertSchema.safeParse({ consentVersion });
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    // Empresa del cliente autenticado: RLS de `company_client_view` la
    // acota a `current_company_id()`; null = sin empresa asociada.
    const { data: company, error: companyError } = await supabase
      .from("company_client_view")
      .select("id")
      .maybeSingle();
    if (companyError) {
      console.error(
        "[recert] lectura de company_client_view falló:",
        companyError.message,
      );
      return { ok: false, error: "unavailable" };
    }
    if (!company) return { ok: false, error: "unauthorized" };
    const companyId = company.id;

    // Certificado más reciente del cliente, leído con el cliente
    // autenticado (RLS acota a su empresa) — mismo criterio que
    // load-dashboard.server.ts.
    const { data: cert, error: certError } = await supabase
      .from("certificates")
      .select("status,valid_until")
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (certError) {
      console.error("[recert] lectura de certificado falló:", certError.message);
      return { ok: false, error: "unavailable" };
    }

    const today = new Date().toISOString().slice(0, 10);
    const standing = certificateStanding(cert ?? null, today);
    if (standing !== "por_vencer" && standing !== "vencida") {
      // 'vigente' (aún no corresponde), 'revocada' o 'sin_certificado' (se
      // maneja por el diagnóstico inicial, no por recert) no son elegibles.
      return { ok: false, error: "not_eligible" };
    }

    const admin = createAdminClient();

    // Complexity Score: SOLO lectura interna vía service-role. NUNCA se
    // expone ni se audita en texto plano — solo el `gate` derivado.
    const { data: companyScore, error: scoreError } = await admin
      .from("companies")
      .select("complexity_score")
      .eq("id", companyId)
      .maybeSingle();
    if (scoreError) {
      console.error(
        "[recert] lectura de complexity_score falló:",
        scoreError.message,
      );
      return { ok: false, error: "unavailable" };
    }
    const tier = scoreTierOf(companyScore?.complexity_score ?? 0);
    const gate = recertGate(tier);

    // Idempotencia: ya hay un ciclo de recert abierto para esta empresa.
    const { data: openRecert, error: openRecertError } = await admin
      .from("assessments")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "open")
      .eq("origin", "client_recert")
      .limit(1)
      .maybeSingle();
    if (openRecertError) {
      console.error(
        "[recert] chequeo de ciclo client_recert abierto falló:",
        openRecertError.message,
      );
      return { ok: false, error: "unavailable" };
    }
    if (openRecert) return { ok: false, error: "already_open" };

    // Nuevo ciclo = max(cycle) de la empresa + 1 (mismo criterio que
    // createDiagnosisSession en lib/actions/interview.ts).
    const { data: latest, error: latestError } = await admin
      .from("assessments")
      .select("cycle")
      .eq("company_id", companyId)
      .order("cycle", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) {
      console.error("[recert] lectura de último ciclo falló:", latestError.message);
      return { ok: false, error: "unavailable" };
    }
    const nextCycle = (latest?.cycle ?? 0) + 1;

    const { data: assessment, error: insertError } = await admin
      .from("assessments")
      .insert({
        company_id: companyId,
        cycle: nextCycle,
        status: "open",
        origin: "client_recert",
      })
      .select("id")
      .single();
    if (insertError || !assessment) {
      console.error(
        "[recert] insert de nuevo ciclo client_recert falló:",
        insertError?.message,
      );
      return { ok: false, error: "unavailable" };
    }

    const { error: consentAuditError } = await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "recert.consent_accepted",
      entity: "companies",
      entity_id: companyId,
      detail: { version: parsed.data.consentVersion, company_id: companyId },
    });
    if (consentAuditError) {
      console.error(
        "[recert] audit_log (recert.consent_accepted) falló:",
        consentAuditError.message,
      );
    }

    const { error: requestAuditError } = await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "recert.requested",
      entity: "assessments",
      entity_id: assessment.id,
      detail: { company_id: companyId, assessment_id: assessment.id, gate },
    });
    if (requestAuditError) {
      console.error(
        "[recert] audit_log (recert.requested) falló:",
        requestAuditError.message,
      );
    }

    return { ok: true, gate };
  } catch (cause) {
    console.error("[recert] requestRecertification no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
