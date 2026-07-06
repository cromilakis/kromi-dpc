# Cola con opener + orden curado, y propuesta de resolución (Fase 2) — Diseño

**Fecha:** 2026-07-06
**Estado:** aprobado (diseño)
**Relacionado:** entrevistador IA (`2026-07-06-ai-live-interviewer-design.md`, sección D),
guion de entrevista, evaluación exhaustiva + alertas, plan de adecuación (`remediation_items`),
extracción desde transcripción (`lib/llm/extract-diagnosis.ts`).

## Visión (del usuario)

Dos mejoras que van juntas:

1. **Cola de preguntas más ordenada.** La primera pregunta de todas debe ser la **más
   abierta**, la que encamina el resto de la conversación; luego las preguntas van en
   orden; y a medida que avanza la charla se van **tachando** los temas ya resueltos.
2. **Fase 2 — propuesta de resolución (estructurada).** Al cerrar el diagnóstico, la IA
   propone, por cada *gap* detectado, una **acción + prioridad + esfuerzo + plazo**; el
   consultor revisa/edita y acepta, y eso alimenta el **Plan de adecuación** existente.

## Principio rector (se mantiene)

Determinista, cero asunciones. El LLM **propone**; no escribe al expediente ni certifica.
La acción sugerida se ancla al criterio incumplido concreto (no inventa hechos de la
empresa). Prioridad/esfuerzo/plazo son sugerencias claramente **editables**. El humano
confirma cada tarea antes de que entre al plan.

---

## A. Cola: opener + orden curado + tachado en vivo

### A.1 Opener (pregunta de apertura)

- Una única **pregunta de apertura amplia**, curada, que **encabeza siempre** la cola y
  encuadra la conversación. No está ligada a un control ⇒ **no se tacha** ni cuenta para la
  cobertura: es el marco/arranque.
- Vive como texto i18n `app.diagnosis.live.opener` (tuneable por consultor/abogado, como el
  resto del contenido de UI). No requiere migración.
- En el panel se renderiza **distinta**: como ítem-lead fijo arriba, con etiqueta "Apertura"
  (badge neutral), sin `line-through` ni "Respondida".

### A.2 Orden curado (abierta → específica)

- Los dominios ya tienen columna `domains.sort`. Una **migración de datos** fija un orden
  conversacional que arranca por lo transversal (qué datos / para qué) y baja a lo
  específico. Orden objetivo (menor = primero), marcado como *pendiente de validación
  consultor/abogado* igual que las preguntas:

  1. `DPC-FIN` Finalidad · 2. `DPC-INV` Inventario y RAT · 3. `DPC-LIC` Licitud y Lealtad ·
  4. `DPC-PRO` Proporcionalidad · 5. `DPC-CAL` Calidad · 6. `DPC-TRA` Transparencia ·
  7. `DPC-DER` Derechos · 8. `DPC-SEG` Seguridad · 9. `DPC-CON` Confidencialidad ·
  10. `DPC-RES` Responsabilidad · 11. `DPC-TER` Encargados y Transferencias ·
  12. `DPC-SEN` Datos Sensibles · 13. `DPC-INC` Incidentes y Brechas ·
  14. `DPC-EIA` Evaluación de Impacto y Decisiones Automatizadas.

- `buildInterviewGuide` ya ordena por `domainSort`; con la migración el guion sale en este
  orden sin cambiar código de ordenamiento.

### A.3 Comportamiento de la cola (se mantiene lo aprobado)

- Dentro del orden curado, `buildQuestionQueue` **mantiene** el reorden por estado
  `clarify → pending → resolved` (lo de la iteración anterior): las resueltas se tachan, las
  `Falta aclarar` suben para no cerrar sin resolverlas, `Siguiente` = primera no resuelta.
- El **opener** queda pineado por encima de ese reorden (índice 0, sin estado).
- La cobertura y el gate "listo para aplicar" no cambian (solo cuentan controles).

### A.4 Modelo de datos

- Sin cambios de esquema. Solo migración de datos (`domains.sort`) + i18n (opener).

---

## B. Fase 2: propuesta de resolución estructurada

### B.1 Qué es un *gap*

Leídos del **borrador** de la sesión (`interview_sessions.answers.compliance`), sobre los
controles **aplicables** a la empresa:

- criterio con veredicto `no` (No cumple) — severidad alta,
- criterio con veredicto `partial` (parcial) — severidad media,
- criterio `flagged` (Falta aclarar) — severidad media/alta (requiere aclaración).

Los `yes` y `unknown` (sin evaluar) no generan propuesta. `unknown` no es gap: sigue siendo
pregunta pendiente de la cola, no algo a "remediar".

### B.2 Paso LLM (DeepSeek, determinista)

- Nuevo helper puro `lib/llm/propose-remediation.ts`, mismo patrón que `extract-diagnosis`
  (`chatJSON`, temp 0, `json_object`, Zod tolerante).
- **Entrada:** lista de gaps `{ controlCode, controlName, criterion (texto), gapType }`.
- **Salida** por gap: `{ controlCode, criterionIndex, gapType, action, priority, effort,
  suggestedDueWeeks, rationale }`.
  - `action`: acción concreta para satisfacer ese criterio (imperativo, sin inventar hechos
    de la empresa).
  - `priority`: `alta | media | baja` (heurística por severidad; `no` ≥ `flagged` ≥ `partial`).
  - `effort`: `bajo | medio | alto` (estimación gruesa).
  - `suggestedDueWeeks`: entero (semanas sugeridas desde hoy).
  - `rationale`: por qué (referencia al criterio incumplido).
- **Cero asunciones:** el prompt prohíbe afirmar hechos de la empresa más allá del veredicto;
  si no puede proponer una acción con sentido, devuelve `action` vacío ⇒ ese gap se descarta
  de la propuesta (no se inventa).

### B.3 Server action

- `proposeRemediation(sessionId)` en `lib/actions/remediation.ts` (o interview):
  auth consultor + lectura de sesión/empresa (mismo patrón que
  `extractDiagnosisFromTranscript`), arma los gaps desde el borrador aplicando aplicabilidad,
  llama al helper, y **devuelve** la propuesta (NO persiste todavía).
- Errores i18n: `llm_disabled | llm_failed | unauthorized | not_found | unavailable | validation`.
- Aceptar una propuesta reusa/extiende `createRemediationItem` para escribir la tarea con la
  estructura (ver B.5). Nunca auto-crea: una acción explícita del consultor por tarjeta.

### B.4 UI

- Componente `components/interview/resolution-proposal.tsx` (client), montado en
  `DiagnosisManager` como sección "Propuesta de resolución", visible cuando hay gaps.
- Botón **"Proponer resolución"** → llama `proposeRemediation` → **tarjetas por gap**:
  - control (nombre) + criterio + badge del veredicto,
  - **acción sugerida editable** (textarea),
  - `priority` (select), `effort` (select), plazo (date, prellenado de `suggestedDueWeeks`),
  - **[Aceptar → crea tarea]** / **[Descartar]**.
- Al aceptar: crea el `remediation_item` y quita la tarjeta; toast/estado de éxito.
- Estados: cargando, error (i18n), vacío ("sin gaps: nada que proponer").

### B.5 Modelo de datos (migración)

Columnas nullable en `remediation_items` (no rompen el flujo manual actual):

- `priority text` — `alta | media | baja` (check).
- `effort_estimate text` — `bajo | medio | alto` (check).
- `origin text not null default 'manual'` — `manual | diagnosis` (check).
- `control_code text` — trazabilidad al control de origen.
- `criterion_index int` — trazabilidad al criterio de origen.

`due_date` (existente) recibe hoy + `suggestedDueWeeks` (editable). `responsible` lo pone el
consultor. `solution_id` queda null (origen diagnóstico, no catálogo).

### B.6 Determinismo, seguridad, auditoría

- Fills/propuestas siempre con referencia al criterio; sin acción con sentido ⇒ se descarta.
- Consultor autenticado (RLS de su empresa) + verificación en la action (defensa en
  profundidad). Secretos server-only (DEEPSEEK_API_KEY).
- `audit_log` en la creación de tareas (`remediation.item_added`, `source: 'diagnosis'`).
- El LLM propone; el humano confirma. No se emite certificado.

## Fuera de alcance (posterior)

- Voz/STT real (Fase 3). Edición masiva de propuestas. Priorización automática del plan
  completo (más allá de la sugerencia por gap). Generar propuesta desde el expediente ya
  aplicado (v1 usa el borrador de la sesión).

## Decisiones tomadas

1. Cola: **mantener** reorden `clarify → pending → resolved`; opener pineado arriba.
2. Apertura: **opener curado** (i18n) + **orden curado** de dominios (migración de datos).
3. Fase 2: **plan estructurado** (acción + prioridad + esfuerzo + plazo) sobre gaps del
   borrador, materializado en `remediation_items` con columnas nuevas.
