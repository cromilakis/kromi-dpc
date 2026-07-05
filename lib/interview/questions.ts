import type { AppliesWhen } from "@/lib/interview/applicability";

export interface ControlLike {
  code: string;
  name: string;
  domain_id: string;
  verification_criteria: string[];
  appliesWhen: AppliesWhen;
}

export interface ComplianceQuestion {
  controlCode: string;
  controlName: string;
  criteria: string[];
  appliesWhen: AppliesWhen;
}

export function buildComplianceQuestions(controls: ControlLike[]): ComplianceQuestion[] {
  return controls
    .filter((c) => c.verification_criteria.length > 0)
    .map((c) => ({
      controlCode: c.code,
      controlName: c.name,
      criteria: c.verification_criteria,
      appliesWhen: c.appliesWhen,
    }));
}
