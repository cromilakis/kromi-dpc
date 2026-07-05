"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { diagnosisAnswersSchema, type DiagnosisAnswers } from "@/lib/interview/answers-schema";
import { generateShareToken, hashShareToken } from "@/lib/share/token";
import { selectControlUpdates } from "@/lib/interview/select-control-updates";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/types";

export type { DiagnosisAnswers };

/**
 * Server actions del módulo entrevista/diagnóstico (spec diagnóstico, risk
 * high: alimenta el checklist y la elegibilidad de certificación).
 * Doctrina aplicada en cada action (mismo criterio que assessments.ts /
 * certificates.ts / evidences.ts):
 * 1. "use server" + Zod ANTES de tocar datos.
 * 2. Verificación de sesión (defensa en profundidad además de la RLS, que ya
 *    exige is_consultant() en processing_activities / interview_sessions /
 *    share_links / assessment_controls).
 * 3. Mutación + insert en audit_log en toda operación sensible. PostgREST no
 *    da transacción entre ambas escrituras: si el rastro falla se loggea con
 *    contexto completo sin revertir la mutación primaria.
 * 4. revalidatePath de las vistas afectadas.
 *
 * Forma canónica de `interview_sessions.answers` (Tareas 6-8):
 *   { rat: RatActivity[], compliance: Record<controlCode, CriterionAnswer[]> }
 * `saveDiagnosisDraft` y `save_diagnosis_answers` (función SQL del modo self)
 * SIEMPRE reemplazan el objeto `answers` completo — nunca un patch parcial.
 */

export type InterviewActionError =
  | "validation"
  | "unauthorized"
  | "not_found"
  | "unavailable";

export type CreateDiagnosisSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: InterviewActionError };

export type CreateDiagnosisShareLinkResult =
  | { ok: true; url: string }
  | { ok: false; error: InterviewActionError };

export type SaveDiagnosisDraftResult =
  | { ok: true }
  | { ok: false; error: InterviewActionError };

export type MaterializeDiagnosisResult =
  | { ok: true }
  | { ok: false; error: InterviewActionError };

const companyIdSchema = z.object({ companyId: z.uuid() });
const sessionIdSchema = z.object({ sessionId: z.uuid() });

const createShareLinkSchema = z.object({
  sessionId: z.uuid(),
  companyId: z.uuid(),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

const saveDraftSchema = z.object({
  sessionId: z.uuid(),
  answers: diagnosisAnswersSchema,
});

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
      `[interview] audit_log (${entry.action}, id=${entry.entityId}) falló:`,
      error.message,
    );
  }
}

/**
 * Asegura una `assessment` abierta para la empresa (reusa la de mayor `cycle`
 * en status='open'; si no hay ninguna, abre un ciclo nuevo = max(cycle)+1,
 * mismo criterio de "ciclo" que companies.ts / load-eligibility.server.ts) y
 * crea sobre ella una `interview_sessions` en modo asistido.
 */
export async function createDiagnosisSession(
  companyId: string,
): Promise<CreateDiagnosisSessionResult> {
  const parsed = companyIdSchema.safeParse({ companyId });
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", parsed.data.companyId)
      .maybeSingle();
    if (companyError) {
      console.error("[interview] lectura de empresa falló:", companyError.message);
      return { ok: false, error: "unavailable" };
    }
    if (!company) return { ok: false, error: "not_found" };

    const { data: openAssessment, error: openError } = await supabase
      .from("assessments")
      .select("id")
      .eq("company_id", company.id)
      .eq("status", "open")
      .order("cycle", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (openError) {
      console.error(
        "[interview] chequeo de assessment abierto falló:",
        openError.message,
      );
      return { ok: false, error: "unavailable" };
    }

    let assessmentId = openAssessment?.id ?? null;

    if (!assessmentId) {
      const { data: latest, error: latestError } = await supabase
        .from("assessments")
        .select("cycle")
        .eq("company_id", company.id)
        .order("cycle", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) {
        console.error(
          "[interview] lectura de último ciclo falló:",
          latestError.message,
        );
        return { ok: false, error: "unavailable" };
      }

      const nextCycle = (latest?.cycle ?? 0) + 1;
      const { data: created, error: createError } = await supabase
        .from("assessments")
        .insert({ company_id: company.id, cycle: nextCycle, status: "open" })
        .select("id")
        .single();
      if (createError || !created) {
        console.error(
          "[interview] insert de nuevo ciclo falló:",
          createError?.message,
        );
        return { ok: false, error: "unavailable" };
      }
      assessmentId = created.id;
    }

    const { data: session, error: sessionError } = await supabase
      .from("interview_sessions")
      .insert({
        company_id: company.id,
        assessment_id: assessmentId,
        mode: "assisted",
        status: "draft",
      })
      .select("id")
      .single();
    if (sessionError || !session) {
      console.error(
        "[interview] insert de sesión falló:",
        sessionError?.message,
      );
      return { ok: false, error: "unavailable" };
    }

    await insertAuditLog(supabase, {
      actorId: user.id,
      action: "interview.session_created",
      entity: "interview_sessions",
      entityId: session.id,
      detail: { company_id: company.id, assessment_id: assessmentId },
    });

    return { ok: true, sessionId: session.id };
  } catch (cause) {
    console.error("[interview] createDiagnosisSession no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Genera un link de auto-diagnóstico (modo self, sin cuenta): token plano
 * devuelto UNA sola vez, solo el hash se persiste en `share_links`
 * (kind='diagnosis', target_id=sessionId — resuelto por open_diagnosis/
 * save_diagnosis_answers en la migración de entrevista).
 */
export async function createDiagnosisShareLink(
  sessionId: string,
  companyId: string,
  expiresInDays?: number,
): Promise<CreateDiagnosisShareLinkResult> {
  const parsed = createShareLinkSchema.safeParse({
    sessionId,
    companyId,
    expiresInDays,
  });
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: session, error: sessionError } = await supabase
      .from("interview_sessions")
      .select("id, company_id")
      .eq("id", parsed.data.sessionId)
      .eq("company_id", parsed.data.companyId)
      .maybeSingle();
    if (sessionError) {
      console.error(
        "[interview] lectura de sesión para compartir falló:",
        sessionError.message,
      );
      return { ok: false, error: "unavailable" };
    }
    if (!session) return { ok: false, error: "not_found" };

    const token = generateShareToken();
    const tokenHash = hashShareToken(token);
    const expiresAt = parsed.data.expiresInDays
      ? new Date(
          Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000,
        ).toISOString()
      : null;

    const { data: link, error: linkError } = await supabase
      .from("share_links")
      .insert({
        company_id: session.company_id,
        kind: "diagnosis",
        target_id: session.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (linkError || !link) {
      console.error(
        "[interview] insert de share_link falló:",
        linkError?.message,
      );
      return { ok: false, error: "unavailable" };
    }

    await insertAuditLog(supabase, {
      actorId: user.id,
      action: "interview.share_link_created",
      entity: "share_links",
      entityId: link.id,
      detail: {
        company_id: session.company_id,
        session_id: session.id,
        expires_at: expiresAt,
      },
    });

    // El token en claro solo existe en esta respuesta — no se persiste.
    return { ok: true, url: `/diagnosis/${token}` };
  } catch (cause) {
    console.error(
      "[interview] createDiagnosisShareLink no disponible:",
      cause,
    );
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Autosave del consultor durante la entrevista asistida: reemplaza el objeto
 * `answers` completo (nunca un patch) y marca la sesión en curso.
 */
export async function saveDiagnosisDraft(
  sessionId: string,
  answers: unknown,
): Promise<SaveDiagnosisDraftResult> {
  const parsed = saveDraftSchema.safeParse({ sessionId, answers });
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: session, error: sessionError } = await supabase
      .from("interview_sessions")
      .select("id")
      .eq("id", parsed.data.sessionId)
      .maybeSingle();
    if (sessionError) {
      console.error(
        "[interview] lectura de sesión para guardar borrador falló:",
        sessionError.message,
      );
      return { ok: false, error: "unavailable" };
    }
    if (!session) return { ok: false, error: "not_found" };

    const { error: updateError } = await supabase
      .from("interview_sessions")
      .update({
        answers: parsed.data.answers as never,
        status: "in_progress",
      })
      .eq("id", session.id);
    if (updateError) {
      console.error(
        "[interview] update de borrador falló:",
        updateError.message,
      );
      return { ok: false, error: "unavailable" };
    }

    return { ok: true };
  } catch (cause) {
    console.error("[interview] saveDiagnosisDraft no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Vuelca las respuestas de la sesión al modelo operativo:
 * - `answers.rat[]` → `processing_activities` (camelCase → snake_case).
 *   Idempotente por DELETE-then-INSERT scoped a `source_session_id`: una
 *   empresa puede tener más de una `interview_sessions` (ciclos/re-tomas), así
 *   que el scope debe ser la sesión que originó las filas — no `company_id` —
 *   para no borrar RAT materializado por otra sesión de la misma empresa.
 * - `answers.compliance[controlCode]` → `mapAnswersToControlStatus` →
 *   upsert de `assessment_controls` con onConflict=(assessment_id,control_id)
 *   (unique existente en la tabla, ver migración de operaciones) — también
 *   idempotente.
 * Al final marca la sesión 'reviewed', revalida diagnóstico + checklist y
 * deja rastro en audit_log.
 */
export async function materializeDiagnosis(
  sessionId: string,
): Promise<MaterializeDiagnosisResult> {
  const parsed = sessionIdSchema.safeParse({ sessionId });
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    const { data: session, error: sessionError } = await supabase
      .from("interview_sessions")
      .select("id, company_id, assessment_id, answers")
      .eq("id", parsed.data.sessionId)
      .maybeSingle();
    if (sessionError) {
      console.error(
        "[interview] lectura de sesión para materializar falló:",
        sessionError.message,
      );
      return { ok: false, error: "unavailable" };
    }
    if (!session) return { ok: false, error: "not_found" };
    if (!session.assessment_id) {
      // Sin assessment vinculado no hay dónde escribir assessment_controls.
      console.error(
        `[interview] sesión ${session.id} sin assessment_id: no se puede materializar`,
      );
      return { ok: false, error: "unavailable" };
    }
    const assessmentId = session.assessment_id;

    const answersParsed = diagnosisAnswersSchema.safeParse(session.answers);
    if (!answersParsed.success) {
      console.error(
        `[interview] answers de la sesión ${session.id} no calzan con el esquema:`,
        answersParsed.error.message,
      );
      return { ok: false, error: "validation" };
    }
    const answers = answersParsed.data;

    // 1. RAT → processing_activities (delete-then-insert por source_session_id).
    const { error: deleteError } = await supabase
      .from("processing_activities")
      .delete()
      .eq("source_session_id", session.id);
    if (deleteError) {
      console.error(
        "[interview] limpieza de processing_activities falló:",
        deleteError.message,
      );
      return { ok: false, error: "unavailable" };
    }

    if (answers.rat.length > 0) {
      const rows: TablesInsert<"processing_activities">[] = answers.rat.map(
        (activity) => ({
          company_id: session.company_id,
          source_session_id: session.id,
          area: activity.area,
          name: activity.name,
          purpose: activity.purpose,
          legal_basis: activity.legalBasis,
          data_categories: activity.dataCategories,
          data_subjects: activity.dataSubjects,
          source: activity.source,
          recipients: activity.recipients,
          processors: activity.processors,
          intl_transfer: activity.intlTransfer,
          intl_countries: activity.intlCountries,
          retention: activity.retention,
          security_measures: activity.securityMeasures,
          is_sensitive: activity.isSensitive,
          notes: activity.notes ?? null,
        }),
      );
      const { error: insertRatError } = await supabase
        .from("processing_activities")
        .insert(rows);
      if (insertRatError) {
        console.error(
          "[interview] insert de processing_activities falló:",
          insertRatError.message,
        );
        return { ok: false, error: "unavailable" };
      }
    }

    // 2. compliance[controlCode] → assessment_controls (upsert idempotente).
    // Solo se propagan controles EVALUADOS por la sesión (selectControlUpdates
    // descarta los "pending" — normalizeAnswers rellena todo el catálogo con
    // "unknown", así que un control sin tocar no debe pisar el progreso que
    // ya tenga el checklist en la misma tabla `assessment_controls`).
    const controlUpdates = selectControlUpdates(answers.compliance);
    const controlCodes = controlUpdates.map((u) => u.controlCode);
    if (controlCodes.length > 0) {
      const { data: controls, error: controlsError } = await supabase
        .from("controls")
        .select("id, code")
        .in("code", controlCodes);
      if (controlsError) {
        console.error(
          "[interview] resolución de controles por código falló:",
          controlsError.message,
        );
        return { ok: false, error: "unavailable" };
      }

      const codeToId = new Map((controls ?? []).map((c) => [c.code, c.id]));
      const now = new Date().toISOString();
      const upsertRows: TablesInsert<"assessment_controls">[] = controlUpdates
        .filter((update) => codeToId.has(update.controlCode))
        .map((update) => ({
          assessment_id: assessmentId,
          control_id: codeToId.get(update.controlCode)!,
          status: update.status,
          evaluated_at: now,
        }));

      if (upsertRows.length > 0) {
        const { error: upsertError } = await supabase
          .from("assessment_controls")
          .upsert(upsertRows, { onConflict: "assessment_id,control_id" });
        if (upsertError) {
          console.error(
            "[interview] upsert de assessment_controls falló:",
            upsertError.message,
          );
          return { ok: false, error: "unavailable" };
        }
      }
    }

    // 3. Sesión → reviewed.
    const reviewedAt = new Date().toISOString();
    const { error: reviewError } = await supabase
      .from("interview_sessions")
      .update({ status: "reviewed", reviewed_at: reviewedAt })
      .eq("id", session.id);
    if (reviewError) {
      console.error(
        "[interview] update a reviewed falló:",
        reviewError.message,
      );
      return { ok: false, error: "unavailable" };
    }

    await insertAuditLog(supabase, {
      actorId: user.id,
      action: "interview.materialized",
      entity: "interview_sessions",
      entityId: session.id,
      detail: {
        company_id: session.company_id,
        assessment_id: assessmentId,
        rat_count: answers.rat.length,
        compliance_controls: controlCodes.length,
      },
    });

    revalidatePath(`/app/companies/${session.company_id}/diagnosis`);
    revalidatePath(`/app/companies/${session.company_id}/checklist`);

    return { ok: true };
  } catch (cause) {
    console.error("[interview] materializeDiagnosis no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
