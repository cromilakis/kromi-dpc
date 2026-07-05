import { z } from "zod";

import { chatJSON, LlmError, type ChatMessage } from "@/lib/llm/deepseek";
import { LEGAL_BASES } from "@/lib/interview/rat-schema";
import type { ControlLike } from "@/lib/interview/questions";

// Campo de lista tolerante: el LLM a veces devuelve un string suelto donde el
// RAT espera string[] (p. ej. dataSubjects: "clientes"). Se normaliza a arreglo
// —coerción segura, no inventa datos— en vez de descartar la actividad entera.
const stringArrayField = z
  .preprocess(
    (v) => (typeof v === "string" ? (v.trim() ? [v] : []) : v),
    z.array(z.string()),
  )
  .optional();

// `fields` SIN `.strict()`: si el LLM agrega una llave no reconocida, Zod la
// descarta en vez de tumbar todo el item (parseo tolerante). `legalBasis` con
// `.catch(undefined)`: si viene un valor fuera del enum (p. ej. "contrato
// (implícito...)"), se descarta ese campo en vez de invalidar la actividad.
const ratFieldsSchema = z.object({
  area: z.string().optional(),
  name: z.string().optional(),
  purpose: z.string().optional(),
  legalBasis: z.enum(LEGAL_BASES).optional().catch(undefined),
  dataCategories: stringArrayField,
  dataSubjects: stringArrayField,
  source: z.string().optional(),
  recipients: stringArrayField,
  processors: stringArrayField,
  intlTransfer: z.boolean().optional(),
  intlCountries: stringArrayField,
  retention: z.string().optional(),
  securityMeasures: stringArrayField,
  isSensitive: z.boolean().optional(),
});

const ratSuggestionSchema = z.object({
  fields: ratFieldsSchema,
  // Default {} para que un item sin evidencia PARSEE y sea descartado a
  // `unassigned` por sanitizeExtraction, en vez de romper la extracción entera.
  evidence: z.record(z.string(), z.string()).default({}),
});

const complianceSuggestionSchema = z.object({
  controlCode: z.string(),
  criterionIndex: z.number().int().min(0),
  answer: z.enum(["yes", "partial", "no"]),
  evidence: z.string().default(""),
});

const unassignedSchema = z.object({ text: z.string(), reason: z.string() });

// Forma canónica de salida (todas las listas presentes) — tipo de retorno.
export const extractionResultSchema = z.object({
  rat: z.array(ratSuggestionSchema),
  compliance: z.array(complianceSuggestionSchema),
  unassigned: z.array(unassignedSchema),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;

// Schema de ENTRADA tolerante: cada lista top-level cae a [] si falta o no es
// arreglo; cada elemento se valida individualmente en sanitizeExtraction. Así
// ninguna respuesta JSON válida del LLM (con llaves faltantes o de más) tumba
// toda la extracción — el determinismo se aplica descartando lo que no calza,
// no fallando en bloque.
const rawExtractionSchema = z
  .object({
    rat: z.array(z.unknown()).catch([]).default([]),
    compliance: z.array(z.unknown()).catch([]).default([]),
    unassigned: z.array(z.unknown()).catch([]).default([]),
  })
  .catch({ rat: [], compliance: [], unassigned: [] });

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
  // Parseo tolerante: nunca lanza para un objeto JSON — las listas ausentes o
  // mal formadas caen a []; cada elemento se valida individualmente abajo.
  const top = rawExtractionSchema.parse(raw);

  const unassigned: ExtractionResult["unassigned"] = [];
  const rat: ExtractionResult["rat"] = [];
  const compliance: ExtractionResult["compliance"] = [];

  for (const item of top.unassigned) {
    const parsed = unassignedSchema.safeParse(item);
    if (parsed.success) unassigned.push(parsed.data);
  }

  for (const item of top.rat) {
    const parsed = ratSuggestionSchema.safeParse(item);
    if (!parsed.success) {
      unassigned.push({ text: JSON.stringify(item), reason: "formato inválido" });
      continue;
    }
    const { fields, evidence } = parsed.data;
    // Se conservan SOLO los campos con una cita textual de respaldo (no vacía).
    // Un campo sin evidencia se descarta; una cita sin campo se ignora. Así se
    // acepta lo trazable sin tirar toda la actividad por un campo sin respaldo.
    const backedFields: Record<string, unknown> = {};
    const backedEvidence: Record<string, string> = {};
    for (const key of Object.keys(fields)) {
      const cite = evidence[key];
      const value = (fields as Record<string, unknown>)[key];
      if (value !== undefined && typeof cite === "string" && cite.trim()) {
        backedFields[key] = value;
        backedEvidence[key] = cite;
      }
    }

    if (Object.keys(backedFields).length > 0) {
      rat.push({
        fields: backedFields as ExtractionResult["rat"][number]["fields"],
        evidence: backedEvidence,
      });
    } else {
      unassigned.push({
        text: JSON.stringify(fields),
        reason: "sin evidencia textual",
      });
    }
  }

  const controlsByCode = new Map(controls.map((c) => [c.code, c]));

  for (const item of top.compliance) {
    const parsed = complianceSuggestionSchema.safeParse(item);
    if (!parsed.success) {
      unassigned.push({ text: JSON.stringify(item), reason: "formato inválido" });
      continue;
    }
    const suggestion = parsed.data;
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
