import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Carga los "slots" de evidencia del cliente autenticado (spec Fase 3, tarea
 * 1): un slot por cada `required_evidence` de cada control APLICABLE del
 * assessment más reciente de su empresa.
 *
 * Enfoque simple y robusto (preferido en el plan sobre recalcular
 * `controlApplies` desde cero): la aplicabilidad YA quedó resuelta al
 * momento de la entrevista — `assessment_controls.status = 'not_applicable'`
 * marca los controles fuera de alcance (ver `lib/interview/select-not-applicable.ts`
 * y `20260705141500_control_result_na.sql`). Así que "aplicable" acá es
 * simplemente `status != 'not_applicable'` sobre las filas de
 * `assessment_controls` del assessment más reciente, sin tocar
 * `controlApplies`/factores de nuevo.
 *
 * Lectura con el cliente AUTENTICADO: RLS (Fase 0) ya acota
 * `assessments`/`assessment_controls`/`evidences` a la empresa del cliente
 * (`current_company_id()`), y `controls` es catálogo compartido legible por
 * cualquier cliente activo (`controls_client_select`). Si algo falla (o el
 * cliente no tiene assessment todavía) se devuelve `[]`: el portal es de
 * solo lectura y no debe filtrar detalles internos.
 */

export interface EvidenceSlot {
  controlId: string;
  controlCode: string;
  controlName: string;
  evidenceName: string;
  /** `null` cuando el slot aún no tiene ninguna fila en `evidences`. */
  evidenceId: string | null;
  status: "validated" | "partial" | "missing" | "rejected";
  hasFile: boolean;
}

export async function loadClientEvidences(): Promise<EvidenceSlot[]> {
  try {
    const supabase = await createClient();

    const { data: assessment } = await supabase
      .from("assessments")
      .select("id")
      .order("cycle", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!assessment) return [];

    const { data: assessmentControls } = await supabase
      .from("assessment_controls")
      .select("control_id, status, controls(id, code, name, required_evidences)")
      .eq("assessment_id", assessment.id)
      .neq("status", "not_applicable");
    if (!assessmentControls || assessmentControls.length === 0) return [];

    const { data: evidenceRows } = await supabase
      .from("evidences")
      .select("id, control_id, name, status, storage_path");

    // Índice por (control_id, name) para cruzar cada slot con su fila
    // existente en `evidences` (si la hay).
    const evidenceByKey = new Map<
      string,
      { id: string; status: EvidenceSlot["status"]; hasFile: boolean }
    >();
    for (const row of evidenceRows ?? []) {
      if (!row.control_id) continue;
      const key = `${row.control_id}::${row.name}`;
      evidenceByKey.set(key, {
        id: row.id,
        status: row.status,
        hasFile: row.storage_path != null,
      });
    }

    const slots: EvidenceSlot[] = [];
    for (const ac of assessmentControls) {
      const control = ac.controls;
      if (!control) continue;

      for (const evidenceName of control.required_evidences) {
        const key = `${control.id}::${evidenceName}`;
        const existing = evidenceByKey.get(key);
        slots.push({
          controlId: control.id,
          controlCode: control.code,
          controlName: control.name,
          evidenceName,
          evidenceId: existing?.id ?? null,
          status: existing?.status ?? "missing",
          hasFile: existing?.hasFile ?? false,
        });
      }
    }

    return slots;
  } catch (cause) {
    console.error("[load-evidences] loadClientEvidences no disponible:", cause);
    return [];
  }
}
