export type CriterionAnswer = "yes" | "partial" | "no" | "unknown" | "flagged";
export type ControlStatus = "pending" | "compliant" | "partial" | "non_compliant";

export function mapAnswersToControlStatus(answers: CriterionAnswer[]): ControlStatus {
  // "unknown" = sin evaluar (inicial, pre-entrevista); "flagged" = requiere
  // aclaración (alerta tras un intento de interpretación que no pudo
  // determinar el criterio). Ninguno de los dos es un veredicto: ambos se
  // excluyen del cómputo de estado del control (no cuentan como cumple /
  // parcial / no cumple).
  const real = answers.filter((a) => a !== "unknown" && a !== "flagged");
  if (real.length === 0) return "pending";
  const yes = real.filter((a) => a === "yes").length;
  const partial = real.filter((a) => a === "partial").length;
  const no = real.filter((a) => a === "no").length;
  if (yes === real.length) return "compliant";
  if (no === real.length) return "non_compliant";
  void partial;
  return "partial";
}
