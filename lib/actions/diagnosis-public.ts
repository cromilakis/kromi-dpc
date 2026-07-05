"use server";

import { z } from "zod";
import { diagnosisAnswersSchema, type DiagnosisAnswers } from "@/lib/interview/answers-schema";
import type { ComplianceQuestion } from "@/lib/interview/questions";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

/**
 * Server actions del modo self del diagnóstico (acceso por enlace con
 * token, SIN cuenta — RFC "autodiagnóstico"). A diferencia de
 * `lib/actions/interview.ts` (modo asistido, consultor autenticado), estas
 * actions corren con el cliente ANON: la autorización no viene de RLS sobre
 * las tablas (un visitante anon no puede leer `interview_sessions`,
 * `share_links` ni `controls`) sino de los RPC `SECURITY DEFINER`
 * `open_diagnosis` / `diagnosis_questions` / `save_diagnosis_answers`
 * (migración `20260705120000_interview.sql`), que resuelven el token contra
 * su hash SHA-256 y exponen SOLO la sesión objetivo — jamás otras empresas,
 * ni el complexity_score ni ningún otro dato interno.
 *
 * `answers` sigue la misma forma canónica que el modo asistido
 * (`{ rat: RatActivity[], compliance: Record<controlCode, CriterionAnswer[]> }`,
 * ver `diagnosisAnswersSchema` en `interview.ts`) — `save_diagnosis_answers`
 * también reemplaza el objeto completo, nunca un patch parcial.
 */

type InterviewStatus = Database["public"]["Enums"]["interview_status"];

const tokenSchema = z.string().min(1);

export type LoadPublicDiagnosisResult =
  | {
      ok: true;
      companyName: string;
      status: InterviewStatus;
      answers: unknown;
      questions: ComplianceQuestion[];
    }
  | { ok: false };

export type SavePublicDiagnosisError = "validation" | "invalid_token" | "unavailable";

export type SavePublicDiagnosisResult =
  | { ok: true }
  | { ok: false; error: SavePublicDiagnosisError };

/**
 * Carga el estado de una sesión de autodiagnóstico por token: llama
 * `open_diagnosis` (sesión + empresa) y `diagnosis_questions` (catálogo de
 * controles con criterios) en paralelo. Nunca expone más que
 * `companyName`/`status`/`answers`/`questions` — ningún otro campo de
 * `companies` ni `interview_sessions` llega al cliente.
 */
export async function loadPublicDiagnosis(
  token: string,
): Promise<LoadPublicDiagnosisResult> {
  const parsedToken = tokenSchema.safeParse(token);
  if (!parsedToken.success) return { ok: false };

  try {
    const supabase = await createClient();
    const [sessionRes, questionsRes] = await Promise.all([
      supabase.rpc("open_diagnosis", { p_token: parsedToken.data }),
      supabase.rpc("diagnosis_questions", { p_token: parsedToken.data }),
    ]);

    if (sessionRes.error) {
      console.error(
        "[diagnosis-public] RPC open_diagnosis falló:",
        sessionRes.error.message,
      );
      return { ok: false };
    }
    if (questionsRes.error) {
      console.error(
        "[diagnosis-public] RPC diagnosis_questions falló:",
        questionsRes.error.message,
      );
      return { ok: false };
    }

    const session = (sessionRes.data ?? [])[0];
    if (!session) return { ok: false };

    const questions: ComplianceQuestion[] = (questionsRes.data ?? []).map((row) => ({
      controlCode: row.code,
      controlName: row.name,
      criteria: row.verification_criteria,
    }));

    return {
      ok: true,
      companyName: session.company_name,
      status: session.status,
      answers: session.answers,
      questions,
    };
  } catch (cause) {
    console.error("[diagnosis-public] loadPublicDiagnosis no disponible:", cause);
    return { ok: false };
  }
}

/**
 * Autoguardado del modo self: valida la forma completa de `answers` con Zod
 * ANTES de llamar al RPC (nunca se confía en el cliente) y reemplaza el
 * objeto completo vía `save_diagnosis_answers`. El RPC lanza
 * `invalid_or_expired_token` si el enlace ya no es válido (revocado,
 * expirado o la sesión salió de draft/in_progress) — se traduce a un error
 * tipado en vez de dejar escapar el mensaje crudo de Postgres.
 */
export async function savePublicDiagnosis(
  token: string,
  answers: DiagnosisAnswers,
): Promise<SavePublicDiagnosisResult> {
  const parsedToken = tokenSchema.safeParse(token);
  const parsedAnswers = diagnosisAnswersSchema.safeParse(answers);
  if (!parsedToken.success || !parsedAnswers.success) {
    return { ok: false, error: "validation" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_diagnosis_answers", {
      p_token: parsedToken.data,
      p_answers: parsedAnswers.data as never,
    });
    if (error) {
      if (error.message.includes("invalid_or_expired_token")) {
        return { ok: false, error: "invalid_token" };
      }
      console.error(
        "[diagnosis-public] RPC save_diagnosis_answers falló:",
        error.message,
      );
      return { ok: false, error: "unavailable" };
    }
    return { ok: true };
  } catch (cause) {
    console.error("[diagnosis-public] savePublicDiagnosis no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
