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
import type { GuideDomain } from "@/lib/interview/guide";
import { normalizeAnswers } from "@/lib/interview/normalize-answers";
import type { ComplianceQuestion } from "@/lib/interview/questions";
import { applyAnswer } from "@/lib/interview/script/engine";
import { RAT_SCRIPT } from "@/lib/interview/script/rat-script";
import { ComplianceForm } from "./compliance-form";
import { GuidedScript } from "./guided-script";
import { ResolutionProposal } from "./resolution-proposal";
import { RatForm } from "./rat-form";

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

/** Botón de la barra superior del diagnóstico (icono + texto). Clases completas
 * — sin componer con Button — porque `cn` no dedupea (sin tailwind-merge). */
const TEXT_BTN =
  "inline-flex h-32 shrink-0 cursor-pointer items-center gap-6 px-12 " +
  "rounded-buttons border border-slate bg-white text-body-sm text-ink transition-colors " +
  "hover:bg-ash disabled:pointer-events-none disabled:opacity-60";

export function DiagnosisManager({
  companyId,
  sessionId: initialSessionId,
  sessionStatus: initialSessionStatus,
  questions,
  initialAnswers,
  companyFactors,
  guide,
  cycle,
}: {
  companyId: string;
  sessionId: string | null;
  sessionStatus: SessionStatus | null;
  questions: ComplianceQuestion[];
  initialAnswers: unknown;
  companyFactors: string[];
  guide: GuideDomain[];
  cycle: number | null;
}) {
  const t = useTranslations("app.diagnosis");
  const tErrors = useTranslations("app.diagnosis.errors");

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(
    initialSessionStatus,
  );
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
        if (!result.ok) {
          setSaveState("error");
          setSaveError(result.error);
          return;
        }
        setSaveError(null);
        // Flujo tipo encuesta: se aplica automáticamente tras guardar — el
        // diagnóstico se vuelca al checklist DPC y al RAT oficial sin botón. Si
        // la materialización falla (p. ej. borrador aún incompleto) se conserva
        // el guardado y el estado 'in_progress'; no se interrumpe al usuario.
        const applied = await materializeDiagnosis(sessionId);
        setSaveState("saved");
        setSessionStatus(applied.ok ? "reviewed" : "in_progress");
        if (!applied.ok) {
          console.warn("[diagnosis] autoaplicar falló:", applied.error);
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

  /** Respuesta de un nodo del guion guiado (Guion guiado): aplica el efecto al
   * borrador vía el motor determinista (`applyAnswer` — sets de criterios;
   * "Otros"/criterios cubiertos sin veredicto → 'flagged') y persiste el estado
   * del nodo en `answers.script`. Todo en una sola actualización (un autosave).
   * El motor NO decide nada de negocio: solo traduce la opción elegida a
   * criterios; el consultor puede reafinar en la evaluación de cumplimiento. */
  function handleScriptAnswer(nodeId: string, optionIds: string[], other?: string) {
    const node = RAT_SCRIPT.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const { compliance } = applyAnswer(node, optionIds, other);
    updateAnswers((current) => {
      const nextCompliance = { ...current.compliance };
      for (const { control, criterion, answer } of compliance) {
        const arr = [...(nextCompliance[control] ?? [])];
        arr[criterion] = answer;
        nextCompliance[control] = arr;
      }
      return {
        ...current,
        compliance: nextCompliance,
        script: {
          ...(current.script ?? {}),
          [nodeId]: { options: optionIds, ...(other ? { other } : {}) },
        },
      };
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

  // Barra superior del diagnóstico: ciclo + estado + enlace de autodiagnóstico +
  // autoguardado. Ya no hay botón "Aplicar" — el diagnóstico se aplica solo tras
  // guardar (flujo tipo encuesta), así que la barra queda junto a la pill de ciclo.
  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-12">
      <div className="flex flex-wrap items-center gap-8">
        {cycle !== null ? (
          <StatusBadge pill variant="neutral">
            {t("cycleBadge", { cycle })}
          </StatusBadge>
        ) : null}
        {sessionStatus ? (
          <StatusBadge pill variant="neutral">
            {t(`status.${sessionStatus}`)}
          </StatusBadge>
        ) : null}
        <button
          type="button"
          onClick={handleShareLink}
          disabled={shareState === "loading"}
          title={t("actions.shareLink")}
          className={TEXT_BTN}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {t("actions.shareLink")}
        </button>
      </div>
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
  );

  return (
    <div className="flex flex-col gap-20">
      {toolbar}

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

      {/* Entrevista guiada (modo principal): guion determinista de opción
          múltiple que rellena el checklist. Alterna con la grabación/voz de
          arriba y con la evaluación manual de más abajo. */}
      <GuidedScript
        scriptAnswers={answers.script ?? {}}
        factors={companyFactors}
        onAnswer={handleScriptAnswer}
      />

      <section aria-labelledby="diagnosis-rat-title">
        <RatForm
          title={t("sections.rat.title")}
          description={t("sections.rat.description")}
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
          guide={guide}
        />
      </section>

      {/* Propuesta de resolución: al final, tras RAT y evaluación. */}
      <ResolutionProposal sessionId={sessionId} companyId={companyId} />
    </div>
  );
}
