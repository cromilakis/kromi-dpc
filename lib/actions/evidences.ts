"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  EVIDENCE_MAX_FILE_BYTES,
  isAllowedEvidenceMimeType,
  sanitizeEvidenceFileName,
} from "@/lib/evidences/constraints";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions del repositorio documental de evidencias (spec evidencias,
 * data_level sensitive, risk high). Doctrina aplicada:
 * - "use server" + Zod ANTES de tocar datos en toda action.
 * - Verificación de sesión en cada action (defensa en profundidad además de
 *   la RLS, que solo autoriza al equipo consultor).
 * - Cliente AUTENTICADO (lib/supabase/server) — NUNCA el admin/service role.
 * - insert en audit_log en toda mutación sensible (subida, cambio de estado).
 * - Storage privado: bucket 'evidences'; descarga SOLO por URL firmada de
 *   60 segundos (nunca URL pública).
 */

const EVIDENCES_BUCKET = "evidences";

/** Estados asignables por validación (missing se reserva a "sin documento"). */
const SETTABLE_STATUSES = ["validated", "partial", "rejected"] as const;

const uploadMetadataSchema = z.object({
  companyId: z.uuid(),
  // El select del form envía "" cuando la evidencia no se vincula a un control.
  controlId: z.uuid().nullable(),
});

const evidenceIdSchema = z.object({ evidenceId: z.uuid() });

const setStatusSchema = z.object({
  evidenceId: z.uuid(),
  status: z.enum(SETTABLE_STATUSES),
});

export type UploadEvidenceError =
  | "validation"
  | "unauthorized"
  | "file_missing"
  | "file_too_large"
  | "file_type"
  | "unavailable";

export type UploadEvidenceResult =
  | { ok: true }
  | { ok: false; error: UploadEvidenceError };

export type EvidenceActionError =
  | "validation"
  | "unauthorized"
  | "not_found"
  | "unavailable";

export type SetEvidenceStatusResult =
  | { ok: true }
  | { ok: false; error: EvidenceActionError | "no_file" };

export type DownloadUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: EvidenceActionError | "no_file" };

/**
 * Rastro de auditoría de la mutación. Si el insert del rastro falla se
 * registra en el log del servidor (Sentry en Connect) sin revertir la
 * operación de negocio: el dato primario ya quedó consistente y la política
 * RLS de audit_log (actor_id = auth.uid()) hace el fallo muy improbable.
 */
async function insertAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: {
    actorId: string;
    action: string;
    entity: string;
    entityId: string;
    detail: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    detail: entry.detail as never,
  });
  if (error) {
    console.error(
      `[evidences] audit_log (${entry.action}) falló:`,
      error.message,
    );
  }
}

/**
 * Sube un archivo de evidencia al bucket privado y registra la fila en
 * public.evidences con versionado por (empresa, nombre): version = max + 1.
 * FormData esperado: companyId, controlId (opcional, "" = sin control), file.
 */
export async function uploadEvidence(
  formData: FormData,
): Promise<UploadEvidenceResult> {
  // 1. Zod ANTES de tocar datos (metadata del form).
  const controlIdRaw = formData.get("controlId");
  const parsed = uploadMetadataSchema.safeParse({
    companyId: formData.get("companyId"),
    controlId:
      typeof controlIdRaw === "string" && controlIdRaw.length > 0
        ? controlIdRaw
        : null,
  });
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  // 2. Validación del archivo (tipo/tamaño alineados al bucket).
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "file_missing" };
  }
  if (file.size > EVIDENCE_MAX_FILE_BYTES) {
    return { ok: false, error: "file_too_large" };
  }
  if (!isAllowedEvidenceMimeType(file.type)) {
    return { ok: false, error: "file_type" };
  }

  try {
    const supabase = await createClient();

    // 3. Sesión verificada en la action (defensa en profundidad además de RLS).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "unauthorized" };
    }

    const { companyId, controlId } = parsed.data;
    const safeName = sanitizeEvidenceFileName(file.name);

    // 4. Subida al bucket privado con el cliente AUTENTICADO (política de
    //    consultores en storage.objects). Ruta interna del bucket:
    //    company_<id>/<uuid>-<nombre-sanitizado>.
    const storagePath = `company_${companyId}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(EVIDENCES_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("[evidences] upload a Storage falló:", uploadError.message);
      return { ok: false, error: "unavailable" };
    }

    // 5. Versionado: max(version) + 1 por (company_id, name). Carrera
    //    residual ACEPTADA (misma decisión que remediation.addToPlan): dos
    //    subidas concurrentes del mismo nombre pueden duplicar la versión
    //    porque no hay unique(company_id, name, version) en BD; el repositorio
    //    lo tolera (cada fila conserva su objeto en Storage y su rastro) y el
    //    uso real es un equipo chico. Si duele, agregar el unique + reintento.
    const { data: latest, error: versionError } = await supabase
      .from("evidences")
      .select("version")
      .eq("company_id", companyId)
      .eq("name", safeName)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (versionError) {
      console.error("[evidences] lectura de versión falló:", versionError.message);
      await supabase.storage.from(EVIDENCES_BUCKET).remove([storagePath]);
      return { ok: false, error: "unavailable" };
    }
    const version = (latest?.version ?? 0) + 1;

    // 6. Fila de la evidencia. Estado inicial 'partial' = "pendiente de
    //    validación" (ámbar del prototipo): el documento existe pero un
    //    consultor aún no lo valida ('missing' se reserva a "sin documento").
    const { data: inserted, error: insertError } = await supabase
      .from("evidences")
      .insert({
        company_id: companyId,
        control_id: controlId,
        name: safeName,
        storage_path: storagePath,
        version,
        status: "partial",
        uploaded_by: user.id,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      console.error(
        "[evidences] insert falló:",
        insertError?.message ?? "sin fila",
      );
      // Compensación best-effort: no dejar huérfano el objeto en Storage.
      await supabase.storage.from(EVIDENCES_BUCKET).remove([storagePath]);
      return { ok: false, error: "unavailable" };
    }

    // 7. Rastro de auditoría (mutación sensible).
    await insertAuditLog(supabase, {
      actorId: user.id,
      action: "evidence.uploaded",
      entity: "evidences",
      entityId: inserted.id,
      detail: {
        company_id: companyId,
        control_id: controlId,
        name: safeName,
        version,
        storage_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type,
      },
    });

    revalidatePath(`/app/empresas/${companyId}/evidencias`);
    return { ok: true };
  } catch (cause) {
    console.error("[evidences] uploadEvidence no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Genera una URL firmada de 60 segundos para descargar la evidencia.
 * Lectura (no muta datos): sin audit_log, pero con sesión verificada y RLS.
 * Nunca se expone una URL pública del bucket.
 */
export async function getEvidenceDownloadUrl(
  input: unknown,
): Promise<DownloadUrlResult> {
  const parsed = evidenceIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "unauthorized" };
    }

    const { data: evidence, error } = await supabase
      .from("evidences")
      .select("id, name, storage_path")
      .eq("id", parsed.data.evidenceId)
      .maybeSingle();
    if (error) {
      console.error("[evidences] lectura para descarga falló:", error.message);
      return { ok: false, error: "unavailable" };
    }
    if (!evidence) {
      return { ok: false, error: "not_found" };
    }
    if (!evidence.storage_path) {
      return { ok: false, error: "no_file" };
    }

    // Compat con el seed demo: sus rutas incluyen el prefijo del bucket
    // ('evidences/<company>/…'); createSignedUrl espera la ruta interna.
    const objectPath = evidence.storage_path.replace(/^evidences\//, "");
    const { data: signed, error: signError } = await supabase.storage
      .from(EVIDENCES_BUCKET)
      .createSignedUrl(objectPath, 60, { download: evidence.name });
    if (signError || !signed?.signedUrl) {
      console.error(
        "[evidences] createSignedUrl falló:",
        signError?.message ?? "sin URL",
      );
      return { ok: false, error: "unavailable" };
    }
    return { ok: true, url: signed.signedUrl };
  } catch (cause) {
    console.error("[evidences] getEvidenceDownloadUrl no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Cambia el estado de validación de una evidencia (validated/partial/rejected)
 * y deja el rastro 'evidence.status_changed' (old → new) en audit_log.
 * Integridad probatoria: una evidencia SIN archivo (storage_path null) no
 * puede pasar a validated/partial — solo un documento real respalda esos
 * estados ('rejected' sí se permite, p. ej. para cerrar filas del seed).
 */
export async function setEvidenceStatus(
  input: unknown,
): Promise<SetEvidenceStatusResult> {
  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: "unauthorized" };
    }

    const { evidenceId, status } = parsed.data;
    const { data: evidence, error: readError } = await supabase
      .from("evidences")
      .select("id, status, company_id, name, version, storage_path")
      .eq("id", evidenceId)
      .maybeSingle();
    if (readError) {
      console.error("[evidences] lectura de estado falló:", readError.message);
      return { ok: false, error: "unavailable" };
    }
    if (!evidence) {
      return { ok: false, error: "not_found" };
    }
    // Sin documento no hay nada que validar (ni marcar "pendiente de
    // validación"): se rechaza para no romper la cadena probatoria.
    if (!evidence.storage_path && status !== "rejected") {
      return { ok: false, error: "no_file" };
    }
    if (evidence.status === status) {
      // No-op idempotente: sin update ni rastro (nada cambió).
      return { ok: true };
    }

    const { error: updateError } = await supabase
      .from("evidences")
      .update({ status })
      .eq("id", evidenceId);
    if (updateError) {
      console.error("[evidences] update de estado falló:", updateError.message);
      return { ok: false, error: "unavailable" };
    }

    await insertAuditLog(supabase, {
      actorId: user.id,
      action: "evidence.status_changed",
      entity: "evidences",
      entityId: evidence.id,
      detail: {
        company_id: evidence.company_id,
        name: evidence.name,
        version: evidence.version,
        old: evidence.status,
        new: status,
      },
    });

    revalidatePath(`/app/empresas/${evidence.company_id}/evidencias`);
    return { ok: true };
  } catch (cause) {
    console.error("[evidences] setEvidenceStatus no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
