import { z } from "zod";
import type { CriterionAnswer } from "@/lib/interview/auto-map";
import { ratActivitySchema } from "@/lib/interview/rat-schema";

/**
 * Forma canónica de `interview_sessions.answers` (Tareas 6-8):
 *   { rat: RatActivity[], compliance: Record<controlCode, CriterionAnswer[]> }
 * Fuente única de verdad, importada tanto por `lib/actions/interview.ts`
 * (modo asistido, consultor autenticado) como por
 * `lib/actions/diagnosis-public.ts` (modo self por token) — MISMO esquema de
 * validación en ambos modos.
 *
 * Vive fuera de los archivos "use server": esos archivos solo pueden
 * exportar funciones async (una constante Zod exportada rompe el build:
 * "A 'use server' file can only export async functions, found object").
 */

export const criterionAnswerSchema = z.enum([
  "yes",
  "partial",
  "no",
  "unknown",
  "flagged",
] as const satisfies readonly CriterionAnswer[]);

export const diagnosisAnswersSchema = z.object({
  rat: z.array(ratActivitySchema),
  compliance: z.record(z.string(), z.array(criterionAnswerSchema)),
  // Overrides del consultor a la aplicabilidad calculada (Tarea 4): clave =
  // controlCode, true = forzar incluir en la entrevista, false = forzar
  // "No aplica". Opcional y retrocompatible: sesiones/empresas existentes sin
  // este campo siguen parseando (el default se recalcula desde los factores).
  applicability: z.record(z.string(), z.boolean()).optional(),
});

export type DiagnosisAnswers = z.infer<typeof diagnosisAnswersSchema>;
