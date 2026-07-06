# Entrevistador IA en tiempo real (asistido) — Diseño (propuesta)

**Fecha:** 2026-07-06
**Estado:** propuesta (pendiente de aprobación)
**Relacionado:** guion de entrevista, evaluación exhaustiva + alertas, autocompletado desde transcripción, aplicabilidad, plan/remediación.

## Visión (del usuario)

Una entrevista **asistida en tiempo real**: la IA plantea la primera pregunta y,
mientras escucha la conversación (voz transcrita en vivo), mantiene una **cola de
preguntas sugeridas** que el consultor va haciendo. Si un tema se responde en la
charla —aunque no se haya preguntado literalmente— la IA lo **tacha como
resuelto**. Con su checklist de ámbitos aplicables, va **llenando el diagnóstico
en vivo**; al lograr cobertura completa, **propone la resolución** de los temas
detectados. Siempre disponible: **subir transcripción** o llenar **manual**.

## Principio rector (se mantiene)

Determinista, sin asunciones. La IA llena con **cita** del transcurso de la
conversación; lo que no puede determinar NO lo inventa → lo deja como **pregunta
pendiente** (sigue en la cola) o como **alerta** ("Requiere aclaración"). El
humano revisa antes de aplicar/emitir. La conversación completa queda **auditada**.

## Lo que ya existe y se reutiliza

- Aplicabilidad (descarta lo que no aplica al perfil de la empresa).
- Guion curado por control (`interview_questions`) = base de la cola de preguntas.
- Checklist objetivo (criterios por control) + evaluación exhaustiva + estado
  `flagged`/"Requiere aclaración".
- Interpretación LLM (DeepSeek) con cita + cobertura (`computeGuideCoverage`).
- Persistencia de la transcripción (auditoría) + flujos "pegar transcripción" y
  manual (se conservan como alternativas).

## Lo nuevo real (arquitectura)

### A. Cerebro: bucle de análisis (usa DeepSeek — ya disponible)
- **Estado de sesión de entrevista**: `{ transcript acumulado, checklist state
  (answers), cola de preguntas sugeridas }`.
- Cada vez que llega texto nuevo (chunk de la conversación), un análisis LLM
  (debounced) recibe: checklist aplicable + lo ya respondido + cola actual +
  transcript acumulado, y devuelve:
  - **fills**: criterios que ahora se pueden determinar → veredicto (yes/partial/no)
    con cita, o `flagged` con motivo (exhaustivo sobre lo aplicable).
  - **queue**: cola de preguntas sugeridas actualizada — marca las **respondidas**
    (aunque no se preguntaran literalmente) y agrega las que faltan para cubrir lo
    pendiente. Ordenada por lo que falta resolver.
  - **done**: cuando toda la cobertura aplicable quedó resuelta o marcada.
- Determinismo: no adivina; si un criterio sigue sin cita, permanece como pregunta
  en la cola (la IA "sigue preguntando"), no como veredicto.

### B. UI en vivo (consultor, `/app` diagnóstico)
- Panel de entrevista en vivo con tres zonas: (1) **transcripción** en curso;
  (2) **cola de preguntas sugeridas** (las respondidas tachadas en tiempo real);
  (3) **checklist llenándose** + cobertura ("faltan N criterios").
- El consultor conduce la charla; la IA sugiere qué preguntar y tacha lo cubierto.
- Iniciar / pausar / finalizar la entrevista.

### C. Voz → texto (STT real) — capa enchufable, modo "escucha activa"
- **Modo "escucha activa" (co-piloto):** la IA escucha la conversación en segundo
  plano y ASISTE al consultor —le avisa si ya tiene lo que necesita o qué detalle
  falta preguntar— sin conducir la entrevista. El consultor lidera; la cola de
  preguntas (de A/B) es "lo que falta". Aplica a reunión **online (Meet u otra)**
  y **presencial**.
- **Fuentes de audio** (todas alimentan el mismo cerebro A vía STT):
  - **Presencial**: micrófono del dispositivo (`getUserMedia`).
  - **Online (Meet/Zoom/etc.)**: audio de la llamada capturado en el navegador
    (`getDisplayMedia` con audio de pestaña/pantalla), o el micrófono de la sala.
  - Consideración: capturar audio del otro interlocutor requiere su consentimiento
    (grabación) — mostrar aviso y registrar consentimiento (legal, revisar).
- Servicio STT real (recomendado **Deepgram** por streaming en español; Whisper
  como alternativa por lotes/near-real-time). Requiere **cuenta/clave del
  proveedor** (como DeepSeek/Stripe) → se provisiona por el flujo de integraciones
  cuando esté disponible. `<PROVIDER>_API_KEY` server-only.
- Cualquier fuente de audio → STT → chunks de texto al "cerebro" (A). El texto
  transcrito es la **transcripción auditada**.
- **Build order:** el cerebro (A) + UI (B) funcionan primero sobre **texto**
  (el consultor escribe/pega por tramos, o dictado near-real-time) y el streaming
  de audio (mic presencial / captura de Meet) se enchufa cuando llegue la clave
  STT. Así no se bloquea el desarrollo, y el mismo cerebro sirve para online y
  presencial.

### D. Propuesta de resolución (al cerrar)
- Con el diagnóstico completo (gaps: "No cumple"/parcial/flagged), un paso LLM
  redacta una **propuesta de resolución** por tema: qué falta y una acción
  sugerida. Se conecta con el modelo de **plan de adecuación/remediación** ya
  existente (no reinventa el modelo). Borrador editable por el consultor; nunca se
  auto-emite un certificado.

## Modelo de datos (incremental)
- Reutiliza `interview_sessions` (transcript + answers). Para la cola de preguntas
  y el estado en vivo: v1 puede mantenerlo en el cliente + autosave del transcript;
  si se requiere persistir la cola/curso, una columna `live_state jsonb` en la
  sesión (decisión del plan).
- La propuesta de resolución cae en el modelo de remediación/plan existente
  (revisar `remediation_items`/plan al planificar).

## Determinismo, seguridad, auditoría
- Fills siempre con cita del transcript; sin cita → pregunta pendiente o alerta.
- Transcripción completa persistida (RLS consultor). STT server-only.
- El humano confirma antes de "Aplicar diagnóstico" y antes de emitir. La IA
  propone; no decide certificación.

## Costo / latencia
- Análisis LLM por chunk (debounced, no por palabra) para acotar costo/latencia.
- STT en streaming factura por minuto de audio.
- Se registra `usage`/tokens en audit para monitoreo.

## Fuera de v1 / posterior
- Diarización (quién habla), multi-idioma, resúmenes automáticos, entrevista
  self-service del cliente por voz (Fase 4b), auto-emisión.

## Decisiones para el plan
1. Confirmar proveedor STT (Deepgram streaming vs Whisper) — y su cuenta/clave.
2. Persistir la cola/estado en vivo (`live_state jsonb`) vs solo cliente + transcript.
3. Cadencia del análisis LLM (cada N segundos / cada N caracteres nuevos).
4. Alcance de la "propuesta de resolución" (una acción por gap vs plan estructurado).
5. Orden de construcción sugerido: (1) cerebro sobre texto + UI + cola/tachado +
   fills + cobertura; (2) propuesta de resolución; (3) enchufar STT/voz real.
