# Guion guiado de entrevista — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Entrevista guiada por un script determinista (opción múltiple + "Otros")
que ramifica según respuestas/factores y escribe el borrador del diagnóstico
(`answers.compliance` + factores), sin IA ni transcripción. Consultor v1.

**Tech Stack:** Next.js 16, TypeScript, Zod, next-intl, Vitest.

## Global Constraints
- Determinista, cero asunciones: cada opción mapea a criterios/factores; "Otros"
  → criterios del nodo en `flagged` (Requiere aclaración) + nota. Gate humano en
  "Aplicar diagnóstico". Complexity Score nunca al cliente.
- Escribe el MISMO `answers` que checklist/materialize. Sin migración
  (`answers.script` es jsonb dentro de `interview_sessions.answers`).
- Doctrina: prosa español / código inglés; i18n (`app.diagnosis.script.*`);
  motor puro y testeable; spacing tokens válidos; cursor-pointer. No romper
  checklist manual, transcripción, ni `pnpm test`/`test:rls`. Contenido del
  guion pendiente de abogado.

---

### Task 1: Tipos + motor puro (con tests)

**Files:** Create `lib/interview/script/types.ts`, `lib/interview/script/engine.ts`;
Test `test/interview/script-engine.test.ts`.

**Interfaces (Produces):** `ScriptNode`, `ScriptOption`, `OptionEffect`,
`ScriptCondition`, `Script` (ver spec). `ScriptAnswers = Record<string, { options: string[]; other?: string }>`.
- `evalCondition(cond, answers, factors): boolean`
- `nextNode(script, answers, factors): ScriptNode | null` — primer nodo no
  respondido cuya condición pasa.
- `applicableNodes(script, answers, factors): ScriptNode[]` — para el progreso.
- `applyAnswer(node, selectedOptionIds, otherText, draft): { compliance, factors }`
  — devuelve el borrador actualizado: aplica `effect` de cada opción; si hay
  "Otros" o `covers` sin veredicto → esos criterios en `flagged`.

- [ ] Tests: condición (anyOption/hasFactor/not/all/any); nextNode salta nodos
  con condición falsa y ya respondidos; applyAnswer setea criterios y factores;
  "Otros" marca `covers` en flagged. Correr → fallar → implementar → pasar.
- [ ] Commit `feat(script): tipos y motor determinista del guion guiado`.

### Task 2: Extender `answers` (schema + normalize)

**Files:** Modify `lib/interview/answers-schema.ts`, `lib/interview/normalize-answers.ts`;
Test `test/interview/normalize-answers.test.ts` (si existe, extender).

- `diagnosisAnswersSchema`: agregar `script: z.record(z.string(), z.object({ options: z.array(z.string()), other: z.string().optional() })).optional()`.
- `normalizeAnswers`: preservar `answers.script` (tal cual, validando forma).
- [ ] typecheck OK; commit `feat(diagnosis): persistir answers.script (estado del guion)`.

### Task 3: Contenido — guion borrador (controles baseline)

**Files:** Create `lib/interview/script/rat-script.ts` (el `Script` con nodos).

- Preguntas madre por control baseline (18), cada opción mapeada a los criterios
  (índices 0..n) de ese control. Ramas condicionales por factores (encargados,
  sensibles, transferencias, decisiones automatizadas). Cada nodo con `covers`
  (sus criterios) y `allowOther`. Marcado *pendiente de validación abogado*.
- [ ] typecheck OK; commit `feat(script): guion borrador de controles baseline`.

### Task 4: UI del guion + montaje + i18n

**Files:** Create `components/interview/guided-script.tsx`; Modify
`components/interview/diagnosis-manager.tsx`, `messages/app/diagnosis.json`.

- Panel "Entrevista guiada": nodo actual (pregunta + opciones opción múltiple +
  "Otros" textarea) → al responder, aplica al borrador vía callbacks del manager
  (`onAcceptCompliance` + un setter de factores/applicability) y avanza. Progreso
  "Tema X de N". Atrás (re-responder). Alterna con el checklist manual.
- Estado del guion en `answers.script` (autosave del manager).
- Montaje en `DiagnosisManager` como modo principal del diagnóstico.
- i18n `app.diagnosis.script.*`.
- [ ] typecheck + build + `pnpm test`/`test:rls` verdes.
- [ ] E2E (orquestador): responder el guion → se llenan criterios en el checklist;
  "Otros" deja Requiere aclaración; ramas por factor aparecen/desaparecen.
- [ ] Commit `feat(diagnosis): panel de entrevista guiada (opción múltiple)`.

## Handoff
Ejecutar T1→T4. Sin migración. Al cerrar: gate + (con OK) subida única con la
identidad Cromilakis. Fases siguientes: self-service en portal, edición del
guion en BD.
