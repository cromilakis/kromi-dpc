import { z } from "zod";
import { identificationSchema } from "@/lib/companies/schema";
import { isDummyRut } from "@/lib/companies/rut";

/**
 * Contrato del alta asistida por el consultor (identidad + respuestas del
 * cuestionario). Vive fuera del archivo "use server" (que solo exporta
 * funciones async) para ser testeable e importable por la server action.
 *
 * Revalida en el servidor las MISMAS reglas que el flujo valida en cliente
 * (contacto mínimo: correo o teléfono; RUT real, no de relleno), para no
 * depender solo del cliente.
 */
const answersSchema = z.object({
  screening: z
    .array(z.strictObject({ nodeId: z.string().max(200), value: z.string().max(200) }))
    .max(200),
  deepDive: z
    .array(
      z.strictObject({
        questionId: z.string().max(200),
        branchId: z.string().max(200),
        value: z.string().max(200),
      }),
    )
    .max(200),
});

export const assistedDiagnosisInputSchema = z
  .strictObject({
    ...identificationSchema.shape,
    answers: answersSchema,
  })
  // Contacto mínimo: al menos correo o teléfono (contactable).
  .refine((data) => Boolean(data.contactEmail || data.contactPhone), {
    message: "contact_required",
    path: ["contactEmail"],
  })
  // Anti-relleno: rechaza RUTs falsos obvios (11111111-1, 12345678-5, etc.).
  .refine((data) => !isDummyRut(data.rut), {
    message: "dummy_rut",
    path: ["rut"],
  });

export type AssistedDiagnosisInput = z.infer<typeof assistedDiagnosisInputSchema>;
