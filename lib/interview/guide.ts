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
  uncovered: Array<{ domainCode: string; controlCode: string; controlName: string }>;
}

/**
 * Criterio v1 (deliberadamente laxo, documentado): un control está
 * "cubierto" si tiene AL MENOS UN criterio respondido con algo distinto de
 * 'unknown' — no exige que todos los criterios del control estén resueltos.
 * Esto marca "sin cubrir" solo los controles que la entrevista no tocó en
 * absoluto, que es lo que le importa al consultor al cerrar la reunión
 * ("¿de qué no hablamos?"). Endurecer el criterio (exigir todos los
 * criterios respondidos) queda para una iteración futura si se necesita.
 * 'flagged' cuenta como respuesta (!= 'unknown'): un control con criterios
 * en alerta también se considera cubierto.
 *
 * Reusada tanto por `computeGuideCoverage` como por `buildQuestionQueue`
 * para no duplicar la regla.
 */
function isControlCovered(controlCode: string, compliance: Record<string, string[]>): boolean {
  const answers = compliance[controlCode] ?? [];
  return answers.some((answer) => answer !== "unknown");
}

/**
 * Calcula la cobertura del guion contra las respuestas de cumplimiento en
 * vivo (`answers.compliance`, `Record<controlCode, CriterionAnswer[]>`).
 */
export function computeGuideCoverage(
  guide: GuideDomain[],
  compliance: Record<string, string[]>,
): GuideCoverage {
  let total = 0;
  let covered = 0;
  const uncovered: GuideCoverage["uncovered"] = [];

  for (const domain of guide) {
    for (const control of domain.controls) {
      total += 1;
      if (isControlCovered(control.code, compliance)) {
        covered += 1;
      } else {
        uncovered.push({
          domainCode: domain.domainCode,
          controlCode: control.code,
          controlName: control.name,
        });
      }
    }
  }

  return { total, covered, uncovered };
}

export interface QueuedQuestion {
  domainCode: string;
  domainName: string;
  controlCode: string;
  controlName: string;
  question: string;
  answered: boolean;
}

/**
 * Aplana el guion a una cola de preguntas por control (dominio → control →
 * cada `question` del control), marcando `answered` según el mismo criterio
 * de cobertura que `computeGuideCoverage` (`isControlCovered`). Ordena las
 * no respondidas primero (en orden de dominio→control→índice de pregunta),
 * luego las respondidas: la primera del arreglo es "la siguiente pregunta".
 */
export function buildQuestionQueue(
  guide: GuideDomain[],
  compliance: Record<string, string[]>,
): QueuedQuestion[] {
  const unanswered: QueuedQuestion[] = [];
  const answered: QueuedQuestion[] = [];

  for (const domain of guide) {
    for (const control of domain.controls) {
      const covered = isControlCovered(control.code, compliance);
      for (const question of control.questions) {
        const queued: QueuedQuestion = {
          domainCode: domain.domainCode,
          domainName: domain.domainName,
          controlCode: control.code,
          controlName: control.name,
          question,
          answered: covered,
        };
        (covered ? answered : unanswered).push(queued);
      }
    }
  }

  return [...unanswered, ...answered];
}
