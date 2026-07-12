/**
 * lib/legal — Motor de diagnóstico de cumplimiento en protección de datos.
 *
 * Basado en la Ley 21.719 (texto promulgado, BCN idNorma=1209272) y el
 * ecosistema normativo chileno. Árbol de decisión en tres fases:
 *
 *   1. SCREENING (15 preguntas) → clasifica el perfil de riesgo
 *   2. DEEP DIVE (11 ramas condicionales) → seguimiento específico
 *   3. INFERENCE (16 reglas de detección cruzada) → brechas no declaradas
 *
 * Uso:
 *   import { SCREENING_NODES, DEEP_DIVE_BRANCHES, walkScreening,
 *            computeScreeningResult, computeFullDiagnosis } from "@/lib/legal";
 */

export type {
  ScreeningNode,
  ScreeningAnswerOption,
  BreachDescriptor,
  DecisionTree,
  ScreeningResult,
  RiskLevel,
  Severity,
  InferenceRule,
  DeepDiveBranch,
  DeepDiveQuestion,
} from "./decision-tree";

export { UTM_CLP, FINE_RANGES, RISK_LEVEL_LABELS } from "./decision-tree";

export { SCREENING_NODES, SCREENING_BREACHES, RISK_FACTOR_LABELS } from "./screening-nodes";

export { DEEP_DIVE_BRANCHES } from "./deep-dive-branches";

export { INFERENCE_RULES } from "./inference-rules";

export {
  walkScreening,
  getNextScreeningNode,
  collectBreaches,
  computeRiskLevel,
  countBySeverity,
  computeFineRange,
  computeEstimatedWeeks,
  computeScreeningResult,
  formatFineRange,
  getRiskColor,
  getActiveBranches,
  collectDeepDiveBreaches,
  computeFullDiagnosis,
  groupBreachesByAreaSeverity,
  BREACH_AREA_LABELS,
} from "./tree-engine";

export type {
  ScreeningAnswer,
  WalkedNode,
  DeepDiveAnswer,
  FullDiagnosisResult,
  BreachAreaGroup,
} from "./tree-engine";
