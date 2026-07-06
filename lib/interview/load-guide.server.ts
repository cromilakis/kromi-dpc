import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  buildInterviewGuide,
  type GuideControlInput,
  type GuideDomain,
} from "@/lib/interview/guide";
import type { AppliesWhen } from "@/lib/interview/applicability";
import type { Json } from "@/lib/supabase/types";

/**
 * Loader (consultor autenticado) del guion de entrevista de una empresa
 * (spec Task 2). Dos fuentes, en este orden, mismo criterio que
 * `lib/portal/load-evidences.server.ts` / `lib/actions/interview.ts`:
 *
 * 1. **Assessment abierto con `assessment_controls` materializados**: la
 *    aplicabilidad YA quedó resuelta en la entrevista
 *    (`status != 'not_applicable'`), igual que `loadClientEvidences`. Es la
 *    fuente preferida porque respeta los overrides del consultor
 *    (`answers.applicability`) que `selectNotApplicable` ya aplicó.
 * 2. **Fallback — catálogo del sector + `controlApplies`**: si la empresa
 *    todavía no tiene assessment (o no tiene filas de
 *    `assessment_controls` materializadas todavía, p.ej. antes de guardar
 *    la primera respuesta), se recalcula la aplicabilidad desde cero con
 *    `companies.factors` + el catálogo de controles del sector (mismo
 *    `.or(...)` que `createCompany`), para que el guion sirva ANTES de
 *    iniciar la sesión de entrevista.
 *
 * Lectura con el cliente AUTENTICADO: RLS acota `assessments` /
 * `assessment_controls` a la empresa correspondiente y `controls` es
 * catálogo compartido. Si algo falla se devuelve `[]`: el guion es una
 * ayuda para la reunión, no debe romper la página de diagnóstico.
 */

interface RawGuideControl {
  code: string;
  name: string;
  sort: number;
  interview_questions: string[];
  verification_criteria: string[];
  applies_when: Json | null;
  domains: { code: string; name: string; sort: number } | null;
}

function toGuideInputs(rows: RawGuideControl[]): GuideControlInput[] {
  return rows
    .filter((row): row is RawGuideControl & { domains: NonNullable<RawGuideControl["domains"]> } =>
      row.domains != null,
    )
    .map((row) => ({
      code: row.code,
      name: row.name,
      sort: row.sort,
      questions: row.interview_questions,
      criteria: row.verification_criteria,
      domainCode: row.domains.code,
      domainName: row.domains.name,
      domainSort: row.domains.sort,
      appliesWhen: row.applies_when as AppliesWhen,
    }));
}

const CONTROL_COLUMNS =
  "code, name, sort, interview_questions, verification_criteria, applies_when, domains(code, name, sort)";

export async function loadInterviewGuide(companyId: string): Promise<GuideDomain[]> {
  try {
    const supabase = await createClient();

    const { data: company } = await supabase
      .from("companies")
      .select("factors, sectors ( code )")
      .eq("id", companyId)
      .maybeSingle();
    const factors = company?.factors ?? [];
    const sectorCode = company?.sectors?.code ?? null;

    const { data: assessment } = await supabase
      .from("assessments")
      .select("id")
      .eq("company_id", companyId)
      .order("cycle", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assessment) {
      const { data: assessmentControls } = await supabase
        .from("assessment_controls")
        .select(`control_id, status, controls(${CONTROL_COLUMNS})`)
        .eq("assessment_id", assessment.id)
        .neq("status", "not_applicable");

      if (assessmentControls && assessmentControls.length > 0) {
        const rows = assessmentControls
          .map((row) => row.controls)
          .filter((control): control is NonNullable<typeof control> => control != null);
        return buildInterviewGuide(toGuideInputs(rows as RawGuideControl[]), factors);
      }
    }

    // Fallback: sin assessment (o sin filas materializadas todavía).
    const { data: sectorControls } = await supabase
      .from("controls")
      .select(CONTROL_COLUMNS)
      .or(
        sectorCode
          ? `sector_scope.is.null,sector_scope.cs.{${sectorCode}}`
          : "sector_scope.is.null",
      );

    return buildInterviewGuide(toGuideInputs(sectorControls ?? []), factors);
  } catch (cause) {
    console.error("[load-guide] loadInterviewGuide no disponible:", cause);
    return [];
  }
}
