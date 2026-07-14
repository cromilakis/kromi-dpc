import {
  DEEP_DIVE_BRANCHES,
  INFERENCE_RULES,
  SCREENING_NODES,
  computeFullDiagnosis,
  walkScreening,
} from "@/lib/legal";
import type { ComplexityFactor, SizeTier } from "@/lib/companies/schema";
import type { DiagnosisAnswers } from "@/lib/diagnosis/snapshot";

/** Tramo del cuestionario (S-001) → tramo de empresa. */
const SIZE_MAP: Record<string, SizeTier> = {
  micro: "micro",
  pequena: "micro",
  mediana: "small",
  grande: "enterprise",
};

/** Rubro del cuestionario (S-002) → código de sector del catálogo. */
const RUBRO_MAP: Record<string, string> = {
  retail: "retail",
  salud: "salud",
  financiero: "fintech",
  tecnologia: "startup",
  rrhh: "b2b",
  educacion: "otro",
  otro: "otro",
};

/** Factor de riesgo del diagnóstico → factor de complejidad del alta. */
const FACTOR_MAP: Record<string, ComplexityFactor> = {
  sensitive_data: "sensitive_data",
  biometric_data: "sensitive_data",
  international_transfers: "international_transfers",
  critical_providers: "critical_providers",
  automated_decisions: "automated_decisions",
  multi_site: "multi_site",
};

/**
 * Deriva la clasificación de la empresa (tamaño, rubro, factores) desde las
 * respuestas del cuestionario. Fuente única usada por el wizard (cliente, para
 * mostrar) y por la server action (servidor, autoritativo). Los factores salen
 * de los riskFactors que calcula el motor a partir de TODAS las respuestas.
 */
export function deriveClassification(answers: DiagnosisAnswers): {
  sizeTier: SizeTier;
  sectorCode: string;
  factors: ComplexityFactor[];
} {
  const sizeValue =
    answers.screening.find((a) => a.nodeId === "S-001")?.value ?? "";
  const sizeTier = SIZE_MAP[sizeValue] ?? "micro";

  const sectorCode =
    answers.screening
      .filter((a) => a.nodeId === "S-002")
      .map((a) => RUBRO_MAP[a.value])
      .find(Boolean) ?? "otro";

  const walked = walkScreening(SCREENING_NODES, answers.screening);
  const result = computeFullDiagnosis(
    walked,
    INFERENCE_RULES,
    DEEP_DIVE_BRANCHES,
    answers.deepDive,
  );
  const factors = Array.from(
    new Set(
      result.riskFactors
        .map((f) => FACTOR_MAP[f])
        .filter((f): f is ComplexityFactor => Boolean(f)),
    ),
  );

  return { sizeTier, sectorCode, factors };
}
