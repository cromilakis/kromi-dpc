# Escucha activa por voz (STT en vivo, Deepgram) — Fase 3 — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** El panel en vivo puede escuchar la reunión (mic o pestaña Meet), transcribir en vivo
con Deepgram (token efímero) y alimentar el cerebro existente; con consentimiento registrado y
degradación elegante. Manual/pegar intactos.

**Tech Stack:** Next.js 16, TypeScript, next-intl, Supabase, `@deepgram/sdk` v5, DeepSeek (ya).

## Global Constraints
- Secreto server-only (`DEEPGRAM_API_KEY`); token efímero al cliente (TTL 60s). Consultor
  autenticado en las actions. Zod en servidor. `audit_log` en el consentimiento.
- i18n (`app.diagnosis.live.listening.*`); prosa español / código inglés; spacing tokens
  válidos; `cursor-pointer`. No romper manual/pegar ni `pnpm test`/`test:rls`.

---

### Task 1: Migración — consentimiento de escucha
- Create: `supabase/migrations/<ts>_listening_consent.sql`; Modify: `lib/supabase/types.ts`.
- SQL: `alter table public.interview_sessions add column if not exists listening_consent_at timestamptz;`
- Aplicar local + `gen types` (stderr aparte). typecheck. Commit.

### Task 2: Server actions
- Modify: `lib/actions/interview.ts`.
- `grantDeepgramToken(): Promise<{ ok:true; token:string; expiresIn:number } | { ok:false;
  error:"unauthorized"|"stt_disabled" }>` — auth; si no hay `DEEPGRAM_API_KEY` ⇒ stt_disabled;
  `new DeepgramClient({ apiKey }).auth.v1.tokens.grant({ ttl_seconds:60 })`; cualquier error
  del SDK (incl. 403 permisos) ⇒ stt_disabled (log server).
- `recordListeningConsent(sessionId): Promise<InterviewActionResult>` — auth + Zod; set
  `listening_consent_at = now()`; `audit_log` `interview.listening_consent`.
- typecheck. Commit.

### Task 3: Hook STT
- Create: `lib/stt/use-deepgram-live.ts` (client).
- API: `useDeepgramLive({ onInterim, onFinal, onError }) => { status, start(source), stop() }`
  con `status: "idle"|"connecting"|"listening"|"error"`, `source: "mic"|"tab"`.
- `start`: `grantDeepgramToken()` → si !ok, `onError(error)` y status error; obtener stream
  (`getUserMedia({audio:true})` o `getDisplayMedia({video:true,audio:true})` — tomar solo
  audio); `new DeepgramClient({ accessToken:token }).listen.v1.connect({...})`; en `open` →
  `MediaRecorder(stream,{mimeType})` con `ondataavailable → socket.sendMedia(e.data)`,
  `start(250)`; keepAlive cada 8s. `message` type Results → onInterim/onFinal por is_final.
- `stop`: recorder.stop(), tracks.stop(), `sendCloseStream({})`, `close()`, limpiar timers.
- typecheck. Commit.

### Task 4: Integración en el panel + i18n
- Modify: `components/interview/live-interview-panel.tsx`, `messages/app/diagnosis.json`.
- Sección "Escucha activa" en el panel: gate de consentimiento (checkbox + texto), toggle
  fuente (Micrófono/Compartir pestaña), botón Iniciar/Detener, transcripción interina en vivo.
- `onFinal(text)` → append al transcript acumulado del panel; auto-análisis debounced
  (~20s de texto nuevo o al Detener) reusando el flujo actual (`extractDiagnosisFromTranscript`
  + `integrateExtraction`). `onInterim` → estado local mostrado. `onError` → i18n; manual sigue.
- Al iniciar (tras consentimiento): `recordListeningConsent(sessionId)`.
- i18n `listening.*`: title, consentText, consentCheckbox, sourceMic, sourceTab, start, stop,
  connecting, listening, interimLabel, errors(stt_disabled, mic_denied, generic).
- typecheck + build + `pnpm test`/`test:rls`. Commit.
- E2E (orquestador): verificar que sin permisos de key el panel muestra el error y manual/pegar
  siguen; estados de UI; (audio real lo prueba el usuario).

## Handoff
Migración local → cloud al cerrar. Requiere key Deepgram con `usage:write`. Merge + deploy.
