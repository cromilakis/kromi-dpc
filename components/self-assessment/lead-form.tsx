"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Field, Input } from "@/components/ui";
import { formatRut, isDummyRut, isValidRut } from "@/lib/companies/rut";
import {
  classificationSchema,
  identificationSchema,
  type ComplexityFactor,
  type SizeTier,
} from "@/lib/companies/schema";
import {
  registerAndStartCheckout,
  submitDiagnosisLead,
} from "@/lib/actions/self-assessment";
import type { PreliminaryPanorama } from "@/lib/self-assessment/panorama";
import {
  computeServiceUf,
  formatClp,
  formatUf,
  launchPriceUf,
  listPriceUf,
  serviceChargeClp,
} from "@/lib/self-assessment/pricing";
import type { WizardSector } from "@/components/companies/new-company-wizard";
import type { RiskLevel } from "@/lib/legal";

const legendClasses = "text-[13px] font-semibold text-ink";

type ErrorField =
  | "name"
  | "rut"
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "password"
  | "sectorCode";

/** Prefijo fijo del teléfono (móvil chileno): +569 + 8 dígitos. */
const PHONE_PREFIX = "+569";
const PHONE_DIGITS = 8;

export interface DiagnosisLeadFormProps {
  sectors: WizardSector[];
  /** Tamaño, factores y rubro derivados del cuestionario (no se re-piden aquí). */
  sizeTier: SizeTier;
  factors: ComplexityFactor[];
  sectorCode: string;
  diagnosis: { riskLevel: RiskLevel; totalBreaches: number };
  /** Panorama preliminar (calculado por el wizard) para el registro previo al pago. */
  panorama: PreliminaryPanorama;
  onBack: () => void;
}

/**
 * Captura del lead tras el diagnóstico: solo pide lo que el cuestionario NO
 * tiene (razón social, RUT y contacto). El tamaño, los factores de complejidad
 * y el rubro se derivan del diagnóstico y llegan por props (no se repiten). En
 * una segunda pantalla confirma servicio + valor por tamaño + oferta, y al
 * confirmar inserta el lead vía server action. Valida en cliente (UX) con los
 * mismos contratos que revalida el servidor, incluida la detección de RUT falso.
 */
export function DiagnosisLeadForm({
  sectors,
  sizeTier,
  factors,
  sectorCode,
  diagnosis,
  panorama,
  onBack,
}: DiagnosisLeadFormProps) {
  const t = useTranslations("diagnosis.lead");

  const [phase, setPhase] = useState<"form" | "confirm" | "done">("form");
  const [name, setName] = useState("");
  const [rut, setRut] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [password, setPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ErrorField, boolean>>
  >({});
  const [submitError, setSubmitError] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [isPending, startTransition] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [honeypot, setHoneypot] = useState("");

  const selectedSector = sectors.find((s) => s.code === sectorCode);

  // Micro/pequeña pagan online al confirmar (precio definitivo); enterprise es
  // bajo cotización → solo se registra el lead.
  const paysOnline = sizeTier !== "enterprise";

  function handleRutBlur() {
    const value = rut.trim();
    if (value === "") return;
    // Un RUT de relleno (11111111-1, 12345678-5, …) se trata como inválido
    // igual que cualquier otro: mismo mensaje genérico, sin distinción.
    if (isValidRut(value) && !isDummyRut(value)) {
      setRut(formatRut(value));
      setFieldErrors((prev) => ({ ...prev, rut: false }));
    } else {
      setFieldErrors((prev) => ({ ...prev, rut: true }));
    }
  }

  /** Valida identificación + contacto mínimo + RUT real antes de confirmar. */
  function validateForm(): boolean {
    const errors: Partial<Record<ErrorField, boolean>> = {};

    const id = identificationSchema.safeParse({
      name,
      rut,
      contactName,
      contactEmail,
      contactPhone,
    });
    if (!id.success) {
      for (const issue of id.error.issues) {
        errors[issue.path[0] as ErrorField] = true;
      }
    } else if (isDummyRut(rut)) {
      // RUT con DV válido pero de relleno: inválido, mismo mensaje genérico.
      errors.rut = true;
    }

    // Contacto mínimo: al menos correo o teléfono (regla del servidor).
    if (!contactEmail.trim() && !contactPhone) {
      errors.contactEmail = true;
    }
    // Si escribió teléfono, debe tener los 8 dígitos exactos (tras el +569).
    if (contactPhone && contactPhone.length !== PHONE_DIGITS) {
      errors.contactPhone = true;
    }

    // Micro/pequeña se registran (cuenta) antes de pagar: correo obligatorio
    // (es la identidad de la cuenta) y contraseña mínima de 8 caracteres.
    if (paysOnline) {
      if (!contactEmail.trim()) {
        errors.contactEmail = true;
      }
      if (password.length < 8) {
        errors.password = true;
      }
    }

    const cls = classificationSchema.safeParse({ sectorCode, sizeTier });
    if (!cls.success) {
      for (const issue of cls.error.issues) {
        errors[issue.path[0] as ErrorField] = true;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goToConfirm() {
    if (!validateForm()) return;
    setHoneypot(honeypotRef.current?.value ?? "");
    setPhase("confirm");
    topRef.current?.focus();
  }

  function submit() {
    setSubmitError(false);
    setAccountExists(false);
    const payload = {
      name,
      rut,
      contactName,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone ? `${PHONE_PREFIX}${contactPhone}` : undefined,
      sectorCode,
      sizeTier,
      factors,
      diagnosis: {
        riskLevel: diagnosis.riskLevel,
        totalBreaches: diagnosis.totalBreaches,
      },
      website: honeypot || undefined,
    };
    startTransition(async () => {
      if (paysOnline) {
        // Registra la cuenta ANTES de pagar (correo = identidad de la cuenta).
        const res = await registerAndStartCheckout({
          ...payload,
          password,
          panorama,
        });
        if (res.ok) {
          // Redirige a la página de pago alojada por Stripe.
          window.location.href = res.url;
          return;
        }
        if (res.error === "account_exists") {
          setFieldErrors((prev) => ({ ...prev, contactEmail: true }));
          setAccountExists(true);
          setSubmitError(true);
          return;
        }
        // Stripe deshabilitado (sin key): la cuenta y el lead YA quedaron
        // guardados; caemos al mensaje de "solicitud recibida" en vez de fallar.
        if (res.error === "disabled") {
          setPhase("done");
          topRef.current?.focus();
          return;
        }
        setSubmitError(true);
        return;
      }
      const result = await submitDiagnosisLead(payload);
      if (result.ok) {
        setPhase("done");
        topRef.current?.focus();
      } else {
        setSubmitError(true);
      }
    });
  }

  const fieldError = (field: ErrorField) => {
    if (!fieldErrors[field]) return undefined;
    return t(`form.errors.${field}`);
  };

  // ── Pantalla: enviado ──────────────────────────────────────────────
  if (phase === "done") {
    return (
      <section
        ref={topRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-[600px] text-center outline-none"
        aria-live="polite"
      >
        <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full bg-ink text-white">
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="mt-20 font-serif text-heading-sm font-medium tracking-[-0.5px] text-ink">
          {t("done.title")}
        </h2>
        <p className="mx-auto mt-12 max-w-[46ch] text-body leading-[1.55] text-carbon">
          {t("done.text")}
        </p>
        <Button variant="ghost" onClick={onBack} className="mt-24">
          {t("done.restart")}
        </Button>
      </section>
    );
  }

  // ── Pantalla: confirmación (servicio + oferta) ─────────────────────
  if (phase === "confirm") {
    const serviceUf = computeServiceUf(sizeTier, factors);
    const listUf = listPriceUf(serviceUf);
    const launchUf = launchPriceUf(serviceUf);
    return (
      <section
        ref={topRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-[600px] outline-none"
      >
        <h2 className="font-serif text-heading-sm font-medium tracking-[-0.5px] text-ink">
          {t("confirm.title")}
        </h2>
        <p className="mt-8 max-w-[52ch] text-body-sm leading-[1.55] text-carbon">
          {t("confirm.subtitle")}
        </p>

        <Card className="mt-20 p-24 max-sm:p-20">
          <p className="text-caption font-semibold uppercase tracking-[0.3px] text-metal">
            {t("confirm.companyLabel")}
          </p>
          <p className="mt-4 text-body font-medium text-ink">{name}</p>
          <p className="text-caption text-metal">
            {formatRut(rut)}
            {selectedSector ? ` · ${selectedSector.name}` : ""}
            {` · ${t(`form.sizeTiers.${sizeTier}`)}`}
          </p>

          <h3 className="mt-20 border-t border-ash pt-16 text-body-sm font-semibold text-ink">
            {t("confirm.serviceTitle")}
          </h3>
          <ul className="mt-8 space-y-8">
            {[
              t("confirm.serviceMapping"),
              t("confirm.serviceDiagnosis"),
              t("confirm.serviceMitigation"),
              t("confirm.serviceCertification"),
            ].map((item) => (
              <li key={item} className="flex gap-8 text-body-sm leading-[1.5] text-carbon">
                <span
                  aria-hidden="true"
                  className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-ink"
                />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-20 border-t border-ash pt-16">
            <p className="text-caption font-semibold uppercase tracking-[0.3px] text-metal">
              {t("confirm.priceTitle")}
            </p>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-12 gap-y-4">
              <span className="text-heading-sm font-medium tracking-[-0.5px] text-ink">
                {/* Enterprise es bajo cotización: se muestra "Desde", no un total. */}
                {!paysOnline && (
                  <span className="text-body-sm font-normal text-metal">
                    {t("confirm.priceFrom")}{" "}
                  </span>
                )}
                {formatUf(launchUf)} UF{" "}
                <span className="text-body-sm font-normal text-metal">
                  {t("offer.vat")}
                </span>
              </span>
              <span className="text-body-sm text-metal line-through">
                <span className="sr-only">{t("confirm.listLabel")} </span>
                {formatUf(listUf)} UF
              </span>
              <span className="rounded-full bg-ink px-8 py-[3px] text-caption font-semibold text-white">
                {t("confirm.launchBadge")}
              </span>
            </div>
            {paysOnline && (
              <p className="mt-4 text-body-sm font-medium text-ink">
                {t("confirm.amountClp", {
                  amount: formatClp(serviceChargeClp(serviceUf)),
                })}
              </p>
            )}
            <p className="mt-4 max-w-[52ch] text-caption leading-[1.5] text-metal">
              {paysOnline ? t("confirm.priceNote") : t("confirm.priceNoteQuote")}
            </p>
          </div>
        </Card>

        {submitError && (
          <p
            role="alert"
            className="mt-16 rounded-cards border border-danger-red/15 bg-[#f6e9e8] px-16 py-12 text-[13px] leading-[1.5] text-danger-red"
          >
            {accountExists ? t("confirm.accountExists") : t("confirm.error")}
          </p>
        )}

        <div className="mt-20 flex items-center justify-between gap-12">
          <Button
            variant="ghost"
            onClick={() => setPhase("form")}
            disabled={isPending}
          >
            {t("confirm.back")}
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending
              ? t("confirm.submitting")
              : paysOnline
                ? t("confirm.payButton")
                : t("confirm.submit")}
          </Button>
        </div>
      </section>
    );
  }

  // ── Pantalla: formulario de datos ──────────────────────────────────
  return (
    <section ref={topRef} tabIndex={-1} className="mx-auto w-full max-w-[600px] outline-none">
      <h2 className="font-serif text-heading-sm font-medium tracking-[-0.5px] text-ink">
        {t("form.title")}
      </h2>
      <p className="mt-8 max-w-[52ch] text-body-sm leading-[1.55] text-carbon">
        {t("form.subtitle")}
      </p>

      <Card className="mt-20 p-24 max-sm:p-20">
        {/* Identificación */}
        <fieldset>
          <legend className={legendClasses}>
            {t("form.identificationLegend")}
          </legend>
          <div className="mt-12 grid gap-16 sm:grid-cols-2">
            <Field
              label={t("form.nameLabel")}
              htmlFor="lead-name"
              error={fieldError("name")}
              className="sm:col-span-2"
            >
              <Input
                id="lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("form.namePlaceholder")}
                autoComplete="organization"
                aria-invalid={fieldErrors.name ? true : undefined}
              />
            </Field>
            <Field
              label={t("form.rutLabel")}
              htmlFor="lead-rut"
              error={fieldError("rut")}
            >
              <Input
                id="lead-rut"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                onBlur={handleRutBlur}
                placeholder={t("form.rutPlaceholder")}
                aria-invalid={fieldErrors.rut ? true : undefined}
              />
            </Field>
          </div>
        </fieldset>

        {/* Contacto */}
        <div className="mt-20 border-t border-ash pt-20">
          <fieldset>
            <legend className={legendClasses}>{t("form.contactLegend")}</legend>
            <div className="mt-12 grid gap-16 sm:grid-cols-2">
              <Field
                label={t("form.contactNameLabel")}
                htmlFor="lead-contact-name"
                error={fieldError("contactName")}
                className="sm:col-span-2"
              >
                <Input
                  id="lead-contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={t("form.contactNamePlaceholder")}
                  autoComplete="name"
                  aria-invalid={fieldErrors.contactName ? true : undefined}
                />
              </Field>
              <Field
                label={t("form.contactEmailLabel")}
                htmlFor="lead-contact-email"
                error={fieldError("contactEmail")}
              >
                <Input
                  id="lead-contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t("form.contactEmailPlaceholder")}
                  autoComplete="email"
                  aria-invalid={fieldErrors.contactEmail ? true : undefined}
                />
              </Field>
              <Field
                label={t("form.contactPhoneLabel")}
                htmlFor="lead-contact-phone"
                error={fieldError("contactPhone")}
              >
                {/* Prefijo fijo +569 + 8 dígitos (móvil chileno). */}
                <div
                  className={`flex items-stretch rounded-inputs border bg-white transition-colors focus-within:border-focus-blue focus-within:ring-[3px] focus-within:ring-focus-blue/40 ${
                    fieldErrors.contactPhone ? "border-danger-red" : "border-slate"
                  }`}
                >
                  <span className="flex select-none items-center border-r border-slate px-12 text-body-sm text-metal">
                    {PHONE_PREFIX}
                  </span>
                  <input
                    id="lead-contact-phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) =>
                      setContactPhone(
                        e.target.value.replace(/\D/g, "").slice(0, PHONE_DIGITS),
                      )
                    }
                    placeholder={t("form.contactPhonePlaceholder")}
                    inputMode="numeric"
                    maxLength={PHONE_DIGITS}
                    autoComplete="tel-national"
                    aria-invalid={fieldErrors.contactPhone ? true : undefined}
                    className="block w-full rounded-r-inputs bg-transparent px-12 py-[9px] text-body-sm leading-body-sm tracking-body-sm text-ink placeholder:text-overcast focus:outline-none"
                  />
                </div>
              </Field>
              {paysOnline && (
                <Field
                  label={t("form.passwordLabel")}
                  htmlFor="lead-password"
                  error={fieldError("password")}
                  hint={t("form.passwordHint")}
                  className="sm:col-span-2"
                >
                  <Input
                    id="lead-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("form.passwordPlaceholder")}
                    autoComplete="new-password"
                    aria-invalid={fieldErrors.password ? true : undefined}
                  />
                </Field>
              )}
            </div>
          </fieldset>
        </div>

        {/* Honeypot anti-bots: oculto y fuera del tab order. */}
        <input
          ref={honeypotRef}
          type="text"
          name="website"
          defaultValue=""
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
      </Card>

      <div className="mt-20 flex items-center justify-between gap-12">
        <Button variant="ghost" onClick={onBack}>
          {t("backToResult")}
        </Button>
        <Button onClick={goToConfirm}>{t("form.continue")}</Button>
      </div>
    </section>
  );
}
