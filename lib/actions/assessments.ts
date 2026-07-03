"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { Constants, type TablesUpdate } from "@/lib/supabase/types";

/**
 * Server actions del módulo checklist-evaluacion (risk high).
 * Doctrina aplicada en cada action:
 * 1. Zod ANTES de tocar datos (input desconocido → validation).
 * 2. Verificación de sesión (defensa en profundidad además de RLS: las
 *    políticas de assessment_controls ya exigen is_consultant()).
 * 3. Mutación + insert en audit_log (control.status_changed /
 *    control.notes_updated) con actor_id = auth.uid() — exigido por la
 *    política audit_log_insert. PostgREST no da transacción entre ambas
 *    escrituras: si el insert de auditoría falla se loggea con contexto
 *    completo (no se revierte la mutación; la fila queda reconstruible
 *    desde el log del servidor).
 * 4. revalidatePath de las vistas afectadas (checklist, ficha y resumen).
 */

const MAX_TEXT = 4000;

const controlStatusSchema = z.object({
  assessment_control_id: z.uuid(),
  status: z.enum(Constants.public.Enums.control_result),
  findings: z.string().trim().max(MAX_TEXT).optional(),
  notes: z.string().trim().max(MAX_TEXT).optional(),
});

const controlNotesSchema = z.object({
  assessment_control_id: z.uuid(),
  findings: z.string().trim().max(MAX_TEXT),
  notes: z.string().trim().max(MAX_TEXT),
});

export type AssessmentActionError =
  | "validation"
  | "unauthorized"
  | "not_found"
  | "unavailable";

export type AssessmentActionResult =
  | { ok: true }
  | { ok: false; error: AssessmentActionError };

export type SaveNotesState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; error: AssessmentActionError };

/** Revalida checklist, ficha de control y resumen de la empresa afectada. */
function revalidateControlPaths(
  companyId: string | null | undefined,
  controlCode: string | null | undefined,
): void {
  if (!companyId) return;
  revalidatePath(`/app/empresas/${companyId}/checklist`);
  revalidatePath(`/app/empresas/${companyId}`);
  if (controlCode) {
    revalidatePath(`/app/empresas/${companyId}/controles/${controlCode}`);
  }
}

/**
 * Cambia el estado de un control evaluado (pill cicable del prototipo §1.4.5
 * y botón grande de la ficha §1.4.6). El estado llega ABSOLUTO (no "next"):
 * clics rápidos en secuencia convergen al último valor elegido.
 */
export async function setControlStatus(
  input: unknown,
): Promise<AssessmentActionResult> {
  const parsed = controlStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  // Fila actual: estado old para el audit + contexto (empresa, código) para
  // revalidar rutas. RLS ya filtra lo que el consultor no puede ver.
  const { data: row, error: rowError } = await supabase
    .from("assessment_controls")
    .select("id, status, assessments ( company_id ), controls ( code )")
    .eq("id", parsed.data.assessment_control_id)
    .maybeSingle();
  if (rowError) {
    console.error(
      "[assessments] lectura de assessment_control falló:",
      rowError.message,
    );
    return { ok: false, error: "unavailable" };
  }
  if (!row) return { ok: false, error: "not_found" };

  const nextStatus = parsed.data.status;
  const update: TablesUpdate<"assessment_controls"> = {
    status: nextStatus,
    // pending = "sin evaluar": vuelve a limpiar la fecha de evaluación.
    evaluated_at: nextStatus === "pending" ? null : new Date().toISOString(),
  };
  if (parsed.data.findings !== undefined) {
    update.findings = parsed.data.findings || null;
  }
  if (parsed.data.notes !== undefined) {
    update.notes = parsed.data.notes || null;
  }

  const { error: updateError } = await supabase
    .from("assessment_controls")
    .update(update)
    .eq("id", row.id);
  if (updateError) {
    console.error(
      "[assessments] update de estado falló:",
      updateError.message,
    );
    return { ok: false, error: "unavailable" };
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "control.status_changed",
    entity: "assessment_controls",
    entity_id: row.id,
    actor_id: user.id,
    detail: {
      control_code: row.controls?.code ?? null,
      old_status: row.status,
      new_status: nextStatus,
    },
  });
  if (auditError) {
    console.error(
      `[assessments] audit_log control.status_changed falló (id=${row.id}, ` +
        `${row.status}→${nextStatus}, actor=${user.id}):`,
      auditError.message,
    );
  }

  revalidateControlPaths(row.assessments?.company_id, row.controls?.code);
  return { ok: true };
}

/**
 * Guarda hallazgos y notas de un control evaluado (ficha §1.4.6). Action de
 * formulario para useActionState: (prevState, formData) → SaveNotesState.
 */
export async function saveControlNotes(
  _prevState: SaveNotesState,
  formData: FormData,
): Promise<SaveNotesState> {
  const parsed = controlNotesSchema.safeParse({
    assessment_control_id: formData.get("assessment_control_id"),
    findings: formData.get("findings"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { status: "error", error: "validation" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "unauthorized" };

  const { data: row, error: rowError } = await supabase
    .from("assessment_controls")
    .select("id, findings, notes, assessments ( company_id ), controls ( code )")
    .eq("id", parsed.data.assessment_control_id)
    .maybeSingle();
  if (rowError) {
    console.error(
      "[assessments] lectura de assessment_control falló:",
      rowError.message,
    );
    return { status: "error", error: "unavailable" };
  }
  if (!row) return { status: "error", error: "not_found" };

  const findings = parsed.data.findings || null;
  const notes = parsed.data.notes || null;

  const { error: updateError } = await supabase
    .from("assessment_controls")
    .update({ findings, notes })
    .eq("id", row.id);
  if (updateError) {
    console.error(
      "[assessments] update de hallazgos/notas falló:",
      updateError.message,
    );
    return { status: "error", error: "unavailable" };
  }

  // Los hallazgos son parte de la evaluación: mutación sensible → audit_log.
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "control.notes_updated",
    entity: "assessment_controls",
    entity_id: row.id,
    actor_id: user.id,
    detail: {
      control_code: row.controls?.code ?? null,
      old: { findings: row.findings, notes: row.notes },
      new: { findings, notes },
    },
  });
  if (auditError) {
    console.error(
      `[assessments] audit_log control.notes_updated falló (id=${row.id}, actor=${user.id}):`,
      auditError.message,
    );
  }

  revalidateControlPaths(row.assessments?.company_id, row.controls?.code);
  return { status: "saved" };
}
