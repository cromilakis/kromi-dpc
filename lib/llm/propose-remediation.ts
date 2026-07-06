import { z } from "zod";

import { chatJSON, LlmError, type ChatMessage } from "@/lib/llm/deepseek";

/**
 * Propuesta de resolución estructurada (Fase 2, spec
 * `2026-07-06-live-queue-opener-and-resolution-proposal-design.md` §B). Helper
 * puro que, dados los CRITERIOS INCUMPLIDOS (gaps) del diagnóstico, pide a
 * DeepSeek una acción concreta por gap + prioridad/esfuerzo/plazo sugeridos.
 *
 * Cero asunciones (NO NEGOCIABLE): la acción se ancla al criterio incumplido;
 * el LLM no inventa hechos de la empresa. `sanitizeProposal` descarta cualquier
 * item sin acción con sentido o que no corresponda a un gap enviado. El humano
 * revisa/edita y acepta por tarjeta (la persistencia vive en las server actions).
 */

export interface RemediationGap {
  controlCode: string;
  controlName: string;
  criterionIndex: number;
  criterion: string;
  gapType: "no" | "partial" | "flagged";
}

// priority/effort fuera de enum -> default seguro (no tumba el item); el humano
// edita. gapType con .catch para tolerar ruido del LLM (se corrige contra el
// gap real en sanitizeProposal). suggestedDueWeeks coercible y acotado.
export const proposalItemSchema = z.object({
  controlCode: z.string(),
  criterionIndex: z.number().int().min(0),
  gapType: z.enum(["no", "partial", "flagged"]).catch("partial"),
  action: z.string().default(""),
  priority: z.enum(["alta", "media", "baja"]).catch("media"),
  effort: z.enum(["bajo", "medio", "alto"]).catch("medio"),
  suggestedDueWeeks: z.coerce.number().int().min(1).max(52).catch(4),
  rationale: z.string().default(""),
});
export type ProposalItem = z.infer<typeof proposalItemSchema>;

const responseSchema = z.object({
  items: z.array(proposalItemSchema).default([]),
});

const SYSTEM_PROMPT = `Eres un asistente que propone acciones de remediación para gaps de cumplimiento de la Ley 21.719 (Chile). Recibes una lista de CRITERIOS INCUMPLIDOS (gaps) y para CADA UNO propones una acción concreta para satisfacerlo.

REGLAS (NO NEGOCIABLES):
1. NO inventes hechos de la empresa. Solo sabes que el criterio está incumplido; propón la acción que lo satisface, en imperativo, concreta y accionable.
2. Si no puedes proponer una acción con sentido para un gap, deja "action" vacío ("").
3. "priority": alta | media | baja. Guía: gapType "no" -> alta; "flagged" -> media; "partial" -> media. Ajusta con criterio, pero no inventes urgencias externas.
4. "effort": bajo | medio | alto (estimación gruesa de esfuerzo de implementación).
5. "suggestedDueWeeks": entero de semanas sugeridas (1..52).
6. "rationale": una frase que referencia el criterio incumplido. Sin datos inventados.
7. Responde SOLO JSON: { "items": [ { "controlCode", "criterionIndex", "gapType", "action", "priority", "effort", "suggestedDueWeeks", "rationale" } ] }. Un item por gap recibido, con el mismo controlCode y criterionIndex.`;

export function buildProposalPrompt(gaps: RemediationGap[]): ChatMessage[] {
  const lines = gaps
    .map(
      (g) =>
        `- control ${g.controlCode} (${g.controlName}), criterionIndex ${g.criterionIndex}, ` +
        `gapType ${g.gapType}: "${g.criterion}"`,
    )
    .join("\n");
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Gaps (criterios incumplidos):\n${lines}` },
  ];
}

/**
 * Valida y filtra la respuesta del LLM contra los gaps que se enviaron:
 * - descarta items que no correspondan a un gap enviado (controlCode#criterionIndex),
 * - dedupe por gap,
 * - descarta items sin acción con sentido (action vacía tras trim).
 */
export function sanitizeProposal(
  raw: unknown,
  gaps: RemediationGap[],
): ProposalItem[] {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) return [];
  const allowed = new Set(gaps.map((g) => `${g.controlCode}#${g.criterionIndex}`));
  const seen = new Set<string>();
  const out: ProposalItem[] = [];
  for (const item of parsed.data.items) {
    const key = `${item.controlCode}#${item.criterionIndex}`;
    if (!allowed.has(key)) continue; // no corresponde a un gap enviado
    if (seen.has(key)) continue; // dedupe por gap
    if (!item.action.trim()) continue; // sin acción con sentido -> se descarta
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Genera la propuesta. Sin gaps -> [] sin llamar al LLM. Un reintento ante
 * fallo transitorio; `llm_disabled` se propaga tal cual (clave ausente).
 */
export async function proposeRemediation(
  gaps: RemediationGap[],
): Promise<ProposalItem[]> {
  if (gaps.length === 0) return [];
  const messages = buildProposalPrompt(gaps);

  async function attempt(): Promise<ProposalItem[]> {
    const { content } = await chatJSON(messages);
    return sanitizeProposal(JSON.parse(content) as unknown, gaps);
  }

  try {
    return await attempt();
  } catch (cause) {
    if (cause instanceof LlmError && cause.code === "llm_disabled") throw cause;
    try {
      return await attempt();
    } catch {
      throw new LlmError("llm_failed");
    }
  }
}
