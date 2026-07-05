"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  EVIDENCE_ALLOWED_MIME_TYPES,
  EVIDENCE_MAX_FILE_BYTES,
  isAllowedEvidenceMimeType,
  sanitizeEvidenceFileName,
} from "@/lib/evidences/constraints";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions del portal del cliente para SUS evidencias (spec Fase 3,
 * tarea 1). Mismo módulo `lib/actions/evidences.ts` ya existe para el flujo
 * del CONSULTOR (sube con su propia sesión, RLS de staff en Storage y en
 * `evidences`); estas actions son para el CLIENTE y viven en un archivo
 * aparte a propósito, porque el cliente NO tiene ninguna policy de
 * INSERT/UPDATE ni en `public.evidences` ni en `storage.objects`
 * (`evidences_objects_*` en 20260702100300_storage.sql exigen
 * `is_consultant()`).
 *
 * Doctrina (mismo patrón que lib/actions/proposals.ts):
 * 1. "use server" + Zod ANTES de tocar datos.
 * 2. Se verifica PERTENENCIA con el cliente AUTENTICADO (`current_company_id()`
 *    vía la vista `company_client_view`, RLS de Fase 0) antes de escribir.
 * 3. La escritura (Storage + tabla `evidences` + `audit_log`) se hace con
 *    **service-role** (`lib/supabase/admin.ts`): el cliente nunca tiene
 *    write directo. `uploaded_by` queda `null` (no existe fila en `profiles`
 *    para un usuario cliente).
 */

const EVIDENCES_BUCKET = "evidences";

const uploadSchema = z.object({
  controlId: z.uuid(),
  evidenceName: z.string().trim().min(1).max(200),
});

const downloadSchema = z.object({ evidenceId: z.uuid() });

export type UploadResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "unauthorized" | "not_found" | "too_large" | "bad_type" | "unavailable";
    };

export type DownloadResult =
  | { ok: true; url: string }
  | { ok: false; error: "not_found" | "unauthorized" | "unavailable" };

/**
 * Resuelve la empresa del cliente autenticado leyendo `company_client_view`
 * (RLS/filtro `current_company_id()` ya acota el resultado a la empresa
 * propia — ver 20260706101000_client_rls.sql). `null` si el usuario no
 * tiene sesión de cliente o no está vinculado a ninguna empresa.
 */
async function getAuthenticatedClientCompanyId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data: company } = await supabase
    .from("company_client_view")
    .select("id")
    .maybeSingle();
  return company?.id ?? null;
}

/**
 * Sube una evidencia del cliente para un control aplicable de SU empresa.
 * FormData esperado: `controlId` (uuid), `evidenceName` (1..200), `file`.
 *
 * El `controlId` se valida contra el catálogo compartido (`controls`,
 * legible por cualquier cliente activo vía `controls_client_select`) — no
 * hace falta que pertenezca a un assessment abierto para aceptar la subida
 * (evita que un cambio de estado del assessment bloquee un reintento).
 */
export async function uploadEvidence(formData: FormData): Promise<UploadResult> {
  const parsed = uploadSchema.safeParse({
    controlId: formData.get("controlId"),
    evidenceName: formData.get("evidenceName"),
  });
  if (!parsed.success) return { ok: false, error: "validation" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "validation" };
  }
  if (file.size > EVIDENCE_MAX_FILE_BYTES) {
    return { ok: false, error: "too_large" };
  }
  if (!isAllowedEvidenceMimeType(file.type)) {
    return { ok: false, error: "bad_type" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    // 1. Pertenencia: empresa del cliente autenticado.
    const companyId = await getAuthenticatedClientCompanyId(supabase);
    if (!companyId) return { ok: false, error: "unauthorized" };

    // 2. El control debe existir en el catálogo (RLS: controls_client_select).
    const { data: control, error: controlError } = await supabase
      .from("controls")
      .select("id")
      .eq("id", parsed.data.controlId)
      .maybeSingle();
    if (controlError) {
      console.error("[portal-evidences] lectura de control falló:", controlError.message);
      return { ok: false, error: "unavailable" };
    }
    if (!control) return { ok: false, error: "not_found" };

    const { controlId, evidenceName } = parsed.data;
    const safeName = sanitizeEvidenceFileName(file.name);
    const storagePath = `${companyId}/${controlId}-${Date.now()}-${safeName}`;

    // 3. A partir de acá, TODO con service-role: el cliente no tiene
    //    INSERT/UPDATE ni en `storage.objects` ni en `public.evidences`.
    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from(EVIDENCES_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("[portal-evidences] upload a Storage falló:", uploadError.message);
      return { ok: false, error: "unavailable" };
    }

    // Upsert lógico por (company_id, control_id, name): si ya hay una fila
    // (p. ej. re-subida tras rechazo), se actualiza el storage_path y sube de
    // versión en vez de duplicar la fila.
    const { data: existing, error: existingError } = await admin
      .from("evidences")
      .select("id, version")
      .eq("company_id", companyId)
      .eq("control_id", controlId)
      .eq("name", evidenceName)
      .maybeSingle();
    if (existingError) {
      console.error(
        "[portal-evidences] lectura de evidencia existente falló:",
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
        console.error("[portal-evidences] update de evidencia falló:", updateError.message);
        await admin.storage.from(EVIDENCES_BUCKET).remove([storagePath]);
        return { ok: false, error: "unavailable" };
      }
      evidenceId = existing.id;
    } else {
      const { data: inserted, error: insertError } = await admin
        .from("evidences")
        .insert({
          company_id: companyId,
          control_id: controlId,
          name: evidenceName,
          storage_path: storagePath,
          status: "missing",
          uploaded_by: null,
        })
        .select("id")
        .single();
      if (insertError || !inserted) {
        console.error(
          "[portal-evidences] insert de evidencia falló:",
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
        company_id: companyId,
        control_id: controlId,
        name: evidenceName,
        storage_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type,
      },
    });
    if (auditError) {
      console.error(
        "[portal-evidences] audit_log (evidence.uploaded_by_client) falló:",
        auditError.message,
      );
    }

    revalidatePath("/portal");
    return { ok: true };
  } catch (cause) {
    console.error("[portal-evidences] uploadEvidence no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}

/**
 * URL firmada (60s) para que el cliente descargue SU evidencia. La
 * pertenencia se verifica leyendo `evidences` con el cliente AUTENTICADO
 * (RLS `evidences_client_select` la acota a su empresa); si no aparece, no
 * se distingue "no existe" de "es de otra empresa" (not_found para ambos,
 * para no filtrar existencia ajena). La URL firmada se genera con
 * service-role porque el cliente no tiene policy de SELECT sobre
 * `storage.objects` del bucket 'evidences'.
 */
export async function getEvidenceDownloadUrl(evidenceId: string): Promise<DownloadResult> {
  const parsed = downloadSchema.safeParse({ evidenceId });
  if (!parsed.success) return { ok: false, error: "not_found" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: evidence, error } = await supabase
      .from("evidences")
      .select("id, storage_path")
      .eq("id", parsed.data.evidenceId)
      .maybeSingle();
    if (error) {
      console.error("[portal-evidences] lectura para descarga falló:", error.message);
      return { ok: false, error: "unavailable" };
    }
    if (!evidence || !evidence.storage_path) return { ok: false, error: "not_found" };

    const admin = createAdminClient();
    const { data: signed, error: signError } = await admin.storage
      .from(EVIDENCES_BUCKET)
      .createSignedUrl(evidence.storage_path, 60);
    if (signError || !signed?.signedUrl) {
      console.error(
        "[portal-evidences] createSignedUrl falló:",
        signError?.message ?? "sin URL",
      );
      return { ok: false, error: "unavailable" };
    }
    return { ok: true, url: signed.signedUrl };
  } catch (cause) {
    console.error("[portal-evidences] getEvidenceDownloadUrl no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}

/** Reexport de los límites del bucket, por si la UI del portal (Tarea 2) los
 * necesita para pre-validar antes de enviar el FormData. */
export { EVIDENCE_ALLOWED_MIME_TYPES, EVIDENCE_MAX_FILE_BYTES };
