/**
 * Stub DEMO de la server action del autoevaluador, para el build estático de
 * GitHub Pages (output: export no soporta server actions). El workflow de
 * Pages lo copia sobre self-assessment.ts antes de compilar.
 *
 * Devuelve siempre { ok: false, error: "unavailable" }: la UI ya degrada con
 * gracia mostrando el resultado y sugiriendo el contacto por WhatsApp.
 * La estimación del autoevaluador es 100% client-side, así que la demo es
 * funcional salvo la persistencia del lead.
 */

export type SubmitSelfAssessmentResult =
  | { ok: true }
  | { ok: false; error: "validation" | "unavailable" };

export async function submitSelfAssessment(
  _input: unknown,
): Promise<SubmitSelfAssessmentResult> {
  return { ok: false, error: "unavailable" };
}
