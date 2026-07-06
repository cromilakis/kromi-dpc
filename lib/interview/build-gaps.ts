import type { RemediationGap } from "@/lib/llm/propose-remediation";

/**
 * Arma la lista de gaps (criterios incumplidos) del diagnóstico a partir del
 * borrador de cumplimiento de la sesión, para alimentar la propuesta de
 * resolución (Fase 2). Solo cuentan como gap los veredictos `no`/`partial` y las
 * alertas `flagged`; `yes` está OK y `unknown`/ausente NO es gap (sigue siendo
 * pregunta pendiente de la cola, no algo a remediar).
 *
 * Recibe SOLO los controles aplicables a la empresa (ya filtrados por el caller
 * con la misma aplicabilidad que la extracción), para no proponer sobre
 * controles que no corresponden.
 */

const GAP_TYPES = new Set(["no", "partial", "flagged"]);

export function buildGaps(
  compliance: Record<string, string[]>,
  controls: Array<{ code: string; name: string; criteria: string[] }>,
): RemediationGap[] {
  const gaps: RemediationGap[] = [];
  for (const control of controls) {
    const answers = compliance[control.code] ?? [];
    control.criteria.forEach((criterion, criterionIndex) => {
      const a = answers[criterionIndex];
      if (!GAP_TYPES.has(a)) return;
      gaps.push({
        controlCode: control.code,
        controlName: control.name,
        criterionIndex,
        criterion,
        gapType: a as RemediationGap["gapType"],
      });
    });
  }
  return gaps;
}
