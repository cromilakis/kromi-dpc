import { z } from "zod";
import { isValidRut } from "./rut";

/**
 * Contratos Zod del módulo empresas (spec "empresas", risk high).
 * Compartidos entre el wizard cliente (validación por paso, UX) y las server
 * actions (revalidación TOTAL en servidor — jamás se confía en el cliente).
 * Acá NO hay pesos del Complexity Score (server-only, scoring.server.ts).
 */

/** Tramos Ley 20.416 — espejo del enum company_size_tier de la base. */
export const SIZE_TIERS = ["micro", "small", "enterprise"] as const;
export type SizeTier = (typeof SIZE_TIERS)[number];

/** Fases del ciclo de servicio — espejo del enum company_phase de la base. */
export const COMPANY_PHASES = [
  "diagnostico",
  "propuesta",
  "certificacion",
  "revalidacion",
] as const;
export type CompanyPhase = (typeof COMPANY_PHASES)[number];

/**
 * Factores de complejidad del alta (RFC §14.3): datos sensibles,
 * transferencias internacionales, decisiones automatizadas/IA, multi-sede,
 * proveedores/encargados críticos y madurez inicial baja (partir de cero).
 * "Rubro regulado" NO es checkbox: lo aporta el multiplicador sectorial.
 */
export const COMPLEXITY_FACTORS = [
  "sensitive_data",
  "international_transfers",
  "automated_decisions",
  "multi_site",
  "critical_providers",
  "low_maturity",
] as const;
export type ComplexityFactor = (typeof COMPLEXITY_FACTORS)[number];

/** Campo de texto opcional: "" del formulario → undefined. */
const optionalTrimmed = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

/** Paso 1 — Identificación (razón social, RUT con DV, contacto). */
export const identificationSchema = z.object({
  name: z.string().trim().min(3).max(160),
  rut: z
    .string()
    .trim()
    .min(8)
    .max(13)
    .refine(isValidRut, { message: "invalid_rut" }),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.email().max(320).optional(),
  ),
  contactPhone: optionalTrimmed(30),
});

/**
 * Paso 2 — Clasificación. sectorCode se valida en forma acá y contra la
 * tabla sectors en la action (el catálogo vive en la base, no se duplica).
 */
export const classificationSchema = z.object({
  sectorCode: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_-]+$/),
  sizeTier: z.enum(SIZE_TIERS),
  employeesCount: z.number().int().min(0).max(1_000_000),
});

/** Paso 3 — Factores de complejidad (checkboxes RFC §14.3). */
export const complexitySchema = z.object({
  factors: z.array(z.enum(COMPLEXITY_FACTORS)).max(COMPLEXITY_FACTORS.length),
});

/** Payload completo de createCompany (pasos 1-3; el 4 es confirmación). */
export const createCompanySchema = z.object({
  ...identificationSchema.shape,
  ...classificationSchema.shape,
  ...complexitySchema.shape,
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

/** updateCompanyPhase — cambio de fase del ciclo (mutación sensible). */
export const updateCompanyPhaseSchema = z.object({
  companyId: z.uuid(),
  phase: z.enum(COMPANY_PHASES),
});

// NOTA: la edición parcial de la ficha (updateCompany) se eliminó junto con
// su schema: no existe UI que la consuma y una server action exportada sin
// consumidor queda expuesta como endpoint activo. Reintroducir schema+action
// cuando exista el formulario de edición de ficha.
