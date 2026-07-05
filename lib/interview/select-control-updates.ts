import {
  mapAnswersToControlStatus,
  type ControlStatus,
  type CriterionAnswer,
} from "@/lib/interview/auto-map";

/**
 * Selección pura de qué controles materializar hacia `assessment_controls`.
 * Excluye los controles cuyo estado resuelto es "pending" (la sesión no los
 * evaluó — `normalizeAnswers` rellena TODO el catálogo con "unknown" para no
 * romper la vista, así que un control "pending" solo significa "sin tocar").
 * Escribir esos controles pisaría el progreso del checklist (misma tabla
 * `assessment_controls`) con "pending" cada vez que se materializa/re-toma
 * el diagnóstico — bug corregido acá: solo se propagan controles evaluados.
 */

export type ControlStatusUpdate = { controlCode: string; status: ControlStatus };

export function selectControlUpdates(
  compliance: Record<string, CriterionAnswer[]>,
): ControlStatusUpdate[] {
  const updates: ControlStatusUpdate[] = [];
  for (const controlCode of Object.keys(compliance)) {
    const status = mapAnswersToControlStatus(compliance[controlCode]);
    if (status === "pending") continue;
    updates.push({ controlCode, status });
  }
  return updates;
}
