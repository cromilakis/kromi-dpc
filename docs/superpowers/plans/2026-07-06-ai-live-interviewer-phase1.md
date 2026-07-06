# Entrevistador IA en tiempo real — Fase 1 (cerebro sobre texto + UI en vivo) — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Pasos con checkbox (`- [ ]`).

**Goal:** Un panel de entrevista en vivo (consultor, texto — sin voz aún) donde: la IA prioriza qué preguntar (cola derivada del guion + cobertura), a medida que se ingresa lo conversado interpreta y **llena el checklist** (veredicto con cita o alerta), y **tacha** las preguntas cuyo control ya quedó cubierto —aunque no se preguntaran literal—. Todo sobre lo aplicable a la empresa. La voz (STT) y la propuesta de resolución son fases siguientes.

**Architecture:** Reusa `extractDiagnosisFromTranscript` (extracción exhaustiva: compliance/alerts/rat con cita) sobre el **transcript acumulado**; los fills de cumplimiento/alertas se **auto-integran al borrador** (idempotente por control+criterio) vía los callbacks del `DiagnosisManager`; el RAT se ofrece para aceptar (con dedup). La **cola de preguntas** se DERIVA del guion + `computeGuideCoverage` (control cubierto → preguntas tachadas). No hay una 2ª IA para la cola. El humano confirma con "Aplicar diagnóstico".

**Tech Stack:** Next.js 16 (client), TypeScript, Zod, next-intl, Vitest, DeepSeek (ya integrado).

**Relacionado:** spec `2026-07-06-ai-live-interviewer-design.md`; reusa `lib/interview/{guide,load-guide.server}.ts`, `lib/actions/interview.ts` (`extractDiagnosisFromTranscript`), `components/interview/{diagnosis-manager,extraction-review,compliance-form}.tsx`.

## Global Constraints

- **Determinismo:** los fills se aplican al BORRADOR (no al expediente), siempre con cita; lo que el LLM no puede determinar NO se rellena → queda como criterio pendiente (su pregunta sigue en la cola) o alerta. El gate humano sigue siendo "Aplicar diagnóstico". Conversación auditada (transcript persistido).
- **Idempotencia:** re-analizar el transcript acumulado re-aplica cumplimiento/alertas sin duplicar (set por control+criterio). El RAT NO se auto-agrega (dup): se ofrece a aceptar con dedup por nombre.
- **Solo aplicable:** cola y checklist se limitan a los controles aplicables (reusa guion/aplicabilidad).
- **Doctrina:** i18n (`app.diagnosis`); prosa español / código inglés; helpers puros testeables; spacing tokens definidos o px arbitrarios (nunca -6/-10/-14); cursor-pointer.
- **No romper:** los flujos actuales (pegar transcripción, manual, revisión) + `pnpm test`/`test:rls` verdes.

---

### Task 1: Helper de cola de preguntas (derivada de cobertura)

**Files:**
- Modify: `lib/interview/guide.ts` (agregar el builder de cola)
- Test: `test/interview/guide.test.ts`

**Interfaces (Produces):**
- `export interface QueuedQuestion { domainCode: string; domainName: string; controlCode: string; controlName: string; question: string; answered: boolean; }`
- `export function buildQuestionQueue(guide: GuideDomain[], compliance: Record<string, string[]>): QueuedQuestion[]` — aplana el guion a (dominio→control→pregunta); marca `answered=true` cuando el control está cubierto según `computeGuideCoverage` (o directamente: el control tiene ≥1 criterio con respuesta != 'unknown' en `compliance`). Ordena: primero las NO respondidas (por orden de dominio/control), luego las respondidas (tachadas). Así "la siguiente pregunta" = primera `answered=false`.

- [ ] **Step 1: Tests** — `buildQuestionQueue`: control sin respuestas → sus preguntas `answered=false` y arriba; control con una respuesta → sus preguntas `answered=true`; el orden pone las no respondidas primero.
- [ ] **Step 2: Correr y ver fallar.**
- [ ] **Step 3: Implementar** (reusa `computeGuideCoverage` o la misma regla de "cubierto").
- [ ] **Step 4: Correr** → PASS; `pnpm typecheck` OK.
- [ ] **Step 5: Commit** — `feat(interview): cola de preguntas derivada de la cobertura`

---

### Task 2: Panel de entrevista en vivo (texto)

**Files:**
- Create: `components/interview/live-interview-panel.tsx` (client)
- Modify: `components/interview/diagnosis-manager.tsx` (montar el panel + exponer merge), `messages/app/diagnosis.json`

**Interfaces:** consume `guide` (ya en el manager), `extractDiagnosisFromTranscript`, `buildQuestionQueue`, `computeGuideCoverage`, y los callbacks de merge del manager.

Comportamiento del panel (client):
- Mantiene el **transcript acumulado** (estado local, seedeado del transcript de la sesión si existe).
- Zona de ingreso: un `<textarea>` "lo que se va conversando" + botón **"Analizar tramo"** (v1 explícito; la voz/streaming es Fase 3). Al analizar: concatena el tramo nuevo al acumulado, llama `extractDiagnosisFromTranscript(sessionId, transcriptAcumulado)`.
  - **Auto-integra** al borrador: por cada `compliance` fill → `onAcceptCompliance(code, idx, answer)`; por cada `alert` → `onAcceptCompliance(code, idx, 'flagged')`. (Idempotente.)
  - **RAT**: acumula las sugerencias nuevas (dedup por `name`) en una lista para aceptar (reusa el patrón de `ExtractionReview` o botones simples "Aceptar actividad"); NO auto-agrega.
  - Guarda el transcript acumulado (autosave del manager / persistir en la sesión).
- **Cola de preguntas** (`buildQuestionQueue(guide, answers.compliance)`): lista con las no respondidas arriba (la primera resaltada = "siguiente pregunta"), y las respondidas **tachadas**. Se recomputa en vivo al cambiar `answers`.
- **Cobertura**: "faltan N de M criterios" (via `computeGuideCoverage`); cuando 0 → mensaje "diagnóstico listo para aplicar".
- Errores del LLM (`llm_disabled`/`llm_failed`) con i18n.
- i18n `app.diagnosis.live.*`: título, "Analizar tramo", "Siguiente pregunta", "Respondida", "faltan {n}", "listo", "Aceptar actividad", errores.
- Montaje: en `DiagnosisManager`, un modo/pestaña o sección "Entrevista en vivo" junto a las acciones (solo con sesión). Expón desde el manager los callbacks de merge (ya existen `handleAcceptCompliance`, `handleAcceptRat`) y pásalos al panel.

- [ ] **Step 1: i18n** claves `live.*`.
- [ ] **Step 2:** `live-interview-panel.tsx` con el comportamiento de arriba (reusa `buildQuestionQueue`/`computeGuideCoverage`; merge vía callbacks). Spacing tokens válidos; cursor-pointer.
- [ ] **Step 3:** wiring en `diagnosis-manager.tsx` (montar el panel; pasar `guide`, `sessionId`, `answers.compliance`, `handleAcceptCompliance`, `handleAcceptRat`, y un setter para el transcript acumulado si se persiste).
- [ ] **Step 4:** typecheck + build + `pnpm test`/`test:rls` verdes.
- [ ] **Step 5: E2E click-through (orquestador):** empresa micro con sesión; en el panel en vivo, ingresar por tramos la conversación de Margarita → verificar que el checklist se llena, las preguntas cubiertas se tachan, la cobertura baja hasta "listo", y el RAT se ofrece a aceptar sin duplicar. Screenshot.
- [ ] **Step 6: Commit** — `feat(diagnosis): panel de entrevista en vivo (texto) con cola y llenado`

---

## Self-review

- **Cobertura del alcance Fase 1:** cola derivada (T1), panel en vivo con llenado + tachado + cobertura (T2). ✓
- **Reuso:** extracción exhaustiva, guion, cobertura, callbacks del manager. Sin 2ª IA para la cola. ✓
- **Determinismo:** fills al borrador con cita; sin cita → pendiente/alerta; gate humano en "Aplicar". ✓

## Handoff

Ejecutar con **subagent-driven-development**, T1→T2. Sin migración (usa lo existente; el transcript acumulado va en la sesión). Fases siguientes: (2) propuesta de resolución al cerrar; (3) voz/STT real (Deepgram) enchufado al panel. Al terminar Fase 1: gate + merge + deploy.
