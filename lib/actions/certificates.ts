"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addMonths,
  certificateHash,
  CERTIFICATE_VALIDITY_MONTHS,
  generateCertificateCode,
  todayISODate,
} from "@/lib/certificates/issue.server";
import { loadCompanyEligibility } from "@/lib/certificates/load-eligibility.server";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions del módulo certificados (spec certificados, risk high).
 * Doctrina aplicada en cada action:
 * 1. "use server" + Zod ANTES de tocar datos.
 * 2. Verificación de sesión (defensa en profundidad además de la RLS, que ya
 *    restringe certificates al equipo consultor).
 * 3. La elegibilidad se RE-CALCULA en servidor antes de emitir/revalidar
 *    (lib/certificates/load-eligibility.server.ts) — nunca se confía en el
 *    flag `eligible` que renderizó la página.
 * 4. insert en audit_log en toda mutación (certificate.issued / .revalidated /
 *    .revoked). PostgREST no da transacción entre mutación y auditoría: si el
 *    rastro falla se loggea con contexto completo sin revertir el dato
 *    primario (mismo criterio que lib/actions/evidences.ts).
 * Nota de concurrencia: la ventana entre el chequeo de "certificado activo" y
 * el insert no está serializada (sin constraint parcial en BD); con un equipo
 * consultor pequeño el riesgo es aceptable y queda documentado.
 */

const companyIdSchema = z.object({ companyId: z.uuid() });
const certificateIdSchema = z.object({ certificateId: z.uuid() });

/** Colisión de unique (certificates.code) — reintento con otro sufijo. */
const PG_UNIQUE_VIOLATION = "23505";
const MAX_CODE_ATTEMPTS = 3;

export type CertificateActionError =
  | "validation"
  | "unauthorized"
  | "not_found"
  | "not_eligible"
  | "already_active"
  | "not_active"
  | "unavailable";

export type CertificateActionResult =
  | { ok: true }
  | { ok: false; error: CertificateActionError };

async function insertAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: {
    actorId: string;
    action: string;
    entityId: string;
    detail: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity: "certificates",
    entity_id: entry.entityId,
    detail: entry.detail as never,
  });
  if (error) {
    console.error(
      `[certificates] audit_log (${entry.action}, id=${entry.entityId}, ` +
        `actor=${entry.actorId}) falló:`,
      error.message,
    );
  }
}

/**
 * Emite el certificado DPC de una empresa elegible:
 * código DPC-<iniciales>-<año>-<6 chars base32 crypto> (patrón del seed),
 * sha256(company_id + code + issued_at), vigencia CERTIFICATE_VALIDITY_MONTHS.
 * Rechaza si ya existe un certificado activo o si la elegibilidad
 * (recalculada en servidor) no se cumple.
 */
export async function issueCertificate(
  input: unknown,
): Promise<CertificateActionResult> {
  const parsed = companyIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { companyId } = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError) {
      console.error("[certificates] lectura de empresa falló:", companyError.message);
      return { ok: false, error: "unavailable" };
    }
    if (!company) return { ok: false, error: "not_found" };

    // Un solo certificado vigente por empresa: el ciclo de renovación pasa
    // por revalidar el activo o revocarlo y emitir uno nuevo.
    const { data: active, error: activeError } = await supabase
      .from("certificates")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (activeError) {
      console.error(
        "[certificates] chequeo de certificado activo falló:",
        activeError.message,
      );
      return { ok: false, error: "unavailable" };
    }
    if (active) return { ok: false, error: "already_active" };

    // Re-chequeo autoritativo de la regla de elegibilidad (umbral 80% +
    // regla dura DPC-SEG/DPC-INC) — nunca se confía en el cliente.
    const { result } = await loadCompanyEligibility(supabase, companyId);
    if (!result.eligible) return { ok: false, error: "not_eligible" };

    const issuedAt = todayISODate();
    const validUntil = addMonths(issuedAt, CERTIFICATE_VALIDITY_MONTHS);
    const issueYear = Number(issuedAt.slice(0, 4));

    // El sufijo aleatorio colisiona con probabilidad ~32^-6 contra el unique
    // de `code`; ante 23505 se reintenta con otro sufijo.
    for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = generateCertificateCode(company.name, issueYear);
      const sha256Hash = certificateHash(companyId, code, issuedAt);

      const { data: inserted, error: insertError } = await supabase
        .from("certificates")
        .insert({
          company_id: companyId,
          code,
          status: "active",
          issued_at: issuedAt,
          valid_until: validUntil,
          sha256_hash: sha256Hash,
        })
        .select("id")
        .single();

      if (insertError) {
        if (insertError.code === PG_UNIQUE_VIOLATION && attempt < MAX_CODE_ATTEMPTS) {
          continue;
        }
        console.error("[certificates] insert de emisión falló:", insertError.message);
        return { ok: false, error: "unavailable" };
      }

      await insertAuditLog(supabase, {
        actorId: user.id,
        action: "certificate.issued",
        entityId: inserted.id,
        detail: {
          company_id: companyId,
          code,
          issued_at: issuedAt,
          valid_until: validUntil,
          sha256_hash: sha256Hash,
          compliance_pct: result.compliancePct,
          assessment_total_controls: result.totalControls,
        },
      });

      revalidatePath(`/app/empresas/${companyId}/certificacion`);
      return { ok: true };
    }
    // Inalcanzable (el último intento retorna dentro del loop); typing-safe.
    return { ok: false, error: "unavailable" };
  } catch (cause) {
    console.error("[certificates] issueCertificate no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Revalida un certificado activo: nueva vigencia de CERTIFICATE_VALIDITY_MONTHS
 * meses desde hoy + revalidated_at = hoy + rastro certificate.revalidated.
 * Exige la MISMA regla de elegibilidad que la emisión (la revalidación
 * extiende el sello, no puede ser más laxa que emitirlo).
 */
export async function revalidateCertificate(
  input: unknown,
): Promise<CertificateActionResult> {
  const parsed = certificateIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: certificate, error: readError } = await supabase
      .from("certificates")
      .select("id, company_id, code, status, valid_until, revalidated_at")
      .eq("id", parsed.data.certificateId)
      .maybeSingle();
    if (readError) {
      console.error("[certificates] lectura para revalidar falló:", readError.message);
      return { ok: false, error: "unavailable" };
    }
    if (!certificate) return { ok: false, error: "not_found" };
    if (certificate.status !== "active") {
      return { ok: false, error: "not_active" };
    }

    const { result } = await loadCompanyEligibility(
      supabase,
      certificate.company_id,
    );
    if (!result.eligible) return { ok: false, error: "not_eligible" };

    const revalidatedAt = todayISODate();
    const newValidUntil = addMonths(revalidatedAt, CERTIFICATE_VALIDITY_MONTHS);

    const { error: updateError } = await supabase
      .from("certificates")
      .update({ valid_until: newValidUntil, revalidated_at: revalidatedAt })
      .eq("id", certificate.id);
    if (updateError) {
      console.error("[certificates] update de revalidación falló:", updateError.message);
      return { ok: false, error: "unavailable" };
    }

    await insertAuditLog(supabase, {
      actorId: user.id,
      action: "certificate.revalidated",
      entityId: certificate.id,
      detail: {
        company_id: certificate.company_id,
        code: certificate.code,
        old_valid_until: certificate.valid_until,
        new_valid_until: newValidUntil,
        revalidated_at: revalidatedAt,
        compliance_pct: result.compliancePct,
      },
    });

    revalidatePath(`/app/empresas/${certificate.company_id}/certificacion`);
    return { ok: true };
  } catch (cause) {
    console.error("[certificates] revalidateCertificate no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Revoca un certificado (status → revoked) con rastro certificate.revoked.
 * La confirmación es de UI (certificate-actions.tsx); la action es idempotente
 * ante un certificado ya revocado (no-op sin rastro).
 */
export async function revokeCertificate(
  input: unknown,
): Promise<CertificateActionResult> {
  const parsed = certificateIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: certificate, error: readError } = await supabase
      .from("certificates")
      .select("id, company_id, code, status")
      .eq("id", parsed.data.certificateId)
      .maybeSingle();
    if (readError) {
      console.error("[certificates] lectura para revocar falló:", readError.message);
      return { ok: false, error: "unavailable" };
    }
    if (!certificate) return { ok: false, error: "not_found" };
    if (certificate.status === "revoked") {
      // No-op idempotente: nada cambió, sin rastro.
      return { ok: true };
    }

    const { error: updateError } = await supabase
      .from("certificates")
      .update({ status: "revoked" })
      .eq("id", certificate.id);
    if (updateError) {
      console.error("[certificates] update de revocación falló:", updateError.message);
      return { ok: false, error: "unavailable" };
    }

    await insertAuditLog(supabase, {
      actorId: user.id,
      action: "certificate.revoked",
      entityId: certificate.id,
      detail: {
        company_id: certificate.company_id,
        code: certificate.code,
        old_status: certificate.status,
        new_status: "revoked",
      },
    });

    revalidatePath(`/app/empresas/${certificate.company_id}/certificacion`);
    return { ok: true };
  } catch (cause) {
    console.error("[certificates] revokeCertificate no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
