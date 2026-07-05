"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card } from "@/components/ui";
import { ratActivitySchema, type RatActivity } from "@/lib/interview/rat-schema";
import type { ExtractionResult } from "@/lib/llm/extract-diagnosis";

/**
 * Pantalla de revisión de las sugerencias del LLM (Tarea 6): el consultor
 * decide, sugerencia por sugerencia, si acepta (recién ahí entra al
 * borrador vía `onAcceptRat`/`onAcceptCompliance`), descarta o deja para más
 * tarde. El LLM NUNCA escribe directo sobre `answers` — este componente es
 * el único punto donde una sugerencia se convierte en dato del borrador, y
 * siempre muestra la cita textual (`evidence`) que la respalda para que el
 * consultor pueda verificar la procedencia antes de aceptar.
 */

type RatSuggestion = ExtractionResult["rat"][number];
type ComplianceSuggestion = ExtractionResult["compliance"][number];

const RAT_FIELD_DEFAULTS: RatActivity = {
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
  isSensitive: false,
  notes: "",
};

/** Placeholder para campos de texto OBLIGATORIOS que el LLM no extrajo — sobre
 * todo `area`, que es una clasificación organizacional (no un dato personal) y
 * casi nunca aparece en la transcripción. Deja la actividad válida y aceptable,
 * marcada visiblemente para que el consultor la complete en el RatForm. No
 * inventa datos del tratamiento: solo etiqueta lo que falta clasificar. */
const NEEDS_REVIEW = "Por completar";

/** Combina los defaults del RAT con los `fields` parciales sugeridos por el LLM
 * (solo lo que vino con evidencia llega hasta acá — ver `sanitizeExtraction`) y
 * rellena los campos de texto obligatorios ausentes con un placeholder de
 * revisión, para que `ratActivitySchema` valide y la sugerencia sea aceptable;
 * el consultor la afina en el RatForm que queda montado debajo. */
function buildRatActivity(fields: RatSuggestion["fields"]): RatActivity {
  const merged = { ...RAT_FIELD_DEFAULTS, ...fields };
  if (!merged.area.trim()) merged.area = NEEDS_REVIEW;
  if (!merged.name.trim()) merged.name = merged.purpose.trim() || NEEDS_REVIEW;
  if (!merged.purpose.trim()) merged.purpose = merged.name.trim() || NEEDS_REVIEW;
  return merged;
}

function formatFieldValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

export function ExtractionReview({
  extraction,
  onAcceptRat,
  onAcceptCompliance,
  onClose,
}: {
  extraction: ExtractionResult;
  onAcceptRat: (activity: RatActivity) => void;
  onAcceptCompliance: (
    controlCode: string,
    index: number,
    answer: "yes" | "partial" | "no",
  ) => void;
  onClose: () => void;
}) {
  const t = useTranslations("app.diagnosis.review");
  const tRatFields = useTranslations("app.diagnosis.rat.fields");
  const tCriteria = useTranslations("app.diagnosis.compliance.criteria");

  const [ratSuggestions, setRatSuggestions] = useState<RatSuggestion[]>(extraction.rat);
  const [complianceSuggestions, setComplianceSuggestions] = useState<ComplianceSuggestion[]>(
    extraction.compliance,
  );
  const [invalidRatIndexes, setInvalidRatIndexes] = useState<Set<number>>(new Set());

  function discardRat(index: number) {
    setRatSuggestions((current) => current.filter((_, i) => i !== index));
    setInvalidRatIndexes((current) => {
      const next = new Set(current);
      next.delete(index);
      return next;
    });
  }

  function acceptRat(index: number, suggestion: RatSuggestion) {
    const activity = buildRatActivity(suggestion.fields);
    const result = ratActivitySchema.safeParse(activity);
    if (!result.success) {
      setInvalidRatIndexes((current) => new Set(current).add(index));
      return;
    }
    onAcceptRat(result.data);
    discardRat(index);
  }

  function acceptAllRat() {
    ratSuggestions.forEach((suggestion, index) => acceptRat(index, suggestion));
  }

  function discardCompliance(index: number) {
    setComplianceSuggestions((current) => current.filter((_, i) => i !== index));
  }

  function acceptCompliance(index: number, suggestion: ComplianceSuggestion) {
    onAcceptCompliance(suggestion.controlCode, suggestion.criterionIndex, suggestion.answer);
    discardCompliance(index);
  }

  function acceptAllCompliance() {
    complianceSuggestions.forEach((suggestion, index) => acceptCompliance(index, suggestion));
  }

  const nothingLeft =
    ratSuggestions.length === 0 &&
    complianceSuggestions.length === 0 &&
    extraction.unassigned.length === 0;

  return (
    <Card className="flex flex-col gap-24">
      <div className="flex flex-wrap items-center justify-between gap-12">
        <h2 className="text-body-sm font-semibold text-ink">{t("title")}</h2>
        <Button variant="ghost" onClick={onClose}>
          {t("close")}
        </Button>
      </div>

      <section aria-labelledby="review-rat-title">
        <div className="mb-12 flex flex-wrap items-center justify-between gap-8">
          <h3 id="review-rat-title" className="text-body-sm font-semibold text-ink">
            {t("ratGroup")}
          </h3>
          {ratSuggestions.length > 0 ? (
            <Button variant="secondary" onClick={acceptAllRat}>
              {t("acceptAll")}
            </Button>
          ) : null}
        </div>
        {ratSuggestions.length === 0 ? (
          <p className="text-caption leading-caption text-carbon">{t("ratEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-12">
            {ratSuggestions.map((suggestion, index) => (
              <li key={index}>
                <Card className="flex flex-col gap-8 border-ink/10">
                  <ul className="flex flex-col gap-8">
                    {Object.entries(suggestion.fields).map(([field, value]) => (
                      <li key={field} className="border-t border-ash pt-8 first:border-t-0 first:pt-0">
                        <p className="text-caption font-medium leading-caption text-ink">
                          {tRatFields(field as Parameters<typeof tRatFields>[0])}: {formatFieldValue(value)}
                        </p>
                        {suggestion.evidence[field] ? (
                          <p className="mt-4 text-caption leading-caption text-carbon">
                            {t("suggestedFrom")}: «{suggestion.evidence[field]}»
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {invalidRatIndexes.has(index) ? (
                    <p role="alert" className="text-caption leading-caption text-danger-red">
                      {t("ratIncomplete")}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-8">
                    <Button onClick={() => acceptRat(index, suggestion)}>{t("accept")}</Button>
                    <Button variant="ghost" onClick={() => discardRat(index)}>
                      {t("discard")}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="review-compliance-title">
        <div className="mb-12 flex flex-wrap items-center justify-between gap-8">
          <h3 id="review-compliance-title" className="text-body-sm font-semibold text-ink">
            {t("complianceGroup")}
          </h3>
          {complianceSuggestions.length > 0 ? (
            <Button variant="secondary" onClick={acceptAllCompliance}>
              {t("acceptAll")}
            </Button>
          ) : null}
        </div>
        {complianceSuggestions.length === 0 ? (
          <p className="text-caption leading-caption text-carbon">{t("complianceEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-12">
            {complianceSuggestions.map((suggestion, index) => (
              <li key={index}>
                <Card className="flex flex-col gap-8 border-ink/10">
                  <p className="text-caption font-medium leading-caption text-ink">
                    {suggestion.controlCode} · [{suggestion.criterionIndex}] ·{" "}
                    {tCriteria(suggestion.answer)}
                  </p>
                  <p className="text-caption leading-caption text-carbon">
                    {t("suggestedFrom")}: «{suggestion.evidence}»
                  </p>
                  <div className="flex flex-wrap items-center gap-8">
                    <Button onClick={() => acceptCompliance(index, suggestion)}>
                      {t("accept")}
                    </Button>
                    <Button variant="ghost" onClick={() => discardCompliance(index)}>
                      {t("discard")}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="review-unassigned-title">
        <h3 id="review-unassigned-title" className="text-body-sm font-semibold text-ink">
          {t("unassignedGroup")}
        </h3>
        <p className="mb-12 text-caption leading-caption text-carbon">{t("unassignedHelp")}</p>
        {extraction.unassigned.length === 0 ? (
          <p className="text-caption leading-caption text-carbon">{t("unassignedEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-8">
            {extraction.unassigned.map((item, index) => (
              <li
                key={index}
                className="border-t border-ash pt-8 first:border-t-0 first:pt-0"
              >
                <p className="text-body-sm text-carbon">{item.text}</p>
                <p className="mt-4 text-caption leading-caption text-metal">{item.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {nothingLeft ? (
        <p role="status" className="text-caption leading-caption text-success-green">
          {t("done")}
        </p>
      ) : null}

      <div>
        <Button variant="secondary" onClick={onClose}>
          {t("close")}
        </Button>
      </div>
    </Card>
  );
}
