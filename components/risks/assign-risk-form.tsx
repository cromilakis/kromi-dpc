"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Field, Select } from "@/components/ui";
import { assignRisk, type RiskActionError } from "@/lib/actions/risks";

/**
 * Asignar riesgo del catálogo — spec riesgos-gap: select de los riesgos de
 * risk_catalog aún NO asignados a la empresa + selects 1–5 de impacto y
 * probabilidad. Al elegir un riesgo se precargan default_impact y
 * default_probability del catálogo (hint i18n). Client component: estado del
 * formulario + useTransition sobre la server action assignRisk; el
 * revalidatePath de la action refresca matriz y tabla del server component.
 */

export interface CatalogRiskOption {
  id: string;
  code: string;
  description: string;
  defaultImpact: number;
  defaultProbability: number;
}

const SCALE = [1, 2, 3, 4, 5] as const;

export function AssignRiskForm({
  companyId,
  options,
}: {
  companyId: string;
  options: CatalogRiskOption[];
}) {
  const t = useTranslations("app.risks.assign");
  const tErrors = useTranslations("app.risks.errors");

  const [isPending, startTransition] = useTransition();
  const [riskId, setRiskId] = useState("");
  const [impact, setImpact] = useState(3);
  const [probability, setProbability] = useState(3);
  const [error, setError] = useState<RiskActionError | null>(null);

  function handleRiskChange(id: string) {
    setRiskId(id);
    const option = options.find((candidate) => candidate.id === id);
    if (option) {
      // Precarga de la evaluación por defecto del catálogo (hint del form).
      setImpact(option.defaultImpact);
      setProbability(option.defaultProbability);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!riskId) return;
    startTransition(async () => {
      const result = await assignRisk({ companyId, riskId, impact, probability });
      if (result.ok) {
        setRiskId("");
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <h2 className="mb-16 text-body-sm font-semibold leading-body-sm tracking-body-sm text-ink">
        {t("title")}
      </h2>

      {options.length === 0 ? (
        <p className="text-body-sm leading-body-sm tracking-body-sm text-metal">
          {t("allAssigned")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-12">
          <Field label={t("riskLabel")} htmlFor="assign-risk" hint={t("hint")}>
            <Select
              id="assign-risk"
              required
              value={riskId}
              disabled={isPending}
              aria-describedby="assign-risk-hint"
              onChange={(event) => handleRiskChange(event.target.value)}
            >
              <option value="" disabled>
                {t("riskPlaceholder")}
              </option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.code} — {option.description}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-12">
            <Field label={t("impactLabel")} htmlFor="assign-impact">
              <Select
                id="assign-impact"
                value={impact}
                disabled={isPending}
                onChange={(event) => setImpact(Number(event.target.value))}
              >
                {SCALE.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("probabilityLabel")} htmlFor="assign-probability">
              <Select
                id="assign-probability"
                value={probability}
                disabled={isPending}
                onChange={(event) => setProbability(Number(event.target.value))}
              >
                {SCALE.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {error ? (
            <p
              role="alert"
              className="text-caption leading-caption tracking-caption text-danger-red"
            >
              {tErrors(error)}
            </p>
          ) : null}

          <div>
            <Button type="submit" disabled={isPending || !riskId}>
              {isPending ? t("submitting") : t("submit")}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
