# Guion de entrevista dinámico + cobertura — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Pasos con checkbox (`- [ ]`).

**Goal:** Un guion de preguntas por control (curado), un panel en el diagnóstico que muestra solo lo aplicable a la empresa agrupado por dominio, exportable/imprimible, y un indicador de cobertura ("temas sin cubrir") para saber si la reunión quedó completa.

**Architecture:** Preguntas como dato en `controls.interview_questions`. Un builder puro arma el guion (controles aplicables × factores, agrupados por dominio) y un helper puro calcula cobertura desde `answers.compliance`. El panel (consultor) se alimenta del guion (server) y la cobertura se calcula en cliente (usa `answers` en vivo del DiagnosisManager). Vista imprimible dedicada.

**Tech Stack:** Next.js 16 (RSC + client), Supabase, Zod, Vitest, next-intl.

**Relacionado:** spec `2026-07-05-interview-guide-design.md`; reusa `lib/interview/applicability.ts`, `lib/interview/questions.ts`, el patrón de carga de `app/app/companies/[id]/diagnosis/page.tsx`.

## Global Constraints

- **Solo aplicable:** el guion muestra únicamente controles aplicables a la empresa (mismo criterio que la entrevista: `assessment_controls.status != 'not_applicable'`, o `controlApplies` con `companies.factors`). Micro → guion corto.
- **Consultor-only:** el guion vive en `/app` (consultor). No expone score ni datos internos.
- **Contenido = deuda de revisión:** las `interview_questions` son un draft nuestro, marcado para revisión de consultor/abogado (como el resto del catálogo).
- **Doctrina:** i18n (`app.diagnosis`), prosa español / código inglés; helpers puros testeables; spacing tokens definidos o px arbitrarios (nunca -6/-10/-14); cursor-pointer.
- **No romper:** consultor/cliente actuales + `pnpm test`/`test:rls` verdes.

---

### Task 1: Migración `controls.interview_questions` + poblar (contenido curado)

**Files:**
- Create: `supabase/migrations/20260706130000_control_interview_questions.sql`
- Modify: `supabase/seed.sql`, `lib/supabase/types.ts` (regenerado)

**Interfaces (Produces):** columna `controls.interview_questions text[] not null default '{}'`, poblada por control (1-2 preguntas cada uno).

- [ ] **Step 1: Migración — columna** `alter table public.controls add column if not exists interview_questions text[] not null default '{}';` + comment (draft, revisión legal pendiente).
- [ ] **Step 2: Redactar y poblar las preguntas.** Leer el catálogo completo: `docker exec supabase_db_kromi-dpc psql -U postgres -d postgres -c "select c.code, d.code as dom, c.name, c.objective, c.verification_criteria from controls c join domains d on d.id=c.domain_id order by d.sort, c.sort;"`. Para CADA uno de los 23 controles, escribir 1-2 **preguntas conversacionales en español** (tono consultor a dueño de PyME, no jerga técnica) que, respondidas, dejen resueltos sus `verification_criteria`. Ejemplo: para un control de finalidad → "¿Para qué usan cada dato que piden? ¿Le explican al cliente para qué es?". Escribir los `UPDATE public.controls set interview_questions = array[...] where code='...';` en la migración.
- [ ] **Step 3: Aplicar en local** y verificar (`select code, interview_questions from controls where interview_questions <> '{}' order by code;` → los 23 con preguntas).
- [ ] **Step 4: Reflejar en `supabase/seed.sql`** los mismos UPDATE (para que sobrevivan un reset del catálogo).
- [ ] **Step 5: Regenerar tipos** (`pnpm supabase gen types typescript --local`, stderr aparte / Bash). `pnpm typecheck` OK.
- [ ] **Step 6: Commit** — `feat(db): controls.interview_questions + guion curado (draft, revisión legal)`

---

### Task 2: Builder del guion + cobertura (puros + loader)

**Files:**
- Create: `lib/interview/guide.ts` (puros), `lib/interview/load-guide.server.ts` (loader)
- Test: `test/interview/guide.test.ts`

**Interfaces (Produces):**
- Tipos: `GuideControl = { code, name, questions: string[], criteria: string[] }`; `GuideDomain = { domainCode, domainName, controls: GuideControl[] }`.
- `buildInterviewGuide(controls: Array<{code,name,domainCode,domainName,sort,domainSort,questions,criteria,appliesWhen}>, factors: string[]): GuideDomain[]` — filtra aplicables (`controlApplies(appliesWhen, factors)`), agrupa por dominio (ordenado), descarta dominios sin controles aplicables.
- `computeGuideCoverage(guide: GuideDomain[], compliance: Record<string, string[]>): { total: number; covered: number; uncovered: Array<{ domainCode; controlCode; controlName }> }` — un control está "cubierto" si TODOS sus criterios tienen respuesta != 'unknown' en `compliance[code]` (o al menos uno, decidir: v1 = "sin cubrir" si NINGÚN criterio respondido; documentar). Puro.
- `loadInterviewGuide(companyId): Promise<GuideDomain[]>` — server: carga controles aplicables (por assessment abierto: `assessment_controls` status != not_applicable → join controls; o el catálogo del sector + `controlApplies` con factors — seguir el criterio de `load-evidences.server.ts`), con `interview_questions` + `verification_criteria` + dominio, y llama `buildInterviewGuide`.

- [ ] **Step 1: Tests** de `buildInterviewGuide` (excluye controles no aplicables por factor; agrupa por dominio; descarta dominio vacío) y `computeGuideCoverage` (control sin respuestas → uncovered; con respuestas → covered).
- [ ] **Step 2: Correr y ver fallar.**
- [ ] **Step 3: Implementar** los puros (`guide.ts`) y el loader (`load-guide.server.ts`, patrón de `load-evidences.server.ts`).
- [ ] **Step 4: Correr** → PASS. typecheck OK.
- [ ] **Step 5: Commit** — `feat(interview): builder del guion + cobertura`

---

### Task 3: Panel "Guion de entrevista" + cobertura en el diagnóstico

**Files:**
- Modify: `app/app/companies/[id]/diagnosis/page.tsx` (cargar guion, pasar a manager), `components/interview/diagnosis-manager.tsx` (montar panel), `messages/app/diagnosis.json`
- Create: `components/interview/interview-guide-panel.tsx` (client)

**Interfaces:** consume `GuideDomain[]` + `answers.compliance` (para cobertura en vivo) + `computeGuideCoverage`.

- [ ] **Step 1: i18n** `app.diagnosis.guide.*`: título, subtítulo, contador ("{domains} dominios · {questions} preguntas"), "Sin cubrir", "Imprimir", etiquetas.
- [ ] **Step 2:** `interview-guide-panel.tsx` (client): recibe `guide: GuideDomain[]` + `compliance`. Render colapsable (`<details>`), agrupado por dominio → control (nombre) → sus preguntas (lista), con los criterios como subtítulo/tooltip de "lo que debe quedar resuelto". Badge "Sin cubrir" en controles cuya cobertura (via `computeGuideCoverage` con el `compliance` actual) sigue pendiente. Botón "Imprimir" (link a la vista de Task 4). Contador arriba.
- [ ] **Step 3:** `page.tsx`: `loadInterviewGuide(companyId)` (en paralelo) y pasar `guide` al `DiagnosisManager`; el manager pasa `guide` + su `answers.compliance` en vivo al panel. Montar el panel arriba (antes de las secciones RAT/cumplimiento) o donde tenga sentido.
- [ ] **Step 4:** typecheck + build + `pnpm test`/`test:rls` verdes.
- [ ] **Step 5: Commit** — `feat(diagnosis): panel de guion de entrevista + cobertura`

---

### Task 4: Vista imprimible del guion

**Files:**
- Create: `app/app/companies/[id]/diagnosis/guide/page.tsx` (+ print CSS)
- Modify: `messages/app/diagnosis.json` si hace falta

**Interfaces:** reusa `loadInterviewGuide` + nombre de empresa.

- [ ] **Step 1:** Ruta `/app/companies/[id]/diagnosis/guide` (server component): carga el guion + nombre de empresa, render limpio (empresa + guion por dominio → control → preguntas), con estilos pensados para impresión (`@media print` que oculte navegación; layout simple). Sin score ni datos internos.
- [ ] **Step 2:** El botón "Imprimir" del panel (Task 3) enlaza acá (target _blank); esta página puede auto-invocar `window.print()` opcionalmente o dejar que el usuario imprima.
- [ ] **Step 3:** typecheck + build verdes.
- [ ] **Step 4: E2E click-through (orquestador):** micro (guion corto, sin dominios no aplicables) vs empresa con factores (guion completo); abrir panel; marcar cobertura tras responder algo; abrir vista imprimible. Screenshot.
- [ ] **Step 5: Commit** — `feat(diagnosis): vista imprimible del guion`

---

## Self-review

- **Cobertura del spec:** contenido de preguntas (T1), builder+cobertura (T2), panel (T3), imprimible (T4). ✓
- **Reuso:** aplicabilidad, patrón de loaders, catálogo. ✓
- **Sin placeholders funcionales** (solo el contenido de preguntas es draft a revisar, marcado). ✓

## Handoff

Ejecutar con **subagent-driven-development**, T1→T4. Al terminar: gate + merge + `supabase db push` (migración T1) + deploy. La redacción de las preguntas queda para tu revisión/abogado.
