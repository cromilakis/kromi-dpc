"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Select } from "@/components/ui";
import {
  updateCompanyPhase,
  type UpdatePhaseState,
} from "@/lib/actions/companies";
import { COMPANY_PHASES, type CompanyPhase } from "@/lib/companies/schema";

/**
 * Cambio de fase del ciclo de servicio (resumen de empresa): select con las
 * 4 fases + server action updateCompanyPhase (sesión + Zod + audit_log).
 * useActionState entrega estados de envío/éxito/error accesibles.
 */
export function PhaseForm({
  companyId,
  currentPhase,
}: {
  companyId: string;
  currentPhase: CompanyPhase;
}) {
  const t = useTranslations("app.companies.detail.phaseForm");
  const tShell = useTranslations("app.shell");
  const [state, formAction, isPending] = useActionState<
    UpdatePhaseState,
    FormData
  >(updateCompanyPhase, null);

  return (
    <form action={formAction} className="flex flex-col gap-12">
      <input type="hidden" name="companyId" value={companyId} />
      <Field label={t("label")} htmlFor="company-phase" hint={t("hint")}>
        <Select
          id="company-phase"
          name="phase"
          defaultValue={currentPhase}
          aria-describedby="company-phase-hint"
        >
          {COMPANY_PHASES.map((phase) => (
            <option key={phase} value={phase}>
              {tShell(`phases.${phase}`)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex items-center gap-12">
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? t("saving") : t("submit")}
        </Button>
        {state?.ok === true && !isPending ? (
          <p role="status" className="text-caption text-success-green">
            {t("success")}
          </p>
        ) : null}
        {state?.ok === false && !isPending ? (
          <p role="alert" className="text-caption text-danger-red">
            {t(`errors.${state.error}`)}
          </p>
        ) : null}
      </div>
    </form>
  );
}
