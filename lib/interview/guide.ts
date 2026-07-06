import { controlApplies, type AppliesWhen } from "@/lib/interview/applicability";

/**
 * Guion de entrevista dinámico (spec `2026-07-05-interview-guide-design.md`,
 * Task 2): helpers puros que arman el guion de preguntas —agrupado por
 * dominio, solo controles aplicables a la empresa— y calculan cobertura a
 * partir de las respuestas de cumplimiento en vivo. Sin I/O: el loader
 * (`load-guide.server.ts`) es quien trae los datos de Supabase.
 */

export interface GuideControl {
  code: string;
  name: string;
  questions: string[];
  criteria: string[];
}

export interface GuideDomain {
  domainCode: string;
  domainName: string;
  controls: GuideControl[];
}

/** Insumo crudo (ya "aplanado") para un control, tal como lo entrega el loader. */
export interface GuideControlInput {
  code: string;
  name: string;
  sort: number;
  questions: string[];
  criteria: string[];
  domainCode: string;
  domainName: string;
  domainSort: number;
  appliesWhen: AppliesWhen;
}

/**
 * Arma el guion: filtra los controles aplicables a los factores de la
 * empresa (`controlApplies`), los agrupa por dominio (ordenado por
 * `domainSort`, controles ordenados por `sort` dentro de cada dominio) y
 * descarta los dominios que queden sin ningún control aplicable.
 */
export function buildInterviewGuide(
  controls: GuideControlInput[],
  factors: string[],
): GuideDomain[] {
  const applicable = controls.filter((control) =>
    controlApplies(control.appliesWhen, factors),
  );

  const domains = new Map<
    string,
    {
      domainName: string;
      domainSort: number;
      controls: Array<GuideControl & { sort: number }>;
    }
  >();

  for (const control of applicable) {
    const domain = domains.get(control.domainCode) ?? {
      domainName: control.domainName,
      domainSort: control.domainSort,
      controls: [],
    };
    domain.controls.push({
      code: control.code,
      name: control.name,
      questions: control.questions,
      criteria: control.criteria,
      sort: control.sort,
    });
    domains.set(control.domainCode, domain);
  }

  return Array.from(domains.entries())
    .sort(([, a], [, b]) => a.domainSort - b.domainSort)
    .map(([domainCode, domain]) => ({
      domainCode,
      domainName: domain.domainName,
      controls: domain.controls
        .slice()
        .sort((a, b) => a.sort - b.sort)
        .map(({ sort: _sort, ...control }) => control),
    }));
}

export interface GuideCoverage {
  total: number;
  covered: number;
  /** Controles tocados pero aún NO resueltos (algún 'flagged'/sin evaluar). */
  clarify: number;
  uncovered: Array<{ domainCode: string; controlCode: string; controlName: string }>;
}

/** Estado de un control frente a las respuestas de cumplimiento en vivo:
 * - "resolved": TODOS sus criterios tienen veredicto (yes/partial/no).
 * - "clarify": se tocó (algún veredicto o alerta 'flagged') pero NO está
 *   resuelto del todo. La reunión es la ÚNICA instancia de aclaración, así que
 *   estos deben INSISTIRSE hasta resolverlos — no debe quedar ningún 'flagged'.
 * - "pending": no se tocó ningún criterio (todos 'unknown').
 * Reusado por computeGuideCoverage y buildQuestionQueue. */
export type ControlStatus = "pending" | "clarify" | "resolved";

const VERDICTS = new Set(["yes", "partial", "no"]);

function controlStatus(
  control: GuideControl,
  compliance: Record<string, string[]>,
): ControlStatus {
  const answers = compliance[control.code] ?? [];
  const n = control.criteria.length;
  if (n === 0) return "resolved"; // sin criterios que evaluar
  let verdicts = 0;
  let touched = 0;
  for (let i = 0; i < n; i++) {
    const a = answers[i];
    if (VERDICTS.has(a)) {
      verdicts += 1;
      touched += 1;
    } else if (a === "flagged") {
      touched += 1;
    }
  }
  if (verdicts === n) return "resolved";
  return touched > 0 ? "clarify" : "pending";
}

/**
 * Calcula la cobertura del guion contra las respuestas de cumplimiento en
 * vivo. "Cubierto" = RESUELTO (todos los criterios con veredicto). Un control
 * en "clarify" (con algún 'flagged'/sin evaluar) cuenta como NO cubierto: la
 * cobertura solo llega a completa cuando no queda nada por aclarar.
 */
export function computeGuideCoverage(
  guide: GuideDomain[],
  compliance: Record<string, string[]>,
): GuideCoverage {
  let total = 0;
  let covered = 0;
  let clarify = 0;
  const uncovered: GuideCoverage["uncovered"] = [];

  for (const domain of guide) {
    for (const control of domain.controls) {
      total += 1;
      const status = controlStatus(control, compliance);
      if (status === "resolved") {
        covered += 1;
      } else {
        if (status === "clarify") clarify += 1;
        uncovered.push({
          domainCode: domain.domainCode,
          controlCode: control.code,
          controlName: control.name,
        });
      }
    }
  }

  return { total, covered, clarify, uncovered };
}

export interface QueuedQuestion {
  domainCode: string;
  domainName: string;
  controlCode: string;
  controlName: string;
  question: string;
  status: ControlStatus;
}

/**
 * Aplana el guion a una cola de preguntas por control, marcando el `status`
 * del control (pending/clarify/resolved). Orden: primero las que hay que
 * INSISTIR ("clarify"), luego las no tocadas ("pending"), y al final las
 * resueltas ("resolved"). Así lo que quedó ambiguo en la reunión queda arriba
 * y a la vista hasta resolverlo; la primera del arreglo es "la siguiente".
 */
export function buildQuestionQueue(
  guide: GuideDomain[],
  compliance: Record<string, string[]>,
): QueuedQuestion[] {
  const order: Record<ControlStatus, number> = { clarify: 0, pending: 1, resolved: 2 };
  const queue: QueuedQuestion[] = [];

  for (const domain of guide) {
    for (const control of domain.controls) {
      const status = controlStatus(control, compliance);
      for (const question of control.questions) {
        queue.push({
          domainCode: domain.domainCode,
          domainName: domain.domainName,
          controlCode: control.code,
          controlName: control.name,
          question,
          status,
        });
      }
    }
  }

  // Orden estable por prioridad de estado (clarify → pending → resolved).
  return queue
    .map((q, i) => ({ q, i }))
    .sort((a, b) => order[a.q.status] - order[b.q.status] || a.i - b.i)
    .map(({ q }) => q);
}
