export interface ControlLike {
  code: string;
  name: string;
  domain_id: string;
  verification_criteria: string[];
}

export interface ComplianceQuestion {
  controlCode: string;
  controlName: string;
  criteria: string[];
}

export function buildComplianceQuestions(controls: ControlLike[]): ComplianceQuestion[] {
  return controls
    .filter((c) => c.verification_criteria.length > 0)
    .map((c) => ({ controlCode: c.code, controlName: c.name, criteria: c.verification_criteria }));
}
