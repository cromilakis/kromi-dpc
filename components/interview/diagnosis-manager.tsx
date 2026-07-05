"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, StatusBadge } from "@/components/ui";
import {
  createDiagnosisSession,
  createDiagnosisShareLink,
  materializeDiagnosis,
  saveDiagnosisDraft,
  type InterviewActionError,
} from "@/lib/actions/interview";
import type { DiagnosisAnswers } from "@/lib/interview/answers-schema";
import { normalizeAnswers } from "@/lib/interview/normalize-answers";
import type { ComplianceQuestion } from "@/lib/interview/questions";
import type { RatActivity } from "@/lib/interview/rat-schema";
import type { ExtractionResult } from "@/lib/llm/extract-diagnosis";
import { ComplianceForm } from "./compliance-form";
import { ExtractionReview } from "./extraction-review";
import { RatForm } from "./rat-form";
import { TranscriptImport } from "./transcript-import";

/**
 * Orquestador cliente del diagnóstico (/app/companies/[id]/diagnosis):
 * dueño del estado `answers` ({ rat, compliance }, forma canónica de
 * `interview_sessions.answers` — Tareas 6-8) y de las 4 acciones del server
 * (Tarea 6): iniciar sesión, autoguardar, generar enlace de autodiagnóstico
 * y materializar. `saveDiagnosisDraft` SIEMPRE reemplaza el objeto `answers`
 * completo (nunca un patch parcial) — por eso el autosave manda el estado
 * entero en cada guardado, con debounce de 1.2s para no golpear al server en
 * cada tecla.
 */

type SessionStatus = "draft" | "in_progress" | "submitted" | "reviewed";
type SaveState = "idle" | "saving" | "saved" | "error";
type ShareState = "idle" | "loading" | "error";
type MaterializeState = "idle" | "loading" | "done" | "error";

export function DiagnosisManager({
  companyId,
  sessionId: initialSessionId,
  sessionStatus: initialSessionStatus,
  questions,
  initialAnswers,
  companyFactors,
}: {
  companyId: string;
  sessionId: string | null;
  sessionStatus: SessionStatus | null;
  questions: ComplianceQuestion[];
  initialAnswers: unknown;
  companyFactors: string[];
}) {
  const t = useTranslations("app.diagnosis");
  const tErrors = useTranslations("app.diagnosis.errors");

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(initialSessionStatus);
  const [answers, setAnswers] = useState<DiagnosisAnswers>(() =>
    normalizeAnswers(initialAnswers, questions),
  );

  const [startPending, startTransitionStart] = useTransition();
  const [startError, setStartError] = useState<InterviewActionError | null>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<InterviewActionError | null>(null);

  const [shareState, setShareState] = useState<ShareState>("idle");
  const [shareError, setShareError] = useState<InterviewActionError | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [materializeState, setMaterializeState] = useState<MaterializeState>("idle");
  const [materializeError, setMaterializeError] = useState<InterviewActionError | null>(null);

  // Sugerencias del LLM pendientes de revisión (Tarea 6): el LLM nunca
  // escribe directo sobre `answers` — solo al aceptar una sugerencia en
  // `ExtractionReview` esta pasa a `updateAnswers` y entra al borrador.
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);

  function handleAcceptRat(activity: RatActivity) {
    updateAnswers((current) => ({ ...current, rat: [...current.rat, activity] }));
  }

  function handleAcceptCompliance(
    controlCode: string,
    index: number,
    answer: "yes" | "partial" | "no",
  ) {
    updateAnswers((current) => {
      const next = [...(current.compliance[controlCode] ?? [])];
      next[index] = answer;
      return { ...current, compliance: { ...current.compliance, [controlCode]: next } };
    });
  }

  // Autosave con debounce: se omite en el primer render (esos `answers` ya
  // son los que trajo el server) y cuando todavía no existe sesión. El
  // estado "saving" se marca en `updateAnswers` (evento del usuario), no aquí
  // — llamar setState de forma síncrona al entrar al efecto dispara renders
  // en cascada (regla react-hooks/set-state-in-effect); el efecto solo debe
  // sincronizar con el server (guardar) y actualizar el resultado async.
  const skipFirstSave = useRef(true);
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    if (!sessionId) return;
    const timer = setTimeout(() => {
      void (async () => {
        const result = await saveDiagnosisDraft(sessionId, answers);
        if (result.ok) {
          setSaveState("saved");
          setSaveError(null);
          // El server marca la sesión 'in_progress' en cada guardado exitoso
          // (incluso si ya estaba 'reviewed' tras una materialización previa).
          setSessionStatus("in_progress");
        } else {
          setSaveState("error");
          setSaveError(result.error);
        }
      })();
    }, 1200);
    return () => clearTimeout(timer);
  }, [answers, sessionId]);

  /** Actualiza `answers` y marca "guardando" de inmediato (feedback óptimo
   * desde el evento del usuario) — el autosave con debounce corre en el
   * efecto de arriba. */
  function updateAnswers(updater: (current: DiagnosisAnswers) => DiagnosisAnswers) {
    setAnswers(updater);
    setSaveState("saving");
  }

  /** Override de aplicabilidad (Tarea 4): `include=true` fuerza incluir un
   * control en la entrevista, `include=false` lo marca "No aplica" a mano,
   * `include=undefined` borra el override (vuelve al cálculo por factores). */
  function handleSetApplicability(controlCode: string, include: boolean | undefined) {
    updateAnswers((current) => {
      const applicability = { ...(current.applicability ?? {}) };
      if (include === undefined) {
        delete applicability[controlCode];
      } else {
        applicability[controlCode] = include;
      }
      return { ...current, applicability };
    });
  }

  function handleStart() {
    setStartError(null);
    startTransitionStart(async () => {
      const result = await createDiagnosisSession(companyId);
      if (result.ok) {
        setSessionId(result.sessionId);
        setSessionStatus("draft");
      } else {
        setStartError(result.error);
      }
    });
  }

  function handleShareLink() {
    if (!sessionId) return;
    setShareState("loading");
    setShareError(null);
    setCopied(false);
    void (async () => {
      const result = await createDiagnosisShareLink(sessionId, companyId);
      if (result.ok) {
        setShareUrl(result.url);
        setShareState("idle");
      } else {
        setShareState("error");
        setShareError(result.error);
      }
    })();
  }

  function handleCopyShareLink() {
    if (!shareUrl) return;
    const absolute =
      typeof window !== "undefined" ? `${window.location.origin}${shareUrl}` : shareUrl;
    void navigator.clipboard.writeText(absolute).then(() => setCopied(true));
  }

  function handleMaterialize() {
    if (!sessionId) return;
    setMaterializeState("loading");
    setMaterializeError(null);
    void (async () => {
      const result = await materializeDiagnosis(sessionId);
      if (result.ok) {
        setMaterializeState("done");
        setSessionStatus("reviewed");
      } else {
        setMaterializeState("error");
        setMaterializeError(result.error);
      }
    })();
  }

  if (!sessionId) {
    return (
      <Card className="p-32 text-center">
        <h2 className="text-body-sm font-semibold text-ink">{t("start.title")}</h2>
        <p className="mx-auto mt-8 max-w-[480px] text-[13px] leading-[1.6] text-carbon">
          {t("start.text")}
        </p>
        {startError ? (
          <p role="alert" className="mt-12 text-caption leading-caption text-danger-red">
            {tErrors(startError)}
          </p>
        ) : null}
        <div className="mt-20">
          <Button onClick={handleStart} disabled={startPending}>
            {startPending ? t("start.starting") : t("start.button")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-20">
      <Card className="flex flex-wrap items-center justify-between gap-12">
        <div className="flex flex-wrap items-center gap-12">
          {sessionStatus ? (
            <StatusBadge pill variant="neutral">
              {t(`status.${sessionStatus}`)}
            </StatusBadge>
          ) : null}
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
        <div className="flex flex-wrap items-center gap-8">
          {sessionId ? (
            <TranscriptImport sessionId={sessionId} onExtracted={setExtraction} />
          ) : null}
          <Button variant="secondary" onClick={handleShareLink} disabled={shareState === "loading"}>
            {shareState === "loading" ? t("actions.generatingLink") : t("actions.shareLink")}
          </Button>
          <Button
            onClick={handleMaterialize}
            disabled={materializeState === "loading"}
          >
            {materializeState === "loading" ? t("actions.materializing") : t("actions.materialize")}
          </Button>
        </div>
      </Card>

      {extraction ? (
        <ExtractionReview
          extraction={extraction}
          onAcceptRat={handleAcceptRat}
          onAcceptCompliance={handleAcceptCompliance}
          onClose={() => setExtraction(null)}
        />
      ) : null}

      {shareError ? (
        <p role="alert" className="text-caption leading-caption text-danger-red">
          {tErrors(shareError)}
        </p>
      ) : null}

      {shareUrl ? (
        <Card className="border-ink/20">
          <div className="flex flex-wrap items-start justify-between gap-12">
            <div className="min-w-0">
              <h2 className="text-body-sm font-semibold text-ink">{t("shareLink.title")}</h2>
              <p className="mt-4 text-caption leading-caption text-carbon">{t("shareLink.text")}</p>
              <p className="mt-8 break-all rounded-tags bg-ash px-8 py-[6px] text-caption leading-caption text-ink">
                {shareUrl}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-8">
              <Button variant="secondary" onClick={handleCopyShareLink}>
                {copied ? t("shareLink.copied") : t("shareLink.copy")}
              </Button>
              <Button variant="ghost" onClick={() => setShareUrl(null)}>
                {t("shareLink.close")}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {materializeError ? (
        <p role="alert" className="text-caption leading-caption text-danger-red">
          {tErrors(materializeError)}
        </p>
      ) : null}
      {materializeState === "done" ? (
        <p role="status" className="text-caption leading-caption text-success-green">
          {t("actions.materialized")}
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
          companyFactors={companyFactors}
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
          companyFactors={companyFactors}
          applicabilityOverrides={answers.applicability ?? {}}
          onSetApplicability={handleSetApplicability}
        />
      </section>
    </div>
  );
}
