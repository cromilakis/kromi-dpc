"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, StatusBadge } from "@/components/ui";
import {
  savePublicDiagnosis,
  type SavePublicDiagnosisError,
} from "@/lib/actions/diagnosis-public";
import type { DiagnosisAnswers } from "@/lib/interview/answers-schema";
import { normalizeAnswers } from "@/lib/interview/normalize-answers";
import type { ComplianceQuestion } from "@/lib/interview/questions";
import { ComplianceForm } from "./compliance-form";
import { RatForm } from "./rat-form";

/**
 * Orquestador cliente del autodiagnóstico por token (/diagnosis/[token],
 * modo self, sin cuenta). Mismo patrón de estado y autoguardado con debounce
 * que `DiagnosisManager` (modo asistido) pero:
 * - Autentica cada llamada al server con el TOKEN (no con la sesión de
 *   usuario) — `savePublicDiagnosis` reenvía el token a `save_diagnosis_answers`.
 * - No tiene inicio de sesión, generación de enlace ni materializar: esas
 *   operaciones son exclusivas del consultor (Tareas 6-7).
 * - "Enviar" fuerza un guardado inmediato (sin esperar el debounce) y
 *   muestra una confirmación; no existe un estado de sesión "submitted" para
 *   el modo self en el esquema actual (`save_diagnosis_answers` siempre deja
 *   la sesión en 'in_progress'), así que la confirmación es una vista local
 *   — el visitante puede seguir editando y autoguardando después de enviar.
 */

type SaveState = "idle" | "saving" | "saved" | "error";

export function PublicDiagnosisManager({
  token,
  initialStatus,
  questions,
  initialAnswers,
}: {
  token: string;
  initialStatus: "draft" | "in_progress" | "submitted" | "reviewed";
  questions: ComplianceQuestion[];
  initialAnswers: unknown;
}) {
  const t = useTranslations("app.diagnosis");
  const tPublic = useTranslations("app.diagnosis.public");
  const tErrors = useTranslations("app.diagnosis.public.errors");

  const [answers, setAnswers] = useState<DiagnosisAnswers>(() =>
    normalizeAnswers(initialAnswers, questions),
  );
  const [sessionStatus, setSessionStatus] = useState(initialStatus);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<SavePublicDiagnosisError | null>(null);

  const [submitPending, setSubmitPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Autoguardado con debounce: se omite en el primer render (esos `answers`
  // ya son los que trajo el server). El estado "saving" se marca en
  // `updateAnswers` (evento del usuario), no aquí.
  const skipFirstSave = useRef(true);
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void (async () => {
        const result = await savePublicDiagnosis(token, answers);
        if (result.ok) {
          setSaveState("saved");
          setSaveError(null);
          setSessionStatus("in_progress");
        } else {
          setSaveState("error");
          setSaveError(result.error);
        }
      })();
    }, 1200);
    return () => clearTimeout(timer);
  }, [answers, token]);

  function updateAnswers(updater: (current: DiagnosisAnswers) => DiagnosisAnswers) {
    setAnswers(updater);
    setSaveState("saving");
  }

  function handleSubmit() {
    setSubmitPending(true);
    void (async () => {
      const result = await savePublicDiagnosis(token, answers);
      setSubmitPending(false);
      if (result.ok) {
        setSaveState("saved");
        setSaveError(null);
        setSessionStatus("in_progress");
        setSubmitted(true);
      } else {
        setSaveState("error");
        setSaveError(result.error);
      }
    })();
  }

  return (
    <div className="flex flex-col gap-20">
      <Card className="flex flex-wrap items-center justify-between gap-12">
        <div className="flex flex-wrap items-center gap-12">
          <StatusBadge pill variant="neutral">
            {t(`status.${sessionStatus}`)}
          </StatusBadge>
          <p
            role="status"
            aria-live="polite"
            className="text-caption leading-caption text-carbon"
          >
            {saveState === "saving" ? t("autosave.saving") : null}
            {saveState === "saved" ? t("autosave.saved") : null}
            {saveState === "error" ? (
              <span className="text-danger-red">
                {saveError ? tErrors(saveError) : t("autosave.error")}
              </span>
            ) : null}
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={submitPending}>
          {submitPending ? tPublic("submit.sending") : tPublic("submit.button")}
        </Button>
      </Card>

      {submitted ? (
        <p role="status" className="text-caption leading-caption text-success-green">
          {tPublic("submit.done")}
        </p>
      ) : null}

      <section aria-labelledby="diagnosis-rat-title">
        <h2 id="diagnosis-rat-title" className="mb-4 text-body-sm font-semibold text-ink">
          {t("sections.rat.title")}
        </h2>
        <p className="mb-12 text-caption leading-caption text-carbon">
          {t("sections.rat.description")}
        </p>
        <RatForm
          activities={answers.rat}
          onChange={(rat) => updateAnswers((current) => ({ ...current, rat }))}
        />
      </section>

      <section aria-labelledby="diagnosis-compliance-title">
        <h2 id="diagnosis-compliance-title" className="mb-4 text-body-sm font-semibold text-ink">
          {t("sections.compliance.title")}
        </h2>
        <p className="mb-12 text-caption leading-caption text-carbon">
          {t("sections.compliance.description")}
        </p>
        <ComplianceForm
          questions={questions}
          value={answers.compliance}
          onChange={(controlCode, index, answer) =>
            updateAnswers((current) => {
              const next = [...(current.compliance[controlCode] ?? [])];
              next[index] = answer;
              return { ...current, compliance: { ...current.compliance, [controlCode]: next } };
            })
          }
        />
      </section>
    </div>
  );
}
