"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, StatusBadge, Textarea, cn } from "@/components/ui";
import {
  extractDiagnosisFromTranscript,
  recordListeningConsent,
} from "@/lib/actions/interview";
import {
  useDeepgramLive,
  type SttError,
  type SttSource,
} from "@/lib/stt/use-deepgram-live";
import { buildQuestionQueue, computeGuideCoverage, type GuideDomain } from "@/lib/interview/guide";
import { ratActivitySchema, type RatActivity } from "@/lib/interview/rat-schema";
import type { ExtractionResult } from "@/lib/llm/extract-diagnosis";
import { buildRatActivity } from "./extraction-review";

/**
 * Panel "Entrevista en vivo" (spec `2026-07-06-ai-live-interviewer-design.md`,
 * Fase 1 Tarea 2): co-piloto de escucha activa — el consultor conduce la
 * conversación y va pegando/escribiendo lo conversado por tramos; al analizar
 * un tramo, la IA (`extractDiagnosisFromTranscript`, misma extracción
 * exhaustiva que `TranscriptImport`) revisa el TRANSCRIPT ACUMULADO completo
 * y:
 * - **auto-integra** cumplimiento y alertas al borrador vía los callbacks del
 *   manager (`onAcceptCompliance`) — idempotente porque cada fill pisa el
 *   mismo índice de criterio, re-analizar no duplica nada;
 * - **ofrece** el RAT detectado para aceptar (nunca se auto-agrega, para no
 *   duplicar actividades), dedupeado por `name` contra lo ya pendiente Y lo
 *   ya aceptado en la sesión.
 * La **cola de preguntas** (`buildQuestionQueue`) y la **cobertura**
 * (`computeGuideCoverage`) se recalculan en cada render a partir de
 * `compliance`, que llega por props desde el estado `answers` del manager —
 * por eso tachar una pregunta es automático apenas el fill entra al borrador,
 * sin lógica adicional acá.
 */

type LiveInterviewError = "llm_disabled" | "llm_failed" | "generic";

export function LiveInterviewPanel({
  sessionId,
  guide,
  compliance,
  onAcceptCompliance,
  onAcceptRat,
}: {
  sessionId: string;
  guide: GuideDomain[];
  compliance: Record<string, string[]>;
  onAcceptCompliance: (
    controlCode: string,
    index: number,
    answer: "yes" | "partial" | "no" | "flagged",
  ) => void;
  onAcceptRat: (activity: RatActivity) => void;
}) {
  const t = useTranslations("app.diagnosis.live");

  const [transcript, setTranscript] = useState("");
  const [chunk, setChunk] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<LiveInterviewError | null>(null);
  const [pendingRat, setPendingRat] = useState<RatActivity[]>([]);

  // Escucha activa por voz (Fase 3).
  const [consent, setConsent] = useState(false);
  const [source, setSource] = useState<SttSource>("mic");
  const [interim, setInterim] = useState("");
  const [sttError, setSttError] = useState<SttError | null>(null);
  // Siguiente mejor pregunta sugerida por la IA (guía; el consultor decide).
  const [suggested, setSuggested] = useState<ExtractionResult["nextQuestion"]>(null);
  // El análisis corre en paralelo al micrófono (no lo detiene).
  const [analyzing, setAnalyzing] = useState(false);
  // Ref con el transcript vigente para el análisis periódico (closure estable).
  const transcriptRef = useRef("");
  transcriptRef.current = transcript;
  const analyzingRef = useRef(false); // evita análisis solapados
  // Cola FIFO de análisis: cada clic "Analizar lo escuchado" encola el
  // transcrito hasta ese punto; se procesan en serie (uno a la vez) mientras el
  // micrófono sigue abierto. Si la conversación va más rápido que el análisis,
  // los pendientes se acumulan y se resuelven en orden.
  const analysisQueueRef = useRef<string[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);

  const queue = useMemo(() => buildQuestionQueue(guide, compliance), [guide, compliance]);
  const coverage = useMemo(() => computeGuideCoverage(guide, compliance), [guide, compliance]);
  // Nombre de control por código, para mostrar la sugerencia de la IA con su tema.
  const controlNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const domain of guide) {
      for (const control of domain.controls) map.set(control.code, control.name);
    }
    return map;
  }, [guide]);

  // Temas resueltos (controles cubiertos): sección visible que crece a medida
  // que los análisis cierran temas.
  const resolvedControls = useMemo(() => {
    const uncovered = new Set(coverage.uncovered.map((u) => u.controlCode));
    const names: string[] = [];
    for (const domain of guide) {
      for (const control of domain.controls) {
        if (!uncovered.has(control.code)) names.push(control.name);
      }
    }
    return names;
  }, [guide, coverage]);

  // Cola de preguntas: solo lo pendiente (los resueltos van a "Temas resueltos").
  const pendingQueue = useMemo(
    () => queue.filter((q) => q.status !== "resolved"),
    [queue],
  );

  function integrateExtraction(extraction: ExtractionResult) {
    // Guía en vivo: la IA sugiere la siguiente mejor pregunta (o null si todo
    // quedó cubierto). No escribe nada al borrador; solo orienta al consultor.
    setSuggested(extraction.nextQuestion);

    for (const suggestion of extraction.compliance) {
      onAcceptCompliance(suggestion.controlCode, suggestion.criterionIndex, suggestion.answer);
    }
    for (const alert of extraction.alerts) {
      onAcceptCompliance(alert.controlCode, alert.criterionIndex, "flagged");
    }

    if (extraction.rat.length === 0) return;
    setPendingRat((current) => {
      const known = new Set(current.map((activity) => activity.name.trim().toLowerCase()));
      const additions: RatActivity[] = [];
      for (const suggestion of extraction.rat) {
        const activity = buildRatActivity(suggestion.fields);
        const parsed = ratActivitySchema.safeParse(activity);
        if (!parsed.success) continue;
        const key = parsed.data.name.trim().toLowerCase();
        if (known.has(key)) continue;
        known.add(key);
        additions.push(parsed.data);
      }
      return additions.length > 0 ? [...current, ...additions] : current;
    });
  }

  function handleAnalyze() {
    if (!chunk.trim() || pending) return;
    setError(null);
    const nextTranscript = transcript ? `${transcript}\n${chunk.trim()}` : chunk.trim();
    startTransition(async () => {
      const result = await extractDiagnosisFromTranscript(sessionId, nextTranscript);
      if (result.ok) {
        setTranscript(nextTranscript);
        setChunk("");
        integrateExtraction(result.extraction);
      } else {
        setError(
          result.error === "llm_disabled" || result.error === "llm_failed"
            ? result.error
            : "generic",
        );
      }
    });
  }

  function handleAcceptActivity(activity: RatActivity) {
    onAcceptRat(activity);
    setPendingRat((current) =>
      current.filter((candidate) => candidate.name !== activity.name),
    );
  }

  // Analiza el transcript acumulado vigente (usado por la escucha por voz). La
  // extracción es exhaustiva e idempotente, así que re-analizar el acumulado no
  // duplica nada; los fills entran al borrador vía integrateExtraction.
  // Procesa la cola de análisis uno por uno (serial). El micrófono sigue abierto
  // en paralelo; al terminar un análisis toma el siguiente de la cola.
  function drainAnalysisQueue() {
    if (analyzingRef.current) return;
    const next = analysisQueueRef.current.shift();
    setQueuedCount(analysisQueueRef.current.length);
    if (!next) return;
    analyzingRef.current = true;
    setAnalyzing(true);
    startTransition(async () => {
      const result = await extractDiagnosisFromTranscript(sessionId, next);
      if (result.ok) integrateExtraction(result.extraction);
      analyzingRef.current = false;
      setAnalyzing(false);
      drainAnalysisQueue(); // siguiente en cola
    });
  }

  // "Analizar lo escuchado": encola el transcrito acumulado hasta este punto.
  // La IA suma este contexto para determinar qué criterios resolver y qué falta
  // preguntar. No detiene el micrófono.
  function enqueueAnalysis() {
    const full = transcriptRef.current.trim();
    if (!full) return;
    analysisQueueRef.current.push(full);
    setQueuedCount(analysisQueueRef.current.length);
    drainAnalysisQueue();
  }

  const stt = useDeepgramLive({
    onInterim: (text) => setInterim(text),
    onFinal: (text) => {
      setInterim("");
      setTranscript((prev) => (prev ? `${prev}\n${text}` : text));
    },
    onError: (err) => setSttError(err),
  });

  // Mientras se escucha, un Finalize periódico (cada 4 s) fuerza que el audio en
  // buffer salga como tramo final, para que el transcrito en pantalla se
  // mantenga al día aunque el habla sea continua. El ANÁLISIS ya no es
  // automático: lo dispara el consultor con "Analizar lo escuchado".
  useEffect(() => {
    if (stt.status !== "listening") return;
    const id = setInterval(() => stt.finalize(), 4000);
    return () => clearInterval(id);
  }, [stt.status, stt.finalize]);

  async function handleStartListening() {
    if (!consent) return;
    setSttError(null);
    // Registra el consentimiento (auditable) antes de abrir el micrófono.
    await recordListeningConsent(sessionId);
    await stt.start(source);
  }

  function handleStopListening() {
    stt.stop();
    setInterim("");
    enqueueAnalysis(); // flush: encola un análisis del acumulado al detener
  }

  const listening = stt.status === "listening";
  const connecting = stt.status === "connecting";

  return (
    <Card className="flex flex-col gap-20">
      <div>
        <h2 className="text-body-sm font-semibold text-ink">{t("title")}</h2>
        <p className="mt-4 text-caption leading-caption text-carbon">{t("subtitle")}</p>
      </div>

      {/* Escucha activa por voz (Fase 3): consentimiento + fuente + iniciar. */}
      <div className="flex flex-col gap-8 rounded-tags border border-stone bg-ash/40 p-12">
        <h3 className="text-caption font-medium leading-caption text-ink">
          {t("listening.title")}
        </h3>

        {!listening && !connecting ? (
          <>
            <label className="flex items-start gap-8 text-caption leading-caption text-carbon">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-[2px] cursor-pointer"
              />
              <span>{t("listening.consentText")}</span>
            </label>

            <div className="flex flex-wrap items-center gap-8">
              <div className="flex overflow-hidden rounded-tags border border-stone">
                {(["mic", "tab"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(s)}
                    className={cn(
                      "cursor-pointer px-12 py-4 text-caption leading-caption",
                      source === s ? "bg-ink text-white" : "bg-white text-carbon",
                    )}
                  >
                    {t(`listening.source_${s}`)}
                  </button>
                ))}
              </div>
              <Button onClick={handleStartListening} disabled={!consent}>
                {t("listening.start")}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center gap-8">
              <StatusBadge variant={listening ? "positive" : "neutral"}>
                {connecting ? t("listening.connecting") : t("listening.listening")}
              </StatusBadge>
              {listening ? (
                <Button onClick={enqueueAnalysis} disabled={!transcript.trim()}>
                  {t("listening.analyzeHeard")}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={handleStopListening}>
                {t("listening.stop")}
              </Button>
            </div>
            {analyzing || queuedCount > 0 ? (
              <p className="text-caption leading-caption text-carbon">
                {t("listening.analyzingHeard")}
                {queuedCount > 0
                  ? ` · ${t("listening.queued", { n: queuedCount })}`
                  : ""}
              </p>
            ) : null}
          </div>
        )}

        {interim ? (
          <p className="text-caption italic leading-caption text-metal">
            {t("listening.interimLabel")}: {interim}
          </p>
        ) : null}
        {sttError ? (
          <p role="alert" className="text-caption leading-caption text-danger-red">
            {t(`listening.errors.${sttError}`)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-8">
        <Textarea
          value={chunk}
          onChange={(event) => setChunk(event.target.value)}
          placeholder={t("chunkPlaceholder")}
          disabled={pending}
          className="min-h-[120px]"
        />
        {error ? (
          <p role="alert" className="text-caption leading-caption text-danger-red">
            {t(`errors.${error}`)}
          </p>
        ) : null}
        <div>
          <Button onClick={handleAnalyze} disabled={pending || !chunk.trim()}>
            {pending ? t("analyzing") : t("analyze")}
          </Button>
        </div>
      </div>

      {transcript ? (
        <div>
          <h3 className="mb-8 text-caption font-medium leading-caption text-ink">
            {t("transcriptTitle")}
          </h3>
          <div className="max-h-[160px] overflow-y-auto rounded-tags bg-ash px-12 py-8">
            <p className="whitespace-pre-wrap text-caption leading-caption text-carbon">
              {transcript}
            </p>
          </div>
        </div>
      ) : null}

      {/* Temas resueltos: crece a medida que los análisis cierran controles. */}
      {resolvedControls.length > 0 ? (
        <div>
          <h3 className="mb-8 text-body-sm font-semibold text-ink">
            {t("resolvedTitle")} ({resolvedControls.length})
          </h3>
          <ul className="flex flex-col gap-4">
            {resolvedControls.map((name) => (
              <li
                key={name}
                className="flex items-baseline gap-8 rounded-tags bg-ash px-8 py-4"
              >
                <StatusBadge variant="positive">{t("answered")}</StatusBadge>
                <span className="text-body-sm text-metal line-through">{name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-8">
          <h3 className="text-body-sm font-semibold text-ink">{t("queueTitle")}</h3>
          {coverage.uncovered.length === 0 ? (
            <StatusBadge variant="positive">{t("ready")}</StatusBadge>
          ) : (
            <StatusBadge variant="warning">
              {t("coverage", { n: coverage.uncovered.length, total: coverage.total })}
            </StatusBadge>
          )}
        </div>
        {/* Siguiente mejor pregunta sugerida por la IA (guía en vivo, destacada
            al tope). La IA propone según lo conversado; el consultor decide. */}
        {suggested ? (
          <div className="mb-8 rounded-tags border border-focus-blue bg-focus-blue/5 px-12 py-8">
            <div className="mb-4 flex items-center gap-8">
              <StatusBadge variant="positive">{t("suggestedLabel")}</StatusBadge>
              {controlNameByCode.get(suggested.controlCode) ? (
                <span className="text-caption leading-caption text-carbon">
                  {controlNameByCode.get(suggested.controlCode)}
                </span>
              ) : null}
            </div>
            <p className="text-body-sm font-semibold text-ink">{suggested.question}</p>
            {suggested.reason ? (
              <p className="mt-4 text-caption leading-caption text-carbon">
                {suggested.reason}
              </p>
            ) : null}
          </div>
        ) : null}
        {/* Pregunta de apertura: siempre al tope, encuadra la conversación. No
            se tacha ni cuenta para la cobertura (no está ligada a un control). */}
        <div className="mb-8 flex items-baseline gap-8 rounded-tags bg-ash px-8 py-4">
          <StatusBadge variant="neutral">{t("openerLabel")}</StatusBadge>
          <span className="text-body-sm font-medium text-ink">{t("opener")}</span>
        </div>
        {pendingQueue.length === 0 ? (
          <p className="text-caption leading-caption text-carbon">{t("queueEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {pendingQueue.map((question, index) => (
              <li
                key={`${question.controlCode}-${index}`}
                className={cn(
                  "flex items-baseline gap-8 rounded-tags px-8 py-4",
                  index === 0 && "bg-ash",
                )}
              >
                {index === 0 ? (
                  <StatusBadge variant="neutral">{t("nextLabel")}</StatusBadge>
                ) : null}
                <span
                  className={cn(
                    "text-body-sm text-ink",
                    question.status === "clarify" && "text-warning-yellow",
                  )}
                >
                  {question.question}
                </span>
                {question.status === "clarify" ? (
                  <StatusBadge variant="warning">{t("clarify")}</StatusBadge>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingRat.length > 0 ? (
        <div>
          <h3 className="mb-8 text-body-sm font-semibold text-ink">{t("ratSuggested")}</h3>
          <ul className="flex flex-col gap-8">
            {pendingRat.map((activity) => (
              <li key={activity.name}>
                <Card className="flex flex-wrap items-center justify-between gap-8 border-ink/10">
                  <div className="min-w-0">
                    <p className="text-caption font-medium leading-caption text-ink">
                      {activity.name}
                    </p>
                    <p className="text-caption leading-caption text-carbon">{activity.purpose}</p>
                  </div>
                  <Button onClick={() => handleAcceptActivity(activity)}>
                    {t("acceptActivity")}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
