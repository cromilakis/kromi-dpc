"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input } from "@/components/ui";
import { createProposal, type CreateProposalError } from "@/lib/actions/proposals";

/**
 * Publicar propuesta al cliente (ficha de empresa, solo consultor): captura
 * plan + monto CLP y llama a la server action `createProposal` (inserta
 * `proposals` en status 'sent' directamente — sin borrador previo). Mismo
 * patrón de `CompanyMemberInviteForm`: useTransition + estado local (la
 * action no recibe FormData, recibe argumentos tipados).
 */
export function ProposalForm({ companyId }: { companyId: string }) {
  const t = useTranslations("app.companies.detail.proposal");

  const [isPending, startTransition] = useTransition();
  const [plan, setPlan] = useState("");
  const [amountClp, setAmountClp] = useState("");
  const [error, setError] = useState<CreateProposalError | null>(null);
  const [published, setPublished] = useState(false);

  const parsedAmount = Number(amountClp);
  const isAmountValid = amountClp.trim() !== "" && Number.isInteger(parsedAmount) && parsedAmount > 0;
  const canSubmit = plan.trim() !== "" && isAmountValid;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setPublished(false);
    setError(null);
    startTransition(async () => {
      const result = await createProposal(companyId, {
        plan: plan.trim(),
        amountClp: parsedAmount,
      });
      if (result.ok) {
        setPublished(true);
        setPlan("");
        setAmountClp("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-12">
      <Field label={t("planLabel")} htmlFor="proposal-plan">
        <Input
          id="proposal-plan"
          type="text"
          required
          placeholder={t("planPlaceholder")}
          value={plan}
          disabled={isPending}
          onChange={(event) => setPlan(event.target.value)}
        />
      </Field>

      <Field label={t("amountLabel")} htmlFor="proposal-amount" hint={t("amountHint")}>
        <Input
          id="proposal-amount"
          type="number"
          min={1}
          step={1}
          required
          placeholder={t("amountPlaceholder")}
          value={amountClp}
          disabled={isPending}
          onChange={(event) => setAmountClp(event.target.value)}
        />
      </Field>

      <div className="flex items-center gap-12">
        <Button type="submit" variant="secondary" disabled={isPending || !canSubmit}>
          {isPending ? t("submitting") : t("submit")}
        </Button>
        {published && !isPending ? (
          <p role="status" className="text-caption text-success-green">
            {t("success")}
          </p>
        ) : null}
        {error && !isPending ? (
          <p role="alert" className="text-caption text-danger-red">
            {t(`errors.${error}`)}
          </p>
        ) : null}
      </div>
    </form>
  );
}
