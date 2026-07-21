"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  EVIDENCE_MAX_FILE_BYTES,
  isAllowedEvidenceMimeType,
  sanitizeEvidenceFileName,
} from "@/lib/evidences/constraints";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Evidencias por BRECHA del diagnóstico (sub-proyecto #7): el cliente respalda
 * la mitigación de cada brecha subiendo evidencia desde su detalle. Misma
 * doctrina que lib/actions/portal-evidences.ts (flujo por control, modelo
 * anterior): Zod antes de tocar datos; pertenencia con el cliente autenticado
 * (la RLS de diagnosis_breaches solo expone brechas de su empresa); escritura
 * de Storage + evidences + audit_log con service-role (el cliente no tiene
 * write directo); upsert lógico por (company_id, breach_id, name).
 */

const EVIDENCES_BUCKET = "evidences";

const uploadSchema = z.object({
  breachId: z.uuid(),
  evidenceName: z.string().trim().min(1).max(200),
});

export type BreachEvidenceUploadResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthorized"
        | "not_found"
        | "too_large"
        | "bad_type"
        | "unavailable";
    };

export async function uploadBreachEvidence(
  formData: FormData,
): Promise<BreachEvidenceUploadResult> {
  const parsed = uploadSchema.safeParse({
    breachId: formData.get("breachId"),
    evidenceName: formData.get("evidenceName"),
  });
  if (!parsed.success) return { ok: false, error: "validation" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "validation" };
  }
  if (file.size > EVIDENCE_MAX_FILE_BYTES) return { ok: false, error: "too_large" };
  if (!isAllowedEvidenceMimeType(file.type)) return { ok: false, error: "bad_type" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    // Pertenencia + gate de pagado: la empresa del cliente autenticado.
    const { data: company } = await supabase
      .from("company_client_view")
      .select("id, service_paid_at")
      .maybeSingle();
    if (!company?.id) return { ok: false, error: "unauthorized" };
    if (!company.service_paid_at) return { ok: false, error: "unauthorized" };

    // La brecha debe ser visible para el cliente (RLS la acota a su empresa).
    const { data: breach, error: breachError } = await supabase
      .from("diagnosis_breaches")
      .select("id, breach_code")
      .eq("id", parsed.data.breachId)
      .maybeSingle();
    if (breachError) {
      console.error(
        "[portal-breach-evidences] lectura de brecha falló:",
        breachError.message,
      );
      return { ok: false, error: "unavailable" };
    }
    if (!breach) return { ok: false, error: "not_found" };

    const { breachId, evidenceName } = parsed.data;
    const safeName = sanitizeEvidenceFileName(file.name);
    const storagePath = `${company.id}/breaches/${breachId}-${Date.now()}-${safeName}`;

    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from(EVIDENCES_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error(
        "[portal-breach-evidences] upload a Storage falló:",
        uploadError.message,
      );
      return { ok: false, error: "unavailable" };
    }

    // Upsert lógico por (company_id, breach_id, name): re-subir la misma
    // evidencia sube de versión y vuelve a revisión, sin duplicar la fila.
    const { data: existing, error: existingError } = await admin
      .from("evidences")
      .select("id, version")
      .eq("company_id", company.id)
      .eq("breach_id", breachId)
      .eq("name", evidenceName)
      .maybeSingle();
    if (existingError) {
      console.error(
        "[portal-breach-evidences] lectura de existente falló:",
        existingError.message,
      );
      await admin.storage.from(EVIDENCES_BUCKET).remove([storagePath]);
      return { ok: false, error: "unavailable" };
    }

    let evidenceId: string;
    if (existing) {
      const { error: updateError } = await admin
        .from("evidences")
        .update({
          storage_path: storagePath,
          version: existing.version + 1,
          status: "missing",
        })
        .eq("id", existing.id);
      if (updateError) {
        console.error(
          "[portal-breach-evidences] update falló:",
          updateError.message,
        );
        await admin.storage.from(EVIDENCES_BUCKET).remove([storagePath]);
        return { ok: false, error: "unavailable" };
      }
      evidenceId = existing.id;
    } else {
      const { data: inserted, error: insertError } = await admin
        .from("evidences")
        .insert({
          company_id: company.id,
          breach_id: breachId,
          control_id: null,
          name: evidenceName,
          storage_path: storagePath,
          status: "missing",
          uploaded_by: null,
        })
        .select("id")
        .single();
      if (insertError || !inserted) {
        console.error(
          "[portal-breach-evidences] insert falló:",
          insertError?.message ?? "sin fila",
        );
        await admin.storage.from(EVIDENCES_BUCKET).remove([storagePath]);
        return { ok: false, error: "unavailable" };
      }
      evidenceId = inserted.id;
    }

    const { error: auditError } = await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "evidence.uploaded_by_client",
      entity: "evidences",
      entity_id: evidenceId,
      detail: {
        company_id: company.id,
        breach_id: breachId,
        breach_code: breach.breach_code,
        name: evidenceName,
        storage_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type,
      },
    });
    if (auditError) {
      console.error(
        "[portal-breach-evidences] audit_log falló:",
        auditError.message,
      );
    }

    revalidatePath(`/portal/evaluaciones/${breachId}`);
    revalidatePath("/portal/evaluaciones");
    return { ok: true };
  } catch (cause) {
    console.error("[portal-breach-evidences] uploadBreachEvidence no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
