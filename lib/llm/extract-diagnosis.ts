import { z } from "zod";

import { chatJSON, LlmError, type ChatMessage } from "@/lib/llm/deepseek";
import { LEGAL_BASES } from "@/lib/interview/rat-schema";
import type { ControlLike } from "@/lib/interview/questions";

const ratFieldsSchema = z
  .object({
    area: z.string().optional(),
    name: z.string().optional(),
    purpose: z.string().optional(),
    legalBasis: z.enum(LEGAL_BASES).optional(),
    dataCategories: z.array(z.string()).optional(),
    dataSubjects: z.array(z.string()).optional(),
    source: z.string().optional(),
    recipients: z.array(z.string()).optional(),
    processors: z.array(z.string()).optional(),
    intlTransfer: z.boolean().optional(),
    intlCountries: z.array(z.string()).optional(),
    retention: z.string().optional(),
    securityMeasures: z.array(z.string()).optional(),
    isSensitive: z.boolean().optional(),
  })
  .strict();

const ratSuggestionSchema = z.object({
  fields: ratFieldsSchema,
  evidence: z.record(z.string(), z.string()),
});

const complianceSuggestionSchema = z.object({
  controlCode: z.string(),
  criterionIndex: z.number().int().min(0),
  answer: z.enum(["yes", "partial", "no"]),
  evidence: z.string().min(1),
});

const unassignedSchema = z.object({ text: z.string(), reason: z.string() });

export const extractionResultSchema = z.object({
  rat: z.array(ratSuggestionSchema),
  compliance: z.array(complianceSuggestionSchema),
  unassigned: z.array(unassignedSchema),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;

const SYSTEM_PROMPT = `Eres un asistente que extrae información ESTRICTAMENTE explícita de una transcripción de reunión sobre tratamiento de datos personales (Ley 21.719, Chile), para llenar un Registro de Actividades de Tratamiento (RAT) y un checklist de cumplimiento.

Reglas DURAS (no negociables):
1. Solo incluyes lo que fue dicho EXPLÍCITAMENTE en la transcripción. Nunca infieras, asumas ni completes con conocimiento general.
2. Cada campo o respuesta que propongas DEBE tener una cita textual exacta (copiada de la transcripción) en "evidence" que la respalde.
3. Si no hay una cita textual clara para un dato, NO lo incluyas en "rat" ni en "compliance"; en su lugar, agrégalo a "unassigned" explicando el motivo.
4. Para "compliance", solo referencia controles y criterios que aparezcan en el catálogo entregado, usando exactamente el "controlCode" y el índice ("criterionIndex", empezando en 0) del criterio correspondiente.
5. Responde ÚNICAMENTE con un JSON válido, sin texto adicional, con exactamente esta forma:
{
  "rat": [ { "fields": { ... subconjunto de campos del RAT ... }, "evidence": { "campo": "cita textual" } } ],
  "compliance": [ { "controlCode": "string", "criterionIndex": 0, "answer": "yes"|"partial"|"no", "evidence": "cita textual" } ],
  "unassigned": [ { "text": "fragmento o idea", "reason": "motivo por el que no se pudo asignar" } ]
}
6. Los campos válidos de "fields" son: area, name, purpose, legalBasis (uno de: ${LEGAL_BASES.join(", ")}), dataCategories, dataSubjects, source, recipients, processors, intlTransfer, intlCountries, retention, securityMeasures, isSensitive. No incluyas otros campos.
7. No inventes controlCode ni criterionIndex que no estén en el catálogo entregado.`;

function formatControlsCatalog(controls: ControlLike[]): string {
  return controls
    .map((c) => {
      const criteria = c.verification_criteria
        .map((crit, i) => `[${i}] ${crit}`)
        .join(" | ");
      return `[${c.code}] ${c.name} — criterios: ${criteria}`;
    })
    .join("\n");
}

export function buildExtractionPrompt(args: {
  transcript: string;
  controls: ControlLike[];
}): ChatMessage[] {
  const { transcript, controls } = args;
  const catalog = formatControlsCatalog(controls);
  const userContent = `Transcripción de la reunión (delimitada por <<<TRANSCRIPCION>>>):
<<<TRANSCRIPCION>>>
${transcript}
<<<TRANSCRIPCION>>>

Catálogo de controles disponibles (usa el "controlCode" entre corchetes y el índice de criterio entre corchetes):
${catalog}

Extrae la información según las reglas del sistema y responde solo con el JSON pedido.`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];
}

export function sanitizeExtraction(
  raw: unknown,
  controls: ControlLike[],
): ExtractionResult {
  const parsed = extractionResultSchema.parse(raw);

  const unassigned = [...parsed.unassigned];
  const rat: ExtractionResult["rat"] = [];
  const compliance: ExtractionResult["compliance"] = [];

  for (const suggestion of parsed.rat) {
    const evidenceKeys = Object.keys(suggestion.evidence);
    const fieldKeys = Object.keys(suggestion.fields) as Array<
      keyof typeof suggestion.fields
    >;
    const hasEvidence = evidenceKeys.length > 0;
    const evidenceMatchesFields =
      hasEvidence &&
      evidenceKeys.every((key) =>
        fieldKeys.includes(key as keyof typeof suggestion.fields),
      );

    if (hasEvidence && evidenceMatchesFields) {
      rat.push(suggestion);
    } else {
      unassigned.push({
        text: JSON.stringify(suggestion.fields),
        reason: "sin evidencia textual",
      });
    }
  }

  const controlsByCode = new Map(controls.map((c) => [c.code, c]));

  for (const suggestion of parsed.compliance) {
    const control = controlsByCode.get(suggestion.controlCode);
    const hasEvidence = suggestion.evidence.trim().length > 0;
    const controlExists = control !== undefined;
    const indexInRange =
      controlExists &&
      suggestion.criterionIndex >= 0 &&
      suggestion.criterionIndex < control.verification_criteria.length;

    if (controlExists && indexInRange && hasEvidence) {
      compliance.push(suggestion);
    } else {
      const reason = !controlExists
        ? "control inexistente en el catálogo"
        : !indexInRange
          ? "criterionIndex fuera de rango"
          : "sin evidencia textual";
      unassigned.push({
        text: `${suggestion.controlCode} [${suggestion.criterionIndex}]: ${suggestion.answer}`,
        reason,
      });
    }
  }

  return { rat, compliance, unassigned };
}

export async function extractDiagnosis(args: {
  transcript: string;
  controls: ControlLike[];
}): Promise<ExtractionResult> {
  const messages = buildExtractionPrompt(args);

  async function attempt(): Promise<ExtractionResult> {
    const { content } = await chatJSON(messages);
    const parsedJson = JSON.parse(content) as unknown;
    return sanitizeExtraction(parsedJson, args.controls);
  }

  try {
    return await attempt();
  } catch (cause) {
    if (cause instanceof LlmError && cause.code === "llm_disabled") {
      throw cause;
    }
    try {
      return await attempt();
    } catch {
      throw new LlmError("llm_failed");
    }
  }
}
