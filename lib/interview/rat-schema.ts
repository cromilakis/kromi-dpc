import { z } from "zod";

// Bases de licitud (Ley 21.719, Art. 12/13). Validar redacción con abogado.
export const LEGAL_BASES = [
  "consentimiento", "contrato", "obligacion_legal",
  "interes_legitimo", "interes_vital", "funcion_publica",
] as const;

export const ratActivitySchema = z.object({
  area: z.string().min(1),
  name: z.string().min(1),
  purpose: z.string().min(1),
  legalBasis: z.enum(LEGAL_BASES),
  dataCategories: z.array(z.string()).default([]),
  dataSubjects: z.array(z.string()).default([]),
  source: z.string().default(""),
  recipients: z.array(z.string()).default([]),
  processors: z.array(z.string()).default([]),
  intlTransfer: z.boolean().default(false),
  intlCountries: z.array(z.string()).default([]),
  retention: z.string().default(""),
  securityMeasures: z.array(z.string()).default([]),
  isSensitive: z.boolean().default(false),
  notes: z.string().optional(),
});

export type RatActivity = z.infer<typeof ratActivitySchema>;
