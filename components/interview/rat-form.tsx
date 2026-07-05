"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Field, Input, Select, StatusBadge, Textarea } from "@/components/ui";
import { LEGAL_BASES, ratActivitySchema, type RatActivity } from "@/lib/interview/rat-schema";

/**
 * Sección A del diagnóstico — RAT (Registro de Actividades de Tratamiento):
 * CRUD 100% local sobre el array `answers.rat` (el padre —diagnosis-manager—
 * autoguarda el objeto `answers` completo vía saveDiagnosisDraft, esta pieza
 * solo edita el array en memoria). "Agregar actividad" abre un formulario en
 * blanco; "Editar" reabre el mismo formulario con los datos de la fila.
 * Los campos de arreglo (categorías, destinatarios, encargados, países,
 * medidas de seguridad) se editan como texto separado por comas — sin UI de
 * chips, alcance acotado del diagnóstico asistido. Validación con
 * `ratActivitySchema` (mismo esquema que valida el server en saveDiagnosisDraft
 * / materializeDiagnosis) antes de aceptar la actividad en el array.
 */

function emptyActivity(companyFactors?: string[]): RatActivity {
  return {
    area: "",
    name: "",
    purpose: "",
    legalBasis: "consentimiento",
    dataCategories: [],
    dataSubjects: [],
    source: "",
    recipients: [],
    processors: [],
    intlTransfer: false,
    intlCountries: [],
    retention: "",
    securityMeasures: [],
    isSensitive: companyFactors?.includes("sensitive_data") ?? false,
    notes: "",
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Aplicabilidad de un bloque atado a un factor (Tarea 5): si `companyFactors`
 * no se pasa (modo self, sin datos de la empresa cargados) se muestra todo,
 * sin ocultar de más. Si se pasa (aunque sea `[]`), un bloque solo se
 * considera "declarado" cuando el factor está en la lista.
 */
function factorApplies(factor: string, companyFactors: string[] | undefined): boolean {
  if (companyFactors === undefined) return true;
  return companyFactors.includes(factor);
}

type RevealedBlocks = { intl: boolean; processors: boolean };

const NO_REVEAL: RevealedBlocks = { intl: false, processors: false };

export function RatForm({
  activities,
  onChange,
  companyFactors,
}: {
  activities: RatActivity[];
  onChange: (next: RatActivity[]) => void;
  companyFactors?: string[];
}) {
  const t = useTranslations("app.diagnosis.rat");
  const tLegal = useTranslations("app.diagnosis.rat.legalBases");

  const [draft, setDraft] = useState<RatActivity | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [revealed, setRevealed] = useState<RevealedBlocks>(NO_REVEAL);

  function startAdd() {
    setDraft(emptyActivity(companyFactors));
    setEditingIndex(null);
    setError(false);
    setRevealed(NO_REVEAL);
  }

  function startEdit(index: number) {
    const activity = activities[index]!;
    setDraft({ ...activity });
    setEditingIndex(index);
    setError(false);
    // Un draft existente con datos ya capturados en un bloque atado a factor
    // se muestra igual, aunque la empresa no haya declarado el factor —
    // nunca se ocultan datos ya cargados.
    setRevealed({
      intl: activity.intlTransfer || activity.intlCountries.length > 0,
      processors: activity.processors.length > 0,
    });
  }

  function cancel() {
    setDraft(null);
    setEditingIndex(null);
    setError(false);
    setRevealed(NO_REVEAL);
  }

  function remove(index: number) {
    onChange(activities.filter((_, i) => i !== index));
    if (editingIndex === index) cancel();
  }

  function save() {
    if (!draft) return;
    const parsed = ratActivitySchema.safeParse(draft);
    if (!parsed.success) {
      setError(true);
      return;
    }
    const next = [...activities];
    if (editingIndex === null) {
      next.push(parsed.data);
    } else {
      next[editingIndex] = parsed.data;
    }
    onChange(next);
    setDraft(null);
    setEditingIndex(null);
    setError(false);
  }

  return (
    <div className="flex flex-col gap-16">
      {activities.length === 0 && !draft ? (
        <p className="text-body-sm leading-body-sm tracking-body-sm text-metal">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-8">
          {activities.map((activity, index) => (
            <li key={index}>
              <Card className="flex flex-wrap items-center justify-between gap-12">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-ink">{activity.name}</p>
                  <p className="mt-[2px] flex flex-wrap items-center gap-6 text-caption leading-caption text-carbon">
                    <span>{activity.area}</span>
                    <span aria-hidden="true">·</span>
                    <span>{tLegal(activity.legalBasis)}</span>
                    {activity.isSensitive ? (
                      <StatusBadge variant="warning">{t("sensitiveBadge")}</StatusBadge>
                    ) : null}
                    {activity.intlTransfer ? (
                      <StatusBadge variant="active">{t("intlBadge")}</StatusBadge>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <Button
                    variant="ghost"
                    className="px-8 py-4 text-caption"
                    onClick={() => startEdit(index)}
                  >
                    {t("edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-8 py-4 text-caption text-danger-red hover:text-danger-red"
                    onClick={() => remove(index)}
                  >
                    {t("remove")}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <Card className="flex flex-col gap-12">
          <div className="grid gap-12 sm:grid-cols-2">
            <Field label={t("fields.area")} htmlFor="rat-area">
              <Input
                id="rat-area"
                value={draft.area}
                onChange={(event) => setDraft({ ...draft, area: event.target.value })}
              />
            </Field>
            <Field label={t("fields.name")} htmlFor="rat-name">
              <Input
                id="rat-name"
                value={draft.name}
                placeholder={t("fields.namePlaceholder")}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
          </div>

          <Field label={t("fields.purpose")} htmlFor="rat-purpose">
            <Textarea
              id="rat-purpose"
              rows={2}
              value={draft.purpose}
              placeholder={t("fields.purposePlaceholder")}
              onChange={(event) => setDraft({ ...draft, purpose: event.target.value })}
            />
          </Field>

          <Field label={t("fields.legalBasis")} htmlFor="rat-legal-basis">
            <Select
              id="rat-legal-basis"
              value={draft.legalBasis}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  legalBasis: event.target.value as RatActivity["legalBasis"],
                })
              }
            >
              {LEGAL_BASES.map((basis) => (
                <option key={basis} value={basis}>
                  {tLegal(basis)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-12 sm:grid-cols-2">
            <Field
              label={t("fields.dataCategories")}
              htmlFor="rat-data-categories"
              hint={t("fields.dataCategoriesHint")}
            >
              <Input
                id="rat-data-categories"
                value={draft.dataCategories.join(", ")}
                onChange={(event) =>
                  setDraft({ ...draft, dataCategories: splitList(event.target.value) })
                }
              />
            </Field>
            <Field
              label={t("fields.dataSubjects")}
              htmlFor="rat-data-subjects"
              hint={t("fields.dataSubjectsHint")}
            >
              <Input
                id="rat-data-subjects"
                value={draft.dataSubjects.join(", ")}
                onChange={(event) =>
                  setDraft({ ...draft, dataSubjects: splitList(event.target.value) })
                }
              />
            </Field>
          </div>

          <Field label={t("fields.source")} htmlFor="rat-source">
            <Input
              id="rat-source"
              value={draft.source}
              onChange={(event) => setDraft({ ...draft, source: event.target.value })}
            />
          </Field>

          <Field
            label={t("fields.recipients")}
            htmlFor="rat-recipients"
            hint={t("fields.recipientsHint")}
          >
            <Input
              id="rat-recipients"
              value={draft.recipients.join(", ")}
              onChange={(event) =>
                setDraft({ ...draft, recipients: splitList(event.target.value) })
              }
            />
          </Field>

          {factorApplies("critical_providers", companyFactors) || revealed.processors ? (
            <Field
              label={t("fields.processors")}
              htmlFor="rat-processors"
              hint={t("fields.processorsHint")}
            >
              <Input
                id="rat-processors"
                value={draft.processors.join(", ")}
                onChange={(event) =>
                  setDraft({ ...draft, processors: splitList(event.target.value) })
                }
              />
            </Field>
          ) : (
            <button
              type="button"
              className="w-fit cursor-pointer text-left text-caption leading-caption text-carbon underline hover:text-ink"
              onClick={() => setRevealed({ ...revealed, processors: true })}
            >
              {t("exception", { field: t("fields.processors") })}
            </button>
          )}

          {factorApplies("international_transfers", companyFactors) || revealed.intl ? (
            <>
              <label className="flex items-center gap-8 text-body-sm text-ink">
                <input
                  type="checkbox"
                  className="h-16 w-16 shrink-0 rounded-[4px] border-slate accent-ink"
                  checked={draft.intlTransfer}
                  onChange={(event) =>
                    setDraft({ ...draft, intlTransfer: event.target.checked })
                  }
                />
                {t("fields.intlTransfer")}
              </label>

              <Field
                label={t("fields.intlCountries")}
                htmlFor="rat-intl-countries"
                hint={t("fields.intlCountriesHint")}
              >
                <Input
                  id="rat-intl-countries"
                  disabled={!draft.intlTransfer}
                  value={draft.intlCountries.join(", ")}
                  onChange={(event) =>
                    setDraft({ ...draft, intlCountries: splitList(event.target.value) })
                  }
                />
              </Field>
            </>
          ) : (
            <button
              type="button"
              className="w-fit cursor-pointer text-left text-caption leading-caption text-carbon underline hover:text-ink"
              onClick={() => setRevealed({ ...revealed, intl: true })}
            >
              {t("exception", { field: t("intlBadge") })}
            </button>
          )}

          <Field label={t("fields.retention")} htmlFor="rat-retention">
            <Input
              id="rat-retention"
              value={draft.retention}
              onChange={(event) => setDraft({ ...draft, retention: event.target.value })}
            />
          </Field>

          <Field
            label={t("fields.securityMeasures")}
            htmlFor="rat-security-measures"
            hint={t("fields.securityMeasuresHint")}
          >
            <Input
              id="rat-security-measures"
              value={draft.securityMeasures.join(", ")}
              onChange={(event) =>
                setDraft({ ...draft, securityMeasures: splitList(event.target.value) })
              }
            />
          </Field>

          <label className="flex items-center gap-8 text-body-sm text-ink">
            <input
              type="checkbox"
              className="h-16 w-16 shrink-0 rounded-[4px] border-slate accent-ink"
              checked={draft.isSensitive}
              onChange={(event) => setDraft({ ...draft, isSensitive: event.target.checked })}
            />
            {t("fields.isSensitive")}
          </label>

          <Field label={t("fields.notes")} htmlFor="rat-notes">
            <Textarea
              id="rat-notes"
              rows={2}
              value={draft.notes ?? ""}
              placeholder={t("fields.notesPlaceholder")}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </Field>

          {error ? (
            <p role="alert" className="text-caption leading-caption text-danger-red">
              {t("errors.validation")}
            </p>
          ) : null}

          <div className="flex items-center gap-8">
            <Button onClick={save}>{t("save")}</Button>
            <Button variant="ghost" onClick={cancel}>
              {t("cancel")}
            </Button>
          </div>
        </Card>
      ) : (
        <div>
          <Button variant="secondary" onClick={startAdd}>
            {t("add")}
          </Button>
        </div>
      )}
    </div>
  );
}
