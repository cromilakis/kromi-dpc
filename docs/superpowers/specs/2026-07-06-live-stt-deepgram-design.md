# Escucha activa por voz (STT en vivo, Deepgram) — Fase 3 — Diseño

**Fecha:** 2026-07-06
**Estado:** aprobado (diseño)
**Relacionado:** entrevistador IA (`2026-07-06-ai-live-interviewer-design.md` §C), panel en vivo
(`live-interview-panel.tsx`), extracción exhaustiva (`extract-diagnosis.ts`).

## Visión

Enchufar **voz real** al panel en vivo: la IA escucha la reunión (presencial u online por
Meet), transcribe en vivo y alimenta el **mismo cerebro** que ya existe
(`extractDiagnosisFromTranscript`) — llena el checklist, tacha lo resuelto, baja la cobertura.
Las entradas **manual** y **pegar transcripción** se conservan intactas siempre.

## Decisiones (aprobadas)

1. **Arquitectura:** navegador → Deepgram **directo** con **token efímero** minteado por el
   servidor (`DEEPGRAM_API_KEY` server-only). Sin proxear audio por nuestro backend. Menor
   latencia y secreto nunca sale al cliente.
2. **Fuentes de audio:** ambas — **micrófono** (`getUserMedia`, presencial) y **audio de
   pestaña** (`getDisplayMedia`, Meet/Zoom online). Ambas producen un `MediaStream` que
   alimenta el mismo pipeline.
3. **Consentimiento:** aviso + **consentimiento registrado** en la sesión antes de iniciar
   (texto legal borrador, pendiente de abogado).

## Arquitectura

### A. Token efímero (servidor)
- Server action `grantDeepgramToken()`: usa el SDK `@deepgram/sdk`
  (`new DeepgramClient({ apiKey }).auth.v1.tokens.grant({ ttl_seconds: 60 })`) y devuelve
  `{ ok, token, expiresIn }`. Sin `DEEPGRAM_API_KEY` o permisos insuficientes ⇒
  `{ ok:false, error:"stt_disabled" }` (degradación elegante). Guard: consultor autenticado.
- **Requisito de la key:** debe tener scope **`usage:write`** (rol Member+). Una key con solo
  `account:write` da 403 en el grant (y no puede transcribir).

### B. Captura + streaming (navegador)
- Hook `lib/stt/use-deepgram-live.ts` (client): pide el token, abre la conexión
  (`new DeepgramClient({ accessToken }).listen.v1.connect({ model:"nova-2", language:"es",
  smart_format:true, interim_results:true })`), captura el `MediaStream` (mic o pestaña),
  y con `MediaRecorder` (webm/opus, timeslice ~250 ms) envía chunks con `socket.sendMedia`.
- Eventos: `message` (type `Results`) → `channel.alternatives[0].transcript` con `is_final`
  → callbacks `onInterim(text)` / `onFinal(text)`. `sendKeepAlive` periódico; al parar,
  `sendCloseStream` + `close`. Estados: `idle | connecting | listening | error`.

### C. Integración con el cerebro (panel en vivo)
- Los **finales** se acumulan en el transcript del `LiveInterviewPanel` (mismo estado que la
  entrada manual). Auto-análisis **debounced** (p. ej. cada ~20 s de texto final nuevo o al
  parar) llamando `extractDiagnosisFromTranscript` → auto-integra cumplimiento/alertas y
  ofrece RAT, exactamente como hoy. Los **interinos** se muestran en vivo (no se persisten).
- Manual/pegar siguen disponibles; la voz es un modo adicional dentro del mismo panel.

### D. Consentimiento
- Gate antes de iniciar: checkbox + texto (borrador). Al aceptar e iniciar:
  `recordListeningConsent(sessionId)` marca `interview_sessions.listening_consent_at` +
  `audit_log` (`interview.listening_consent`). Sin consentimiento, el botón de iniciar está
  deshabilitado.

## Modelo de datos
- Migración: `interview_sessions.listening_consent_at timestamptz null`. Sin más cambios (el
  transcript ya se persiste; la cola/cobertura se derivan).

## Determinismo, seguridad, auditoría
- El transcrito es la fuente auditada; el cerebro sigue siendo determinista (cita/alerta;
  gate humano en "Aplicar diagnóstico"). Token efímero server-only; audio directo a Deepgram
  (no lo almacenamos como audio). Consentimiento registrado.

## Límites de verificación
- El audio real (mic/pestaña) **no** es testeable en este entorno (sin micrófono; Playwright
  no alimenta audio). Se verifica: minteo del token (integración real cuando la key tenga
  `usage:write`), degradación elegante (sin permisos → manual sigue), estados de UI, typecheck
  /build/tests. La prueba con voz real la hace el usuario.

## Fuera de alcance (posterior)
- Diarización (quién habla), multi-idioma, resúmenes automáticos, self-service del cliente por
  voz (Fase 4b). Propuesta de resolución ya existe (Fase 2) y se dispara igual tras la escucha.
