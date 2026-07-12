/**
 * Motor del árbol de decisión — funciones puras para caminar el screening,
 * calcular brechas, ejecutar reglas de inferencia y generar el resultado
 * público del diagnóstico.
 *
 * Sin efectos secundarios ni I/O: funciona en cliente y servidor.
 */

import type {
  BreachDescriptor,
  DeepDiveBranch,
  DeepDiveQuestion,
  InferenceRule,
  RiskLevel,
  ScreeningNode,
  ScreeningResult,
  Severity,
} from "./decision-tree";
import { FINE_RANGES, UTM_CLP } from "./decision-tree";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

export interface ScreeningAnswer {
  nodeId: string;
  value: string;
}

export interface WalkedNode {
  node: ScreeningNode;
  /**
   * Valores seleccionados en el nodo. Una sola respuesta en preguntas de
   * selección única; varias en preguntas `multiple` ("marca todas las que
   * apliquen"). Se agrupan a partir de las `ScreeningAnswer` con el mismo
   * `nodeId`.
   */
  answers: string[];
}

/**
 * Agrupa respuestas por una clave (nodeId o questionId), acumulando los
 * valores en un arreglo. Soporta varias respuestas por pregunta (multi).
 */
function groupValues<T>(
  items: T[],
  keyOf: (item: T) => string,
  valueOf: (item: T) => string,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of items) {
    const key = keyOf(item);
    const arr = map.get(key) ?? [];
    arr.push(valueOf(item));
    map.set(key, arr);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Navegación del árbol
// ---------------------------------------------------------------------------

/**
 * Determina el siguiente nodo de screening dada una respuesta.
 * Si `appliesIfFactor` requiere un factor que la empresa no tiene, salta
 * al siguiente nodo en la secuencia.
 */
export function getNextScreeningNode(
  currentNode: ScreeningNode,
  answerValue: string,
  allNodes: ScreeningNode[],
  activeFactors: Set<string>,
): ScreeningNode | null {
  // En preguntas multi no se usan saltos por opción (varias opciones podrían
  // pedir destinos distintos): siempre se avanza al siguiente nodo aplicable.
  const answerOption = currentNode.multiple
    ? undefined
    : currentNode.answers.find((a) => a.value === answerValue);
  const explicitNext = answerOption?.nextNodeId;
  if (explicitNext) {
    return allNodes.find((n) => n.id === explicitNext) ?? null;
  }

  const currentIndex = allNodes.findIndex((n) => n.id === currentNode.id);
  if (currentIndex === -1) return null;

  // Buscar el siguiente nodo aplicable
  for (let i = currentIndex + 1; i < allNodes.length; i++) {
    const candidate = allNodes[i];
    if (candidate.appliesIfFactor && !activeFactors.has(candidate.appliesIfFactor)) {
      continue;
    }
    return candidate;
  }
  return null;
}

/**
 * Camina todos los nodos de screening secuencialmente, devolviendo
 * cada nodo con la respuesta seleccionada.
 */
export function walkScreening(
  nodes: ScreeningNode[],
  answers: ScreeningAnswer[],
): WalkedNode[] {
  const answerMap = groupValues(
    answers,
    (a) => a.nodeId,
    (a) => a.value,
  );
  const walked: WalkedNode[] = [];

  // Factores activos a partir de TODAS las opciones marcadas (multi incluido).
  const activeFactors = new Set<string>();
  for (const node of nodes) {
    const vals = answerMap.get(node.id);
    if (!vals?.length) continue;
    for (const val of vals) {
      const option = node.answers.find((a) => a.value === val);
      option?.activatesBranches?.forEach((b) => activeFactors.add(b));
    }
    if (node.riskFactor) activeFactors.add(node.riskFactor);
  }

  let currentNode: ScreeningNode | null = nodes[0];

  while (currentNode) {
    // Verificar si el nodo aplica según sus factores
    if (currentNode.appliesIfFactor && !activeFactors.has(currentNode.appliesIfFactor)) {
      const idx = nodes.findIndex((n) => n.id === currentNode!.id);
      if (idx === -1 || idx >= nodes.length - 1) break;
      currentNode = nodes[idx + 1];
      continue;
    }

    const vals = answerMap.get(currentNode.id);

    // Sin respuesta para este nodo: saltar al siguiente en secuencia.
    if (!vals?.length) {
      const idx = nodes.findIndex((n) => n.id === currentNode!.id);
      if (idx === -1 || idx >= nodes.length - 1) break;
      currentNode = nodes[idx + 1];
      continue;
    }

    walked.push({ node: currentNode, answers: vals });

    // Salto explícito solo en preguntas de selección única.
    const explicitNext: string | undefined = currentNode.multiple
      ? undefined
      : currentNode.answers.find((a) => a.value === vals[0])?.nextNodeId;

    if (explicitNext) {
      currentNode = nodes.find((n) => n.id === explicitNext) ?? null;
    } else {
      // Siguiente nodo secuencial aplicable
      const idx = nodes.findIndex((n) => n.id === currentNode!.id);
      if (idx === -1 || idx >= nodes.length - 1) {
        currentNode = null;
      } else {
        let next: ScreeningNode | null = null;
        for (let i = idx + 1; i < nodes.length; i++) {
          const candidate = nodes[i];
          if (candidate.appliesIfFactor && !activeFactors.has(candidate.appliesIfFactor)) {
            continue;
          }
          next = candidate;
          break;
        }
        currentNode = next;
      }
    }
  }

  return walked;
}

// ---------------------------------------------------------------------------
// Cómputo de brechas
// ---------------------------------------------------------------------------

/**
 * Recoge todas las brechas disparadas directamente por las respuestas
 * de screening, más las brechas inferidas por las reglas.
 */
export function collectBreaches(
  walked: WalkedNode[],
  inferenceRules: InferenceRule[],
): BreachDescriptor[] {
  const answerMap = new Map(walked.map((w) => [w.node.id, w.answers]));
  const breaches = new Map<string, BreachDescriptor>();

  // Brechas directas del screening (todas las opciones marcadas).
  for (const { node, answers } of walked) {
    for (const val of answers) {
      const option = node.answers.find((a) => a.value === val);
      option?.triggersBreaches?.forEach((breach) => breaches.set(breach.id, breach));
    }
  }

  // Brechas inferidas: la condición se cumple si el valor está entre los
  // seleccionados en ese nodo (compatible con selección múltiple).
  for (const rule of inferenceRules) {
    const allMatch = rule.conditions.every((c) =>
      answerMap.get(c.nodeId)?.includes(c.answer),
    );
    if (allMatch) {
      breaches.set(rule.breach.id, rule.breach);
    }
  }

  return Array.from(breaches.values());
}

// ---------------------------------------------------------------------------
// Cálculo de riesgo
// ---------------------------------------------------------------------------

export function computeRiskLevel(breaches: BreachDescriptor[]): RiskLevel {
  const counts = countBySeverity(breaches);
  if (counts.critico >= 3) return "critico";
  if (counts.critico >= 1 || counts.alto >= 4) return "alto";
  if (counts.alto >= 2 || counts.medio >= 5) return "medio";
  return "bajo";
}

export function countBySeverity(
  breaches: BreachDescriptor[],
): Record<Severity, number> {
  return {
    critico: breaches.filter((b) => b.severity === "critico").length,
    alto: breaches.filter((b) => b.severity === "alto").length,
    medio: breaches.filter((b) => b.severity === "medio").length,
    bajo: breaches.filter((b) => b.severity === "bajo").length,
  };
}

/**
 * Rango de multa estimado (CLP). Toma el mínimo plausible (la mitad
 * del mínimo UTM de la brecha menos grave) y el máximo plausible (la
 * suma de los máximos UTM de todas las brechas).
 */
export function computeFineRange(
  breaches: BreachDescriptor[],
): { min: number; max: number } {
  if (breaches.length === 0) return { min: 0, max: 0 };

  // Máximo: suma de los máximos UTM de cada brecha
  const maxUtm = breaches.reduce((sum, b) => sum + b.fineRangeUtn.max, 0);

  // Mínimo: tomar la severidad más baja presente, usar el 50% de su mínimo
  const severities = breaches.map((b) => b.severity);
  if (severities.includes("critico")) {
    // Si hay críticas, el mínimo es 1 infracción grave mínima
    const minUtm = FINE_RANGES.critico.min * 0.5;
    return { min: Math.round(minUtm * UTM_CLP), max: Math.round(maxUtm * UTM_CLP) };
  }
  const minSeverity = severities.reduce((lowest, s) =>
    severityRank(s) > severityRank(lowest) ? s : lowest,
  );
  const minUtm = FINE_RANGES[minSeverity].min * 0.5;

  return { min: Math.round(minUtm * UTM_CLP), max: Math.round(maxUtm * UTM_CLP) };
}

function severityRank(s: Severity): number {
  const ranks: Record<Severity, number> = {
    critico: 3,
    alto: 2,
    medio: 1,
    bajo: 0,
  };
  return ranks[s];
}

/**
 * Semanas estimadas de mitigación: suma de las semanas de cada brecha,
 * con un factor de solapamiento (no todas son secuenciales).
 */
export function computeEstimatedWeeks(breaches: BreachDescriptor[]): number {
  if (breaches.length === 0) return 0;
  const total = breaches.reduce((sum, b) => sum + b.estimatedWeeks, 0);
  // Factor de solapamiento: ~60% del total (varias brechas se mitigan en paralelo)
  return Math.max(1, Math.round(total * 0.6));
}

// ---------------------------------------------------------------------------
// Cómputo del resultado completo
// ---------------------------------------------------------------------------

export function computeScreeningResult(
  walked: WalkedNode[],
  inferenceRules: InferenceRule[],
): ScreeningResult {
  const breaches = collectBreaches(walked, inferenceRules);
  const bySeverity = countBySeverity(breaches);
  const riskLevel = computeRiskLevel(breaches);
  const fineRange = computeFineRange(breaches);
  const estimatedWeeks = computeEstimatedWeeks(breaches);

  // Ramas activadas (por todas las opciones marcadas).
  const activatedBranches = new Set<string>();
  const riskFactors = new Set<string>();
  for (const { node, answers } of walked) {
    for (const val of answers) {
      const option = node.answers.find((a) => a.value === val);
      option?.activatesBranches?.forEach((b) => activatedBranches.add(b));
    }
    if (node.riskFactor) riskFactors.add(node.riskFactor);
  }

  return {
    riskLevel,
    breaches,
    totalBreaches: breaches.length,
    bySeverity,
    fineRange,
    estimatedWeeks,
    activatedBranches: Array.from(activatedBranches),
    riskFactors: Array.from(riskFactors),
  };
}

// ---------------------------------------------------------------------------
// Helpers para la UI
// ---------------------------------------------------------------------------

export function formatFineRange(min: number, max: number): string {
  if (min === 0 && max === 0) return "Sin riesgo detectable";
  const fmt = (n: number) => {
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)} mil millones`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    return `$${n.toLocaleString("es-CL")}`;
  };
  if (min === max) return fmt(min);
  return `${fmt(min)} – ${fmt(max)}`;
}

export function getRiskColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    critico: "#dc2626",
    alto: "#ea580c",
    medio: "#ca8a04",
    bajo: "#16a34a",
  };
  return colors[level];
}

/**
 * Nombre legible del área temática de una brecha, derivado del prefijo de su
 * id (B-<AREA>-nnn). Se usa para el resumen del resultado agrupado por área.
 */
export const BREACH_AREA_LABELS: Record<string, string> = {
  SEG: "Seguridad de la información",
  TER: "Proveedores y encargados",
  LEG: "Consentimiento y base de licitud",
  CON: "Conservación y eliminación de datos",
  SAL: "Datos de salud",
  CCT: "Videovigilancia",
  WEB: "Sitio web y cookies",
  BIO: "Datos biométricos",
  MEN: "Datos de niños, niñas y adolescentes",
  GOB: "Gobernanza y transparencia",
  DER: "Derechos de los titulares",
  CAP: "Capacitación del personal",
};

function areaOf(breachId: string): string {
  const match = breachId.match(/^B-([A-Z]+)-/);
  return match ? match[1] : "OTRO";
}

export interface BreachAreaGroup {
  /** Prefijo del área (ej. "SAL"). */
  area: string;
  /** Nombre legible del área. */
  areaLabel: string;
  severity: Severity;
  count: number;
}

/**
 * Agrupa las brechas por (área temática, severidad) para el resumen del
 * resultado, ordenadas por severidad (crítico→bajo) y luego por cantidad.
 */
export function groupBreachesByAreaSeverity(
  breaches: BreachDescriptor[],
): BreachAreaGroup[] {
  const groups = new Map<string, BreachAreaGroup>();
  for (const breach of breaches) {
    const area = areaOf(breach.id);
    const key = `${area}|${breach.severity}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        area,
        areaLabel: BREACH_AREA_LABELS[area] ?? "Otras áreas",
        severity: breach.severity,
        count: 1,
      });
    }
  }
  return Array.from(groups.values()).sort(
    (a, b) =>
      severityRank(b.severity) - severityRank(a.severity) ||
      b.count - a.count ||
      a.areaLabel.localeCompare(b.areaLabel),
  );
}

// ---------------------------------------------------------------------------
// Deep-dive engine
// ---------------------------------------------------------------------------

export interface DeepDiveAnswer {
  questionId: string;
  branchId: string;
  value: string;
}

/**
 * Devuelve las ramas de deep-dive activadas por las respuestas de screening.
 */
export function getActiveBranches(
  walked: WalkedNode[],
  branches: DeepDiveBranch[],
): DeepDiveBranch[] {
  const activeIds = new Set<string>();
  for (const { node, answers } of walked) {
    for (const val of answers) {
      const option = node.answers.find((a) => a.value === val);
      option?.activatesBranches?.forEach((id) => activeIds.add(id));
    }
  }
  return branches.filter((b) => activeIds.has(b.id));
}

/**
 * Procesa las respuestas de una rama de deep-dive y devuelve las brechas
 * detectadas.
 */
export function collectDeepDiveBreaches(
  branch: DeepDiveBranch,
  answers: DeepDiveAnswer[],
): BreachDescriptor[] {
  const answerMap = groupValues(
    answers,
    (a) => a.questionId,
    (a) => a.value,
  );
  const breaches = new Map<string, BreachDescriptor>();

  for (const question of branch.questions) {
    const vals = answerMap.get(question.id);
    if (!vals?.length) continue;
    for (const val of vals) {
      const option = question.answers.find((a) => a.value === val);
      if (option?.breach) breaches.set(option.breach.id, option.breach);
    }
  }

  return Array.from(breaches.values());
}

/**
 * Resultado completo del diagnóstico (screening + deep-dive + inferencia).
 */
export interface FullDiagnosisResult extends ScreeningResult {
  /** Brechas detectadas en el deep-dive. */
  deepDiveBreaches: BreachDescriptor[];
  /** Ramas de deep-dive procesadas. */
  processedBranches: string[];
}

/**
 * Calcula el resultado completo combinando screening, deep-dive e inferencia.
 */
export function computeFullDiagnosis(
  walked: WalkedNode[],
  inferenceRules: InferenceRule[],
  allBranches: DeepDiveBranch[],
  deepDiveAnswers: DeepDiveAnswer[],
): FullDiagnosisResult {
  const screeningResult = computeScreeningResult(walked, inferenceRules);
  const activeBranches = getActiveBranches(walked, allBranches);

  const allDeepDiveBreaches: BreachDescriptor[] = [];
  const processedBranches: string[] = [];

  for (const branch of activeBranches) {
    const branchAnswers = deepDiveAnswers.filter(
      (a) => a.branchId === branch.id,
    );
    if (branchAnswers.length > 0) {
      const branchBreaches = collectDeepDiveBreaches(branch, branchAnswers);
      for (const b of branchBreaches) {
        allDeepDiveBreaches.push(b);
      }
      processedBranches.push(branch.id);
    }
  }

  // Combinar todas las brechas (sin duplicados por ID)
  const allBreaches = new Map<string, BreachDescriptor>();
  for (const b of screeningResult.breaches) allBreaches.set(b.id, b);
  for (const b of allDeepDiveBreaches) allBreaches.set(b.id, b);

  const combinedBreaches = Array.from(allBreaches.values());
  const totalBySeverity = countBySeverity(combinedBreaches);
  const totalRiskLevel = computeRiskLevel(combinedBreaches);
  const totalFineRange = computeFineRange(combinedBreaches);
  const totalWeeks = computeEstimatedWeeks(combinedBreaches);

  return {
    ...screeningResult,
    breaches: combinedBreaches,
    totalBreaches: combinedBreaches.length,
    bySeverity: totalBySeverity,
    riskLevel: totalRiskLevel,
    fineRange: totalFineRange,
    estimatedWeeks: totalWeeks,
    deepDiveBreaches: allDeepDiveBreaches,
    processedBranches,
  };
}
