"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Field, Input, StatusBadge } from "@/components/ui";
import { addToPlan, type RemediationActionError } from "@/lib/actions/remediation";

/**
 * Catálogo de soluciones — spec plan-adecuacion (prototipo §1.4.8 "Remedios
 * parametrizados"): stack de cards por solución (título, descripción, control
 * relacionado si tiene, tags) con filtro por título/control/etiqueta y acción
 * "Agregar al plan" (server action addToPlan → crea remediation_item
 * vinculado). Client component: estado del filtro + transición por card; las
 * soluciones ya en el plan muestran badge "En el plan" en lugar del botón.
 */

export interface SolutionCardData {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  /** Control del Marco DPC relacionado (null si la solución es transversal). */
  control: { code: string; name: string } | null;
  /** Ya existe un remediation_item de la empresa vinculado a esta solución. */
  inPlan: boolean;
}

export function SolutionCatalog({
  companyId,
  solutions,
}: {
  companyId: string;
  solutions: SolutionCardData[];
}) {
  const t = useTranslations("app.solutions");

  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  /** Card cuya action está en vuelo (label "Agregando…"). */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<RemediationActionError | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return solutions;
    return solutions.filter((solution) => {
      const haystack = [
        solution.title,
        solution.description ?? "",
        solution.control?.code ?? "",
        solution.control?.name ?? "",
        ...solution.tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, solutions]);

  function handleAdd(solutionId: string) {
    setBusyId(solutionId);
    startTransition(async () => {
      const result = await addToPlan({ companyId, solutionId });
      if (result.ok) {
        setError(null);
      } else {
        setError(result.error);
      }
      setBusyId(null);
    });
  }

  if (solutions.length === 0) {
    return (
      <Card>
        <p className="text-body-sm leading-body-sm tracking-body-sm text-metal">
          {t("empty")}
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-wrap items-end justify-between gap-12">
        <Field
          label={t("filterLabel")}
          htmlFor="solutions-filter"
          className="w-full max-w-[380px]"
        >
          <Input
            id="solutions-filter"
            type="search"
            placeholder={t("filterPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
        <p
          aria-live="polite"
          className="text-caption leading-caption tracking-caption text-carbon"
        >
          {t("results", { count: filtered.length })}
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-cards bg-[#f6e9e8] px-16 py-8 text-caption leading-caption tracking-caption text-danger-red"
        >
          {t(`errors.${error}`)}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <Card>
          <p className="text-body-sm leading-body-sm tracking-body-sm text-metal">
            {t("noMatches")}
          </p>
        </Card>
      ) : (
        <ul className="flex list-none flex-col gap-12">
          {filtered.map((solution) => {
            const isBusy = isPending && busyId === solution.id;
            return (
              <li key={solution.id}>
                <Card padded={false}>
                  {/* Header tintado del prototipo (#fbfbfc) con título + tags. */}
                  <div className="flex flex-wrap items-center justify-between gap-8 border-b border-stone bg-[#fbfbfc] px-16 py-12">
                    <h2 className="min-w-0 text-body-sm font-semibold leading-body-sm tracking-body-sm text-ink">
                      {solution.title}
                    </h2>
                    {solution.tags.length > 0 ? (
                      <span className="flex flex-wrap items-center gap-4">
                        {solution.tags.map((tag) => (
                          <StatusBadge key={tag} variant="neutral">
                            {tag}
                          </StatusBadge>
                        ))}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-12 p-16">
                    {solution.description ? (
                      <p className="text-[13px] leading-[1.55] text-carbon">
                        {solution.description}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-12">
                      {solution.control ? (
                        <p className="text-caption leading-caption tracking-caption text-carbon">
                          {t("relatedControl")}{" "}
                          <span className="font-semibold text-carbon">
                            {solution.control.code} · {solution.control.name}
                          </span>
                        </p>
                      ) : (
                        <span aria-hidden="true" />
                      )}

                      {solution.inPlan ? (
                        <StatusBadge variant="positive">{t("inPlan")}</StatusBadge>
                      ) : (
                        <Button
                          variant="secondary"
                          disabled={isPending}
                          onClick={() => handleAdd(solution.id)}
                        >
                          {isBusy ? t("adding") : t("addToPlan")}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
