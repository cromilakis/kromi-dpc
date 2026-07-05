import type { DiagnosisAnswers } from "@/lib/interview/answers-schema";
import type { CriterionAnswer } from "@/lib/interview/auto-map";
import type { ComplianceQuestion } from "@/lib/interview/questions";
import { ratActivitySchema, type RatActivity } from "@/lib/interview/rat-schema";

/**
 * Normaliza `interview_sessions.answers` (Json crudo, tal como vuelve de
 * `open_diagnosis`/la lectura autenticada) contra las preguntas vigentes del
 * catálogo: filas RAT inválidas se descartan (la validación real ya corrió
 * en el server al guardar) y los controles que la sesión aún no cubre se
 * completan en "unknown" en vez de romper la vista.
 *
 * Compartida entre el modo asistido (`DiagnosisManager`,
 * consultor autenticado) y el modo self por token (`PublicDiagnosisManager`)
 * — misma forma canónica de `answers` en ambos (Tareas 6-8).
 */

const CRITERION_ANSWERS: readonly CriterionAnswer[] = ["yes", "partial", "no", "unknown"];

function isCriterionAnswer(value: unknown): value is CriterionAnswer {
  return typeof value === "string" && (CRITERION_ANSWERS as readonly string[]).includes(value);
}

export function normalizeAnswers(
  raw: unknown,
  questions: ComplianceQuestion[],
): DiagnosisAnswers {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const ratParsed = ratActivitySchema.array().safeParse(obj.rat);
  const rat: RatActivity[] = ratParsed.success ? ratParsed.data : [];

  const complianceRaw =
    obj.compliance && typeof obj.compliance === "object"
      ? (obj.compliance as Record<string, unknown>)
      : {};
  const compliance: Record<string, CriterionAnswer[]> = {};
  for (const question of questions) {
    const existingRaw = complianceRaw[question.controlCode];
    const existing = Array.isArray(existingRaw) ? existingRaw : [];
    compliance[question.controlCode] = question.criteria.map((_, index) =>
      isCriterionAnswer(existing[index]) ? existing[index] : "unknown",
    );
  }
  return { rat, compliance };
}
