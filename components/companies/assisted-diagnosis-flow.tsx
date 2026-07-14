"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Field, Input } from "@/components/ui";
import { formatRut, isDummyRut, isValidRut } from "@/lib/companies/rut";
import { identificationSchema } from "@/lib/companies/schema";
import { DiagnosisQuestionnaire } from "@/components/self-assessment/diagnosis-questionnaire";
import { DiagnosisResultPanel } from "@/components/self-assessment/diagnosis-result";
import {
  createCompanyWithDiagnosis,
  type CreateCompanyWithDiagnosisError,
} from "@/lib/actions/assisted-diagnosis";
import type { DiagnosisAnswers } from "@/lib/diagnosis/snapshot";

type ErrorField =
  | "name"
  | "rut"
  | "contactName"
  | "contactEmail"
  | "contactPhone";

/** Identidad capturada en la fase 1 (lo único que la encuesta no deriva). */
interface Identity {
  name: string;
  rut: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
}

const legendClasses = "text-[13px] font-semibold text-ink";

/**
 * Flujo de diagnóstico asistido por el consultor (reemplaza el alta manual
 * en /app/companies/new). Dos fases en estado local:
 * 1) `identity` — razón social, RUT y contacto (lo que la encuesta NO cubre).
 * 2) `survey` — cuestionario de diagnóstico completo (`DiagnosisQuestionnaire`);
 *    al terminar, muestra el panorama (`DiagnosisResultPanel`, reusado del
 *    autodiagnóstico público pero SIN su CTA — se omite `onGetFullDiagnosis`
 *    para que el panel no renderice ese bloque) y persiste todo junto
 *    (`createCompanyWithDiagnosis`) mediante el único botón "Guardar
 *    diagnóstico" (deshabilitado durante `isPending`), evitando doble-submit.
 */
export function AssistedDiagnosisFlow() {
  const t = useTranslations("app.companies.assistedDiagnosis");

  const [phase, setPhase] = useState<"identity" | "survey">("identity");
  const [identity, setIdentity] = useState<Identity | null>(null);

  const [name, setName] = useState("");
  const [rut, setRut] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ErrorField, boolean>>
  >({});

  function handleRutBlur() {
    const value = rut.trim();
    if (value === "") return;
    // Un RUT de relleno (11111111-1, 12345678-5, …) se trata como inválido,
    // igual que cualquier otro: mismo mensaje genérico, sin distinción.
    if (isValidRut(value) && !isDummyRut(value)) {
      setRut(formatRut(value));
      setFieldErrors((prev) => ({ ...prev, rut: false }));
    } else {
      setFieldErrors((prev) => ({ ...prev, rut: true }));
    }
  }

  /** Valida en cliente (UX) con el mismo contrato que revalida el servidor. */
  function validateIdentity(): Identity | null {
    const errors: Partial<Record<ErrorField, boolean>> = {};

    const parsed = identificationSchema.safeParse({
      name,
      rut,
      contactName,
      contactEmail,
      contactPhone,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors[issue.path[0] as ErrorField] = true;
      }
    } else if (isDummyRut(rut)) {
      // RUT con DV válido pero de relleno: inválido, mismo mensaje genérico.
      errors.rut = true;
    }

    // Contacto mínimo: al menos correo o teléfono (regla del servidor).
    if (!contactEmail.trim() && !contactPhone.trim()) {
      errors.contactEmail = true;
    }

    setFieldErrors(errors);
    if (!parsed.success || Object.keys(errors).length > 0) return null;

    return {
      name: parsed.data.name,
      rut: parsed.data.rut,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      contactPhone: parsed.data.contactPhone,
    };
  }

  function handleContinue() {
    const result = validateIdentity();
    if (!result) return;
    setIdentity(result);
    setPhase("survey");
  }

  const fieldError = (field: ErrorField) =>
    fieldErrors[field] ? t(`identity.errors.${field}`) : undefined;

  if (phase === "identity") {
    return (
      <section className="mx-auto w-full max-w-[640px]">
        <Card className="mt-20 p-24 max-sm:p-20">
          <fieldset>
            <legend className={legendClasses}>{t("identity.legend")}</legend>
            <div className="mt-12 grid gap-16 sm:grid-cols-2">
              <Field
                label={t("identity.nameLabel")}
                htmlFor="assisted-name"
                error={fieldError("name")}
                className="sm:col-span-2"
              >
                <Input
                  id="assisted-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("identity.namePlaceholder")}
                  autoComplete="organization"
                  aria-invalid={fieldErrors.name ? true : undefined}
                />
              </Field>
              <Field
                label={t("identity.rutLabel")}
                htmlFor="assisted-rut"
                error={fieldError("rut")}
              >
                <Input
                  id="assisted-rut"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  onBlur={handleRutBlur}
                  placeholder={t("identity.rutPlaceholder")}
                  aria-invalid={fieldErrors.rut ? true : undefined}
                />
              </Field>
            </div>
          </fieldset>

          <div className="mt-20 border-t border-ash pt-20">
            <fieldset>
              <legend className={legendClasses}>
                {t("identity.contactLegend")}
              </legend>
              <div className="mt-12 grid gap-16 sm:grid-cols-2">
                <Field
                  label={t("identity.contactNameLabel")}
                  htmlFor="assisted-contact-name"
                  error={fieldError("contactName")}
                  className="sm:col-span-2"
                >
                  <Input
                    id="assisted-contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={t("identity.contactNamePlaceholder")}
                    autoComplete="name"
                    aria-invalid={fieldErrors.contactName ? true : undefined}
                  />
                </Field>
                <Field
                  label={t("identity.contactEmailLabel")}
                  htmlFor="assisted-contact-email"
                  error={fieldError("contactEmail")}
                >
                  <Input
                    id="assisted-contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={t("identity.contactEmailPlaceholder")}
                    autoComplete="email"
                    aria-invalid={fieldErrors.contactEmail ? true : undefined}
                  />
                </Field>
                <Field
                  label={t("identity.contactPhoneLabel")}
                  htmlFor="assisted-contact-phone"
                  error={fieldError("contactPhone")}
                  className="sm:col-span-2"
                >
                  <Input
                    id="assisted-contact-phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder={t("identity.contactPhonePlaceholder")}
                    autoComplete="tel"
                    aria-invalid={fieldErrors.contactPhone ? true : undefined}
                  />
                </Field>
              </div>
            </fieldset>
          </div>
        </Card>

        <div className="mt-20 flex justify-end">
          <Button onClick={handleContinue}>{t("identity.continue")}</Button>
        </div>
      </section>
    );
  }

  // identity siempre está definido acá (se setea antes de pasar a "survey").
  return <SurveyPhase identity={identity as Identity} />;
}

function SurveyPhase({ identity }: { identity: Identity }) {
  const t = useTranslations("app.companies.assistedDiagnosis");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<CreateCompanyWithDiagnosisError | null>(
    null,
  );

  function handleSave(answers: DiagnosisAnswers) {
    setError(null);
    startTransition(async () => {
      const result = await createCompanyWithDiagnosis({ ...identity, answers });
      // Éxito hace redirect en el servidor: si volvemos acá, algo falló.
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <DiagnosisQuestionnaire
      renderComplete={({ result, answers }) => (
        <>
          <DiagnosisResultPanel result={result} />
          {error && (
            <p
              role="alert"
              className="mx-auto mt-16 max-w-[600px] rounded-cards border border-danger-red/15 bg-[#f6e9e8] px-16 py-12 text-[13px] leading-[1.5] text-danger-red"
            >
              {t(`errors.${error}`)}
            </p>
          )}
          <div className="mx-auto mt-24 flex max-w-[600px] justify-center">
            <Button onClick={() => handleSave(answers)} disabled={isPending}>
              {isPending ? t("survey.saving") : t("survey.save")}
            </Button>
          </div>
        </>
      )}
    />
  );
}
