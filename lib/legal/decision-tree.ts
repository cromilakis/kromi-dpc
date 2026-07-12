/**
 * Tipos base del árbol de decisión para el diagnóstico de cumplimiento.
 *
 * El árbol se organiza en tres fases:
 *   1. SCREENING — preguntas amplias que clasifican a la empresa.
 *   2. DEEP DIVE — preguntas condicionales de seguimiento por rama activada.
 *   3. INFERENCE — reglas de detección cruzada de brechas no declaradas.
 *
 * Cada pregunta, respuesta o regla puede disparar una o más brechas
 * (BreachDescriptor) que referencian artículos específicos de la ley,
 * verificados contra el texto promulgado de la Ley 21.719 (BCN idNorma=1209272).
 */

// ---------------------------------------------------------------------------
// Severidad
// ---------------------------------------------------------------------------

export type Severity = "critico" | "alto" | "medio" | "bajo";

// ---------------------------------------------------------------------------
// Brecha
// ---------------------------------------------------------------------------

export interface BreachDescriptor {
  /** Identificador único de la brecha (ej. "B-SEG-003"). */
  id: string;
  /** Descripción de la brecha en lenguaje no técnico. */
  description: string;
  /** Severidad de la brecha. */
  severity: Severity;
  /** Artículo(s) infringido(s) con texto exacto del promulgado. */
  articles: string[];
  /** Rango de multa en UTM (min, max). */
  fineRangeUtn: { min: number; max: number };
  /** Semanas estimadas de mitigación. */
  estimatedWeeks: number;
  /** Dimensión del toolkit (1-10). */
  dimension: number;
}

// ---------------------------------------------------------------------------
// Nodo de screening (fase 1)
// ---------------------------------------------------------------------------

export interface ScreeningAnswerOption {
  /** Valor que el usuario selecciona (ej. "si", "no", "parcialmente"). */
  value: string;
  /** Etiqueta visible. */
  label: string;
  /**
   * Ramas de deep-dive que se activan al seleccionar esta respuesta.
   * Cada string es un `DeepDiveBranch.id`.
   */
  activatesBranches?: string[];
  /**
   * Brechas que se disparan directamente al seleccionar esta respuesta.
   * Una respuesta "no" a "¿Tiene contrato con proveedores?" dispara la brecha
   * de Art. 15 bis inmediatamente.
   */
  triggersBreaches?: BreachDescriptor[];
  /**
   * ID del siguiente nodo de screening (para preguntas condicionales).
   * Si no se especifica, el árbol sigue al siguiente nodo en secuencia.
   */
  nextNodeId?: string;
}

export interface ScreeningNode {
  /** Identificador único (ej. "S-001"). */
  id: string;
  /** Texto de la pregunta. */
  question: string;
  /** Dimensión del toolkit (1-10). */
  dimension: number;
  /** Factor de riesgo asociado (ej. "sensitive_data", "international_transfers"). */
  riskFactor?: string;
  /** Opciones de respuesta. */
  answers: ScreeningAnswerOption[];
  /** Este nodo aplica solo si la empresa tiene este factor de riesgo. */
  appliesIfFactor?: string;
  /**
   * "Marca todas las que apliquen": el usuario puede seleccionar varias
   * opciones. Se acumulan las brechas, ramas y factores de todas las
   * marcadas. Las opciones con `nextNodeId` no son compatibles con multi.
   */
  multiple?: boolean;
  /**
   * Habilita un campo de texto libre opcional (además de las opciones) para
   * situaciones que las opciones no cubren. El texto se captura para revisión
   * posterior (por un especialista o IA); no dispara brechas automáticamente.
   */
  allowCustom?: boolean;
}

// ---------------------------------------------------------------------------
// Rama de deep-dive (fase 2)
// ---------------------------------------------------------------------------

export interface DeepDiveQuestionOption {
  value: string;
  label: string;
  /** Brecha disparada al seleccionar esta respuesta. */
  breach?: BreachDescriptor;
}

export interface DeepDiveQuestion {
  id: string;
  question: string;
  answers: DeepDiveQuestionOption[];
  /**
   * "Marca todas las que apliquen": el usuario puede seleccionar varias
   * opciones y se acumulan las brechas de todas las marcadas.
   */
  multiple?: boolean;
  /**
   * Habilita un campo de texto libre opcional para situaciones que las
   * opciones no cubren. Se captura para revisión posterior; no dispara brechas.
   */
  allowCustom?: boolean;
}

export interface DeepDiveBranch {
  /** Identificador único (ej. "DD-PROVEEDORES"). */
  id: string;
  /** Nombre visible de la rama. */
  name: string;
  /** Dimensión del toolkit. */
  dimension: number;
  /**
   * Condición que activa esta rama: { questionId, answer }.
   * La rama se activa cuando el usuario selecciona `answer` en `questionId`.
   */
  triggerCondition: { questionId: string; answer: string };
  /** Preguntas de seguimiento de esta rama. */
  questions: DeepDiveQuestion[];
}

// ---------------------------------------------------------------------------
// Regla de inferencia (fase 3)
// ---------------------------------------------------------------------------

/**
 * Una regla de inferencia detecta brechas que el usuario no declaró
 * explícitamente, cruzando dos o más respuestas.
 *
 * Ejemplo: si el usuario dice que maneja datos de salud Y que usa Gmail
 * personal para guardarlos, se infiere una brecha crítica de seguridad.
 */
export interface InferenceRule {
  id: string;
  /** Descripción de la regla para debugging. */
  description: string;
  /**
   * Condiciones que deben cumplirse TODAS para que la regla se active.
   * Cada entrada es [nodeId, answerValue].
   */
  conditions: Array<{ nodeId: string; answer: string }>;
  /** Brecha inferida. */
  breach: BreachDescriptor;
}

// ---------------------------------------------------------------------------
// Árbol completo
// ---------------------------------------------------------------------------

export interface DecisionTree {
  screeningNodes: ScreeningNode[];
  deepDiveBranches: DeepDiveBranch[];
  inferenceRules: InferenceRule[];
}

// ---------------------------------------------------------------------------
// Resultado del diagnóstico
// ---------------------------------------------------------------------------

export type RiskLevel = "critico" | "alto" | "medio" | "bajo";

export interface ScreeningResult {
  /** Nivel de riesgo global. */
  riskLevel: RiskLevel;
  /** Brechas detectadas en screening + deep-dive + inferencia. */
  breaches: BreachDescriptor[];
  /** Total de brechas (conveniencia, mismo que breaches.length). */
  totalBreaches: number;
  /** Brechas agrupadas por severidad. */
  bySeverity: Record<Severity, number>;
  /** Rango estimado de multa total (CLP). */
  fineRange: { min: number; max: number };
  /** Semanas estimadas de mitigación. */
  estimatedWeeks: number;
  /** Ramas de deep-dive activadas para continuar. */
  activatedBranches: string[];
  /** Factores de riesgo detectados. */
  riskFactors: string[];
}

/**
 * Umbrales UTM → CLP.
 * UTM julio 2026 ≈ $67,294 (aproximado, se actualiza anualmente).
 */
export const UTM_CLP = 67_294;

export const FINE_RANGES: Record<Severity, { min: number; max: number }> = {
  critico: { min: 5_000, max: 20_000 },
  alto: { min: 2_000, max: 10_000 },
  medio: { min: 500, max: 5_000 },
  bajo: { min: 100, max: 2_000 },
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
};
