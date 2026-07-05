export type CriterionAnswer = "yes" | "partial" | "no" | "unknown";
export type ControlStatus = "pending" | "compliant" | "partial" | "non_compliant";

export function mapAnswersToControlStatus(answers: CriterionAnswer[]): ControlStatus {
  const real = answers.filter((a) => a !== "unknown");
  if (real.length === 0) return "pending";
  const yes = real.filter((a) => a === "yes").length;
  const partial = real.filter((a) => a === "partial").length;
  const no = real.filter((a) => a === "no").length;
  if (yes === real.length) return "compliant";
  if (no === real.length) return "non_compliant";
  void partial;
  return "partial";
}
