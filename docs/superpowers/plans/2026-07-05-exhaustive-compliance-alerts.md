# Evaluación exhaustiva del cumplimiento + alertas — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Pasos con checkbox (`- [ ]`).

**Goal:** Tras aplicar la interpretación de una transcripción, cada criterio aplicable queda con veredicto (cumple/parcial/no cumple) o marcado como "Requiere aclaración" (`flagged`) — nunca "Sin evaluar" por omisión. El LLM se pronuncia sobre todos los criterios; lo no determinable queda como alerta con motivo (no se inventa veredicto).

**Architecture:** Nuevo estado `flagged` en el enum de respuestas de criterio. La extracción del LLM pasa a ser exhaustiva (veredicto o alerta por cada criterio aplicable) y agrega `alerts[]` a su salida. La UI de revisión gana un grupo "Requiere aclaración" (aceptar → `flagged`) y `ComplianceForm` muestra `flagged` como alerta.

**Tech Stack:** Next.js 16, TypeScript, Zod, next-intl, Vitest, DeepSeek.

**Relacionado:** spec `2026-07-05-exhaustive-compliance-alerts-design.md`; `lib/interview/{answers-schema,auto-map}.ts`, `lib/llm/extract-diagnosis.ts`, `components/interview/{extraction-review,compliance-form,diagnosis-manager}.tsx`.

## Global Constraints

- **Determinismo:** el LLM NO inventa veredictos; si no puede determinar un criterio de la transcripción, lo marca en `alerts[]` con motivo. Veredictos siempre con cita textual. El humano revisa/acepta; nada se auto-aplica.
- **`flagged` ≠ `unknown`:** `unknown` = "Sin evaluar" (inicial, pre-entrevista); `flagged` = "Requiere aclaración" (alerta, tras intento de interpretación).
- **Doctrina:** i18n (`app.diagnosis`); prosa español / código inglés; helpers puros testeables; spacing tokens definidos o px arbitrarios (nunca -6/-10/-14); cursor-pointer.
- **No romper:** el cumplimiento manual, el modo self, y `pnpm test`/`test:rls` verdes. El `flagged` no rompe la materialización (no genera un `control_result` de cumplimiento).

---

### Task 1: Estado `flagged` en el enum + auto-map

**Files:**
- Modify: `lib/interview/auto-map.ts` (`CriterionAnswer` + `mapAnswersToControlStatus`), `lib/interview/answers-schema.ts` (`criterionAnswerSchema`)
- Test: `test/interview/auto-map.test.ts` (o donde viva; si no hay, crear)

**Interfaces (Produces):**
- `CriterionAnswer = "yes" | "partial" | "no" | "unknown" | "flagged"`.
- `criterionAnswerSchema` acepta `flagged`.
- `mapAnswersToControlStatus`: `flagged` se EXCLUYE del cómputo de estado igual que `unknown` (no cuenta como compliant/partial/non_compliant). `const real = answers.filter(a => a !== "unknown" && a !== "flagged")`.

- [ ] **Step 1: Tests** — `criterionAnswerSchema.parse('flagged')` OK; `mapAnswersToControlStatus(['yes','flagged'])` = 'compliant' (flagged ignorado); `['flagged']` = 'pending' (sin reales); `['no','flagged']` = 'non_compliant'.
- [ ] **Step 2: Correr y ver fallar.**
- [ ] **Step 3: Implementar** el valor en ambos + el filtro en auto-map.
- [ ] **Step 4: Correr** → PASS; `pnpm typecheck` → OK (revisar que agregar el enum no rompa Records exhaustivos existentes de CriterionAnswer; si los hay —p. ej. en compliance-form/labels— agregar el caso `flagged`, se completa en Task 3).
- [ ] **Step 5: Commit** — `feat(interview): estado de criterio 'flagged' (requiere aclaracion)`

---

### Task 2: Extracción exhaustiva + `alerts[]` (+ prompt RAT afinado)

**Files:**
- Modify: `lib/llm/extract-diagnosis.ts`
- Test: `test/llm/extract-diagnosis.test.ts`

**Interfaces (Produces):**
- `ExtractionResult` gana `alerts: Array<{ controlCode: string; criterionIndex: number; reason: string }>`.
- Prompt (`SYSTEM_PROMPT` / `buildExtractionPrompt`): instruir que, para CADA control del catálogo entregado (ya viene filtrado por aplicabilidad), se pronuncie sobre TODOS sus criterios: si la transcripción lo permite → entrada en `compliance` (yes/partial/no + cita); si NO se puede determinar → entrada en `alerts` (controlCode, criterionIndex, motivo). Determinismo: no inventar; sin cita → alerta, no veredicto. Además, reforzar el RAT: extraer PRIMERO las actividades de tratamiento (qué datos, para qué, a quién, dónde se guardan) con su cita, antes del cumplimiento.
- `sanitizeExtraction`: validar cada `alert` como se valida compliance (controlCode existe, criterionIndex en rango); inválidos → `unassigned` (texto legible, no JSON). Un mismo (control, criterio) no debe estar a la vez en compliance y alerts: si aparece en ambos, prioriza el veredicto (compliance) y descarta la alerta (documentar).

- [ ] **Step 1: Tests** — `extractionResultSchema`/`sanitizeExtraction` acepta y valida `alerts` (descarta alert con control inexistente / índice fuera de rango → unassigned; dedup contra compliance del mismo criterio). `extractDiagnosis` (mock) devuelve `alerts`.
- [ ] **Step 2: Correr y ver fallar.**
- [ ] **Step 3: Implementar** schema `alerts`, prompt exhaustivo + RAT reforzado, sanitizado con dedup.
- [ ] **Step 4: Correr** → PASS; `pnpm typecheck` OK.
- [ ] **Step 5: Commit** — `feat(llm): extraccion exhaustiva de cumplimiento + alerts + prompt RAT`

---

### Task 3: UI — grupo "Requiere aclaración" + `flagged` en la evaluación

**Files:**
- Modify: `components/interview/extraction-review.tsx`, `components/interview/diagnosis-manager.tsx`, `components/interview/compliance-form.tsx`, `messages/app/diagnosis.json`

**Interfaces:**
- `onAcceptCompliance(controlCode, index, answer: "yes"|"partial"|"no"|"flagged")` — extender para aceptar `flagged`.
- `ExtractionReview`: nuevo grupo "Requiere aclaración" que lista `extraction.alerts` (usando el lookup de `questions` para mostrar nombre de control + texto del criterio + motivo); "Aceptar" → `onAcceptCompliance(code, index, "flagged")`; "Descartar". "Aceptar todo".
- `ComplianceForm`: renderizar el estado `flagged` de un criterio como **alerta** ("Requiere aclaración", ámbar) — como una 5ª opción seleccionable junto a Cumple/Parcial/No cumple/Sin evaluar, o como badge de estado; elegir lo más limpio (5 opciones puede recargar la fila; considerar un botón "Requiere aclaración" ámbar). Debe poder mostrarse Y setearse a mano.
- i18n: `compliance.criteria.flagged` = "Requiere aclaración"; `review.alertsGroup` = "Requiere aclaración"; `review.alertsEmpty`; etiqueta de motivo.

- [ ] **Step 1: i18n** las claves nuevas.
- [ ] **Step 2:** `compliance-form.tsx`: soportar/mostrar `flagged` (opción/badge ámbar). Asegurar que cualquier `Record<CriterionAnswer,...>` (labels/variantes) incluya `flagged`.
- [ ] **Step 3:** `extraction-review.tsx`: grupo "Requiere aclaración" (lista alerts con control+criterio+motivo, aceptar→flagged, descartar, aceptar todo). Reusa el lookup `questions` (nombre control + texto criterio) ya presente.
- [ ] **Step 4:** `diagnosis-manager.tsx`: `handleAcceptCompliance` acepta `flagged` (mismo patrón; setea `compliance[code][index]='flagged'`). Pasar lo necesario a ExtractionReview (ya recibe `questions`).
- [ ] **Step 5:** typecheck + build + `pnpm test`/`test:rls` verdes.
- [ ] **Step 6: E2E click-through (orquestador):** aplicar la transcripción enriquecida de Margarita → aceptar todo (cumplimiento + requiere aclaración) → verificar que NO quedan criterios "Sin evaluar" (todos con veredicto o "Requiere aclaración") en la evaluación. Screenshot.
- [ ] **Step 7: Commit** — `feat(diagnosis): grupo 'requiere aclaracion' + estado flagged en la evaluacion`

---

## Self-review

- **Cobertura del spec:** enum+auto-map (T1), extracción exhaustiva+alerts+RAT (T2), UI revisión+evaluación (T3). ✓
- **Determinismo:** no inventa (alerta con motivo); humano acepta. ✓
- **Sin placeholders funcionales.** ✓

## Handoff

Ejecutar con **subagent-driven-development**, T1→T3. Sin migración (solo enum en app + JSON de answers). Al terminar: gate + merge + deploy. Verificar con la transcripción enriquecida que no queden criterios "Sin evaluar".
