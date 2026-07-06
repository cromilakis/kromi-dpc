import type { CriterionAnswer } from "@/lib/interview/auto-map";

/**
 * Guion guiado de entrevista (spec `2026-07-06-guion-guiado-design.md`): árbol
 * de decisión determinista de preguntas de opción múltiple. Definido como datos
 * (config versionado). El motor (`engine.ts`) lo recorre y escribe el borrador
 * del diagnóstico. Contenido pendiente de validación consultor/abogado.
 */

/** Efecto de elegir una opción sobre el borrador del diagnóstico. */
export interface OptionEffect {
  /** Criterios de cumplimiento que setea (control + índice de criterio). */
  sets?: Array<{ control: string; criterion: number; answer: CriterionAnswer }>;
  /** Factores de la empresa que declara (alimentan aplicabilidad y ramas). */
  factors?: string[];
}

export interface ScriptOption {
  id: string;
  label: string; // texto de la opción (opción múltiple)
  effect?: OptionEffect;
}

/** Condición para mostrar un nodo (rama dinámica), evaluada contra las
 * respuestas acumuladas y los factores declarados. */
export type ScriptCondition =
  | { anyOption: { node: string; options: string[] } }
  | { hasFactor: string }
  | { not: ScriptCondition }
  | { all: ScriptCondition[] }
  | { any: ScriptCondition[] };

export interface ScriptNode {
  id: string;
  question: string; // texto para el consultor
  clientQuestion?: string; // texto no técnico (portal, fase siguiente)
  help?: string;
  /** Ejemplo concreto que ilustra la pregunta (se muestra al consultor). */
  example?: string;
  multi?: boolean; // permite elegir varias opciones
  allowOther?: boolean; // muestra "Otros" (texto libre)
  /** Criterios que este nodo cubre: si se elige "Otros" o quedan sin veredicto,
   * se marcan 'flagged' (Requiere aclaración). */
  covers?: Array<{ control: string; criterion: number }>;
  condition?: ScriptCondition; // se muestra solo si pasa
  options: ScriptOption[];
}

export interface Script {
  id: string;
  title: string;
  nodes: ScriptNode[]; // orden = orden de presentación
}

/** Estado de respuestas del guion (persistido en `answers.script`). */
export type ScriptAnswers = Record<string, { options: string[]; other?: string }>;
