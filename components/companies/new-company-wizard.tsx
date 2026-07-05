"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/app/shell";
import { Button, Card, cn, Field, InfoTooltip, Input, Select } from "@/components/ui";
import {
  createCompany,
  type CompanyActionError,
} from "@/lib/actions/companies";
import { formatRut, isValidRut } from "@/lib/companies/rut";
import {
  classificationSchema,
  COMPLEXITY_FACTORS,
  createCompanySchema,
  identificationSchema,
  SIZE_TIERS,
  type ComplexityFactor,
  type SizeTier,
} from "@/lib/companies/schema";

/**
 * Wizard de alta de empresa (prototipo isRegistro "Paso 1 de 4"; pasos 2-4
 * diseñados coherentes): Identificación → Clasificación → Factores de
 * complejidad (RFC §14.3) → Confirmación. Validación Zod POR PASO en cliente
 * (UX) con los mismos contratos que revalida la server action completa
 * (jamás se confía en el cliente). El Complexity Score no se previsualiza:
 * es server-only y de uso interno (por eso el catálogo llega sin
 * multiplicadores).
 */

/** Rubro del catálogo (tabla sectors) — nombre y leyes, sin multiplicador. */
export interface WizardSector {
  code: string;
  name: string;
  laws: string[];
}

const STEP_KEYS = [
  "identification",
  "classification",
  "factors",
  "confirm",
] as const;

type IdentificationField =
  | "name"
  | "rut"
  | "contactName"
  | "contactEmail"
  | "contactPhone";
type ErrorField = IdentificationField | "sectorCode" | "sizeTier";

/** Option-card con radio/checkbox sr-only (mismo patrón del autoevaluador). */
const optionCardClasses =
  "group flex cursor-pointer flex-col gap-[2px] rounded-buttons border border-slate bg-white px-16 py-[13px] transition-colors hover:border-carbon " +
  "has-[:checked]:border-ink has-[:checked]:bg-ink " +
  "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-focus-blue/40";
const optionLabelClasses =
  "text-body-sm font-medium text-ink group-has-[:checked]:text-white";
/* Sub de option-card en carbon (regla a11y: texto ≤13px nunca en metal). */
const optionSubClasses =
  "text-caption leading-caption text-carbon group-has-[:checked]:text-lead";

const legendClasses = "text-[13px] font-semibold text-ink";
const hintClasses = "mt-4 text-caption leading-caption text-carbon";

/**
 * Mapa ley (string de display del catálogo) → slug de i18n (wizard.lawInfo).
 * Se separa del texto porque las claves i18n no admiten puntos ("21.719").
 * Las descripciones son orientativas — validar con abogado antes de exponer.
 */
const LAW_SLUG: Record<string, string> = {
  "Ley 21.719": "l21719",
  "Ley 19.496 (SERNAC)": "l19496",
  "Circulares CMF": "cmf",
  "Ley 21.663": "l21663",
  "Ley 21.663 (ANCI)": "l21663",
  "Ley 20.584": "l20584",
  "Ley 21.459": "l21459",
  "Código del Trabajo": "codigotrabajo",
  "Normas SUBTEL": "subtel",
  "DPC-SEN reforzado": "dpcsen",
};

/** Ley 21.719 primero (base para todos), luego el resto en su orden. */
function orderedLaws(laws: string[]): string[] {
  return [
    ...laws.filter((law) => law === "Ley 21.719"),
    ...laws.filter((law) => law !== "Ley 21.719"),
  ];
}

/** dt/dd del resumen de confirmación. */
const summaryTermClasses =
  "text-caption leading-caption tracking-caption text-carbon";
const summaryValueClasses =
  "text-body-sm leading-body-sm tracking-body-sm text-ink";

export function NewCompanyWizard({ sectors }: { sectors: WizardSector[] }) {
  const t = useTranslations("app.companies.wizard");
  const tCompanies = useTranslations("app.companies");

  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState("");
  const [rut, setRut] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  // Teléfono compuesto: prefijo (+56 9 por defecto u «Otro» con código de país
  // propio) + número local. Se ensambla en `contactPhone` (derivado abajo).
  const [phonePrefix, setPhonePrefix] = useState<"cl" | "other">("cl");
  const [customPrefix, setCustomPrefix] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  // Por defecto "Otro / General" (caso base: solo Ley 21.719), si está en el catálogo.
  const [sectorCode, setSectorCode] = useState<string | null>(() =>
    sectors.some((sector) => sector.code === "otro") ? "otro" : null,
  );
  const [sizeTier, setSizeTier] = useState<SizeTier | null>(null);
  const [factors, setFactors] = useState<Record<ComplexityFactor, boolean>>(
    () =>
      Object.fromEntries(
        COMPLEXITY_FACTORS.map((factor) => [factor, false]),
      ) as Record<ComplexityFactor, boolean>,
  );

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ErrorField, boolean>>>({});
  const [serverError, setServerError] = useState<CompanyActionError | null>(null);
  const [isPending, startTransition] = useTransition();

  // Foco al panel al cambiar de paso (no en el primer render).
  const panelRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    panelRef.current?.focus();
  }, [stepIndex]);

  const selectedSector = sectors.find((sector) => sector.code === sectorCode);
  const selectedFactors = COMPLEXITY_FACTORS.filter((factor) => factors[factor]);
  // Prefijo efectivo: +56 9, o «+<código>» propio; si «Otro» sin código, se omite.
  const phonePrefixValue =
    phonePrefix === "cl" ? "+56 9" : customPrefix ? `+${customPrefix}` : "";
  const contactPhone =
    phoneNumber.trim() === ""
      ? ""
      : `${phonePrefixValue} ${phoneNumber.trim()}`.trim();

  /** Valida el paso actual con el contrato Zod correspondiente. */
  function validateCurrentStep(): boolean {
    if (stepIndex === 0) {
      const parsed = identificationSchema.safeParse({
        name,
        rut,
        contactName,
        contactEmail,
        contactPhone,
      });
      if (parsed.success) {
        setFieldErrors({});
        return true;
      }
      const errors: Partial<Record<ErrorField, boolean>> = {};
      for (const issue of parsed.error.issues) {
        errors[issue.path[0] as ErrorField] = true;
      }
      setFieldErrors(errors);
      return false;
    }
    if (stepIndex === 1) {
      const parsed = classificationSchema.safeParse({
        sectorCode: sectorCode ?? "",
        sizeTier,
      });
      if (parsed.success) {
        setFieldErrors({});
        return true;
      }
      const errors: Partial<Record<ErrorField, boolean>> = {};
      for (const issue of parsed.error.issues) {
        errors[issue.path[0] as ErrorField] = true;
      }
      setFieldErrors(errors);
      return false;
    }
    // Paso 3 (factores): siempre válido — los checkboxes son opcionales.
    setFieldErrors({});
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setStepIndex((index) => Math.min(STEP_KEYS.length - 1, index + 1));
  }

  function goBack() {
    setFieldErrors({});
    setServerError(null);
    setStepIndex((index) => Math.max(0, index - 1));
  }

  /** Validación + auto-formato del RUT al salir del campo (feedback inmediato). */
  function handleRutBlur() {
    const value = rut.trim();
    if (value === "") return;
    if (isValidRut(value)) {
      setRut(formatRut(value));
      setFieldErrors((previous) => ({ ...previous, rut: undefined }));
    } else {
      setFieldErrors((previous) => ({ ...previous, rut: true }));
    }
  }

  function submit() {
    // Revalidación TOTAL antes de enviar (misma que ejecutará la action).
    const parsed = createCompanySchema.safeParse({
      name,
      rut,
      contactName,
      contactEmail,
      contactPhone,
      sectorCode: sectorCode ?? "",
      sizeTier,
      factors: selectedFactors,
    });
    if (!parsed.success) {
      setServerError("validation");
      return;
    }
    setServerError(null);
    startTransition(async () => {
      // En éxito la action redirige al detalle; solo vuelve en error.
      const result = await createCompany(parsed.data);
      if (result && result.ok === false) {
        setServerError(result.error);
      }
    });
  }

  const fieldError = (field: ErrorField) =>
    fieldErrors[field] ? t(`fieldErrors.${field}`) : undefined;

  const describedBy = (field: ErrorField, id: string, hintId?: string) =>
    fieldErrors[field] ? `${id}-error` : hintId;

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <PageHeader
        eyebrow={t("eyebrow", { step: stepIndex + 1, total: STEP_KEYS.length })}
        title={t("title")}
        description={t("description")}
      />

      {/* Stepper: 4 pasos con estado actual (aria-current="step"). */}
      <ol aria-label={t("stepLabel")} className="mb-20 flex flex-wrap gap-8">
        {STEP_KEYS.map((key, index) => (
          <li
            key={key}
            aria-current={index === stepIndex ? "step" : undefined}
            className={cn(
              "flex items-center gap-8 rounded-full border px-12 py-4 text-caption font-medium",
              index === stepIndex
                ? "border-ink bg-ink text-white"
                : index < stepIndex
                  ? "border-stone bg-ash text-ink"
                  : "border-stone bg-white text-carbon",
            )}
          >
            <span aria-hidden="true" className="font-semibold">
              {index + 1}
            </span>
            {t(`steps.${key}`)}
          </li>
        ))}
      </ol>

      {/* Nombre accesible del panel: al recibir foco tras cambiar de paso,
          el SR anuncia qué paso es y su posición (antes no anunciaba nada). */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="group"
        aria-label={t("panelLabel", {
          name: t(`steps.${STEP_KEYS[stepIndex]}`),
          step: stepIndex + 1,
          total: STEP_KEYS.length,
        })}
        className="outline-none"
      >
        {serverError !== null ? (
          <p
            role="alert"
            className="mb-12 rounded-cards border border-danger-red/15 bg-[#f6e9e8] px-16 py-12 text-[13px] leading-[1.5] text-danger-red"
          >
            {t(`errors.${serverError}`)}
          </p>
        ) : null}

        {/* Paso 1 — Identificación */}
        {stepIndex === 0 ? (
          <Card className="p-24">
            <fieldset>
              <legend className={legendClasses}>
                {t("identification.legend")}
              </legend>
              <p className={hintClasses}>{t("identification.hint")}</p>
              <div className="mt-16 grid gap-16 sm:grid-cols-2">
                <Field
                  label={t("identification.nameLabel")}
                  htmlFor="company-name"
                  error={fieldError("name")}
                  className="sm:col-span-2"
                >
                  <Input
                    id="company-name"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t("identification.namePlaceholder")}
                    aria-invalid={fieldErrors.name ? true : undefined}
                    aria-describedby={describedBy("name", "company-name")}
                    autoComplete="organization"
                  />
                </Field>
                <Field
                  label={t("identification.rutLabel")}
                  htmlFor="company-rut"
                  error={fieldError("rut")}
                >
                  <Input
                    id="company-rut"
                    name="rut"
                    value={rut}
                    onChange={(event) => setRut(event.target.value)}
                    onBlur={handleRutBlur}
                    placeholder={t("identification.rutPlaceholder")}
                    aria-invalid={fieldErrors.rut ? true : undefined}
                    aria-describedby={describedBy("rut", "company-rut")}
                  />
                </Field>
              </div>
            </fieldset>
            {/* Legend dentro de un div con divisor (legend + border-t de
                fieldset se superponen visualmente). */}
            <div className="mt-20 border-t border-ash pt-20">
              <fieldset>
              <legend className={legendClasses}>
                {t("identification.contactLegend")}
              </legend>
              <div className="mt-12 grid gap-16 sm:grid-cols-2">
                <Field
                  label={t("identification.contactNameLabel")}
                  htmlFor="company-contact-name"
                  error={fieldError("contactName")}
                  className="sm:col-span-2"
                >
                  <Input
                    id="company-contact-name"
                    name="contactName"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    placeholder={t("identification.contactNamePlaceholder")}
                    aria-invalid={fieldErrors.contactName ? true : undefined}
                    aria-describedby={describedBy(
                      "contactName",
                      "company-contact-name",
                    )}
                    autoComplete="name"
                  />
                </Field>
                <Field
                  label={t("identification.contactEmailLabel")}
                  htmlFor="company-contact-email"
                  error={fieldError("contactEmail")}
                >
                  <Input
                    id="company-contact-email"
                    type="email"
                    name="contactEmail"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder={t("identification.contactEmailPlaceholder")}
                    aria-invalid={fieldErrors.contactEmail ? true : undefined}
                    aria-describedby={describedBy(
                      "contactEmail",
                      "company-contact-email",
                    )}
                    autoComplete="email"
                  />
                </Field>
                <Field
                  label={t("identification.contactPhoneLabel")}
                  htmlFor="company-contact-phone"
                  error={fieldError("contactPhone")}
                >
                  <div className="flex gap-8">
                    <div className="w-[92px] shrink-0">
                      <Select
                        aria-label={t("identification.contactPhonePrefixLabel")}
                        value={phonePrefix}
                        onChange={(event) =>
                          setPhonePrefix(
                            event.target.value === "other" ? "other" : "cl",
                          )
                        }
                      >
                        <option value="cl">+56 9</option>
                        <option value="other">
                          {t("identification.contactPhonePrefixOther")}
                        </option>
                      </Select>
                    </div>
                    {phonePrefix === "other" ? (
                      <div className="relative w-[72px] shrink-0">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute left-[12px] top-1/2 z-[1] -translate-y-1/2 text-body-sm text-carbon"
                        >
                          +
                        </span>
                        <Input
                          aria-label={t("identification.contactPhoneCustomPrefixLabel")}
                          value={customPrefix}
                          onChange={(event) =>
                            setCustomPrefix(
                              event.target.value.replace(/\D/g, "").slice(0, 3),
                            )
                          }
                          inputMode="numeric"
                          placeholder="44"
                          className="pl-[22px]"
                        />
                      </div>
                    ) : null}
                    <Input
                      id="company-contact-phone"
                      type="tel"
                      name="contactPhone"
                      value={phoneNumber}
                      onChange={(event) =>
                        setPhoneNumber(event.target.value.replace(/[^\d\s]/g, ""))
                      }
                      placeholder={t("identification.contactPhonePlaceholder")}
                      inputMode="tel"
                      className="min-w-0 flex-1"
                      aria-invalid={fieldErrors.contactPhone ? true : undefined}
                      aria-describedby={describedBy(
                        "contactPhone",
                        "company-contact-phone",
                      )}
                      autoComplete="tel"
                    />
                  </div>
                </Field>
              </div>
              </fieldset>
            </div>
          </Card>
        ) : null}

        {/* Paso 2 — Clasificación (rubro del catálogo + tramo + dotación) */}
        {stepIndex === 1 ? (
          <Card className="p-24">
            <fieldset>
              <legend className={cn(legendClasses, "flex items-center gap-6")}>
                {t("classification.sectorLegend")}
                <InfoTooltip label={t("classification.sectorLegend")}>
                  {t("help.sector")}
                </InfoTooltip>
              </legend>
              <p className={hintClasses}>{t("classification.sectorHint")}</p>
              {fieldErrors.sectorCode ? (
                <p role="alert" className="mt-8 text-caption text-danger-red">
                  {t("fieldErrors.sectorCode")}
                </p>
              ) : null}
              <div className="mt-16 grid gap-8 sm:grid-cols-2">
                {sectors.map((sector) => (
                  <label key={sector.code} className={optionCardClasses}>
                    <input
                      type="radio"
                      name="sector-code"
                      value={sector.code}
                      checked={sectorCode === sector.code}
                      onChange={() => setSectorCode(sector.code)}
                      className="sr-only"
                    />
                    <span className={optionLabelClasses}>{sector.name}</span>
                    <span className={optionSubClasses}>
                      {sector.laws.join(" · ")}
                    </span>
                  </label>
                ))}
              </div>
              {selectedSector ? (
                <div className="mt-16">
                  <p className="text-caption font-medium text-carbon">
                    {t("classification.lawsLabel")}
                  </p>
                  <ul className="mt-8 flex flex-col gap-8">
                    {orderedLaws(selectedSector.laws).map((law) => {
                      const slug = LAW_SLUG[law];
                      return (
                        <li
                          key={law}
                          className="rounded-cards border border-stone bg-[#fbfbfc] px-12 py-[10px]"
                        >
                          <span className="text-[13px] font-semibold text-ink">
                            {law}
                          </span>
                          {slug && t.has(`lawInfo.${slug}`) ? (
                            <span className="mt-[2px] block text-caption leading-caption text-carbon">
                              {t(`lawInfo.${slug}`)}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </fieldset>

            <div className="mt-20 border-t border-ash pt-20">
              <fieldset>
              <legend className={cn(legendClasses, "flex items-center gap-6")}>
                {t("classification.sizeLegend")}
                <InfoTooltip label={t("classification.sizeLegend")}>
                  {t("help.size")}
                </InfoTooltip>
              </legend>
              <p className={hintClasses}>{t("classification.sizeHint")}</p>
              {fieldErrors.sizeTier ? (
                <p role="alert" className="mt-8 text-caption text-danger-red">
                  {t("fieldErrors.sizeTier")}
                </p>
              ) : null}
              <div className="mt-16 grid gap-8 sm:grid-cols-3">
                {SIZE_TIERS.map((tier) => (
                  <label key={tier} className={optionCardClasses}>
                    <input
                      type="radio"
                      name="size-tier"
                      value={tier}
                      checked={sizeTier === tier}
                      onChange={() => setSizeTier(tier)}
                      className="sr-only"
                    />
                    <span className={optionLabelClasses}>
                      {tCompanies(`sizeTiers.${tier}`)}
                    </span>
                    <span className={optionSubClasses}>
                      {tCompanies(`sizeTierSubs.${tier}`)}
                    </span>
                  </label>
                ))}
              </div>
              </fieldset>
            </div>

          </Card>
        ) : null}

        {/* Paso 3 — Factores de complejidad (checkboxes RFC §14.3) */}
        {stepIndex === 2 ? (
          <Card className="p-24">
            <fieldset>
              <legend className={cn(legendClasses, "flex items-center gap-6")}>
                {t("factors.legend")}
                <InfoTooltip label={t("factors.legend")}>
                  {t("help.factors")}
                </InfoTooltip>
              </legend>
              <p className={hintClasses}>{t("factors.hint")}</p>
              <div className="mt-16 grid gap-8 sm:grid-cols-2">
                {COMPLEXITY_FACTORS.map((factor) => (
                  <label key={factor} className={optionCardClasses}>
                    <input
                      type="checkbox"
                      name={`factor-${factor}`}
                      checked={factors[factor]}
                      onChange={(event) =>
                        setFactors((previous) => ({
                          ...previous,
                          [factor]: event.target.checked,
                        }))
                      }
                      className="sr-only"
                    />
                    <span className={optionLabelClasses}>
                      {t(`factors.options.${factor}.label`)}
                    </span>
                    <span className={optionSubClasses}>
                      {t(`factors.options.${factor}.sub`)}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-16 border-t border-ash pt-12 text-caption leading-caption text-carbon">
                {t("factors.note")}
              </p>
            </fieldset>
          </Card>
        ) : null}

        {/* Paso 4 — Confirmación con resumen completo */}
        {stepIndex === 3 ? (
          <Card className="p-24">
            <h2 className={legendClasses}>{t("confirm.legend")}</h2>
            <p className={hintClasses}>{t("confirm.hint")}</p>

            <section className="mt-16">
              <h3 className="text-caption font-semibold uppercase tracking-[0.3px] text-carbon">
                {t("confirm.identification")}
              </h3>
              <dl className="mt-8 grid gap-x-24 gap-y-8 sm:grid-cols-2">
                <div>
                  <dt className={summaryTermClasses}>
                    {t("identification.nameLabel")}
                  </dt>
                  <dd className={summaryValueClasses}>{name}</dd>
                </div>
                <div>
                  <dt className={summaryTermClasses}>
                    {t("identification.rutLabel")}
                  </dt>
                  <dd className={summaryValueClasses}>{formatRut(rut)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className={summaryTermClasses}>
                    {t("identification.contactLegend")}
                  </dt>
                  <dd className={summaryValueClasses}>
                    {[contactName, contactEmail.trim(), contactPhone.trim()]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="mt-16 border-t border-ash pt-16">
              <h3 className="text-caption font-semibold uppercase tracking-[0.3px] text-carbon">
                {t("confirm.classification")}
              </h3>
              <dl className="mt-8 grid gap-x-24 gap-y-8 sm:grid-cols-2">
                <div>
                  <dt className={summaryTermClasses}>
                    {t("classification.sectorLegend")}
                  </dt>
                  <dd className={summaryValueClasses}>
                    {selectedSector?.name}
                  </dd>
                </div>
                <div>
                  <dt className={summaryTermClasses}>
                    {t("classification.sizeLegend")}
                  </dt>
                  <dd className={summaryValueClasses}>
                    {sizeTier ? tCompanies(`sizeTiers.${sizeTier}`) : null}
                  </dd>
                </div>
                {selectedSector ? (
                  <div>
                    <dt className={summaryTermClasses}>
                      {t("classification.lawsLabel")}
                    </dt>
                    <dd className={summaryValueClasses}>
                      {selectedSector.laws.join(" · ")}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="mt-16 border-t border-ash pt-16">
              <h3 className="text-caption font-semibold uppercase tracking-[0.3px] text-carbon">
                {t("confirm.factors")}
              </h3>
              {selectedFactors.length > 0 ? (
                <ul className="mt-8 flex flex-wrap gap-8">
                  {selectedFactors.map((factor) => (
                    <li
                      key={factor}
                      className="rounded-full bg-ash px-12 py-4 text-[11px] font-medium text-ink"
                    >
                      {t(`factors.options.${factor}.label`)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-8 text-body-sm text-metal">
                  {t("confirm.noFactors")}
                </p>
              )}
            </section>

            <p className="mt-16 border-t border-ash pt-12 text-caption leading-caption text-carbon">
              {t("confirm.createNote")}
            </p>
          </Card>
        ) : null}
      </div>

      {/* Navegación entre pasos */}
      <div className="mt-20 flex items-center justify-between gap-12">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={isPending}
          className={cn(stepIndex === 0 && "invisible")}
        >
          {t("nav.back")}
        </Button>
        {stepIndex === STEP_KEYS.length - 1 ? (
          <Button onClick={submit} disabled={isPending}>
            {isPending ? t("nav.submitting") : t("nav.submit")}
          </Button>
        ) : (
          <Button onClick={goNext}>{t("nav.next")}</Button>
        )}
      </div>
    </div>
  );
}
