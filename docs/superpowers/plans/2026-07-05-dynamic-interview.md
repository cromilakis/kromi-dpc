# Entrevista dinámica (aplicabilidad) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Pasos con checkbox (`- [ ]`).

**Goal:** Acotar la entrevista a lo aplicable según los factores declarados de la empresa; lo que no aplica se marca "No aplica" y sale de la entrevista, con override del consultor. Aplica a controles de cumplimiento y a campos del RAT.

**Architecture:** Reglas de aplicabilidad como dato en `controls.applies_when` (jsonb), evaluadas por un módulo puro (`lib/interview/applicability.ts`) contra `companies.factors`. La entrevista muestra solo lo aplicable; el override vive en `answers.applicability`. La materialización marca `not_applicable` los controles fuera de alcance; el checklist mide avance sobre lo aplicable.

**Tech Stack:** Next.js 16 (RSC + server actions), TypeScript, Zod, next-intl, Supabase (Postgres/RLS/enums), Vitest.

## Global Constraints

- **Determinismo, sin asunciones:** aplicabilidad = reglas explícitas en la base × factores de la empresa. Sin regla → aplica (baseline). Ante duda al poblar reglas → `null` (aplica); NUNCA ocultar de más.
- **Zod en servidor** antes de tocar datos; RLS + auth en toda action; `audit_log` en mutaciones sensibles.
- **i18n**: textos en `messages/app/*.json`; prosa español, código inglés.
- **Spacing tokens**: solo valores definidos en `@theme` (4,8,12,16,20,24,28,32,36,40,44,48,60,80,100,120) o arbitrarios en px (`h-[14px]`). Nunca `-6/-10/-14` sueltos.
- **`"use server"`** solo exporta funciones async (schemas/tipos fuera).
- **Retrocompatibilidad**: `answers.applicability` es opcional; empresas/sesiones viejas con `factors={}` no deben romper (controles atados a factor → No aplica, recuperables por override).

---

### Task 1: Persistir `companies.factors`

**Files:**
- Create: `supabase/migrations/20260705140000_company_factors.sql`
- Modify: `lib/actions/companies.ts` (insert), `lib/supabase/types.ts` (regenerado)
- Test: `test/companies.test.ts` (ya existe; añadir aserción)

**Interfaces:**
- Produces: columna `companies.factors text[]` poblada en el alta.

- [ ] **Step 1: Migración**

```sql
-- Los factores de complejidad declarados en el alta se necesitan en tiempo de
-- entrevista para calcular la aplicabilidad de los controles. Hoy solo se usan
-- para el score/audit y no se persistían.
alter table public.companies
  add column if not exists factors text[] not null default '{}';
comment on column public.companies.factors is
  'Factores de complejidad declarados en el alta (RFC §14.3). Fuente de la aplicabilidad de controles en la entrevista.';
```

- [ ] **Step 2: Aplicar en local** — `docker exec -i supabase_db_kromi-dpc psql -U postgres -d postgres < supabase/migrations/20260705140000_company_factors.sql`; verificar con `\d companies`.

- [ ] **Step 3: Persistir en `createCompany`** — en el insert de `lib/actions/companies.ts` agregar `factors: [...data.factors],`.

- [ ] **Step 4: Regenerar tipos** — `pnpm supabase gen types typescript --local > lib/supabase/types.ts`; verificar que `companies.factors` aparece.

- [ ] **Step 5: Test** — en `test/companies.test.ts`, el payload válido ya trae `factors`; añadir que `createCompanySchema` los conserva (ya cubierto por el schema). typecheck OK.

- [ ] **Step 6: Commit** — `git commit -m "feat(companies): persistir factors en el alta (base de la aplicabilidad)"`

---

### Task 2: `controls.applies_when` + enum `not_applicable` + poblar reglas

**Files:**
- Create: `supabase/migrations/20260705141000_control_applicability.sql`
- Create: `supabase/migrations/20260705141500_control_result_na.sql` (enum aparte)
- Modify: `supabase/seed.sql` (reglas en el catálogo), `lib/supabase/types.ts`

**Interfaces:**
- Produces: `controls.applies_when jsonb` (poblado) y `control_result` con valor `not_applicable`.

- [ ] **Step 1: Migración de columna + poblado**

```sql
alter table public.controls add column if not exists applies_when jsonb;
comment on column public.controls.applies_when is
  'Regla de aplicabilidad: null = siempre aplica; {"factors_any":[...]} = aplica solo si la empresa declaró alguno de esos factores.';

-- Poblado por dominio (ante duda, se deja null = aplica). Revisar con abogado.
update public.controls c set applies_when = '{"factors_any":["sensitive_data"]}'::jsonb
  from public.domains d where c.domain_id = d.id and d.code = 'DPC-SEN';
update public.controls c set applies_when = '{"factors_any":["automated_decisions"]}'::jsonb
  from public.domains d where c.domain_id = d.id and d.code = 'DPC-EIA';
-- DPC-TER mezcla transferencias y encargados: separar por code/nombre.
-- (El implementador lista los controles de DPC-TER y asigna
--  international_transfers a los de transferencia y critical_providers a los de
--  encargados; ante duda, dejar null.)
```

- [ ] **Step 2: Migración del enum (sentencia propia)**

```sql
-- 'alter type ... add value' no admite ir junto a otro DDL en la misma tx.
alter type public.control_result add value if not exists 'not_applicable';
```

- [ ] **Step 3: Aplicar ambas en local** y verificar (`select code, applies_when from controls where applies_when is not null;` y `select enum_range(null::control_result);`).

- [ ] **Step 4: Reflejar en `supabase/seed.sql`** las reglas `applies_when` (para que un reset del catálogo las conserve).

- [ ] **Step 5: Regenerar tipos** — `pnpm supabase gen types typescript --local > lib/supabase/types.ts`; verificar `not_applicable` en el union de `control_result` y `applies_when` en `controls`.

- [ ] **Step 6: typecheck** → OK.

- [ ] **Step 7: Commit** — `git commit -m "feat(db): controls.applies_when + control_result not_applicable + reglas por dominio"`

---

### Task 3: Evaluador de aplicabilidad

**Files:**
- Create: `lib/interview/applicability.ts`
- Test: `test/interview/applicability.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type AppliesWhen = { factors_any?: string[] } | null;
  export function controlApplies(rule: AppliesWhen, companyFactors: string[]): boolean;
  export function inapplicabilityFactors(rule: AppliesWhen): string[]; // factores que faltaron (para el motivo)
  ```

- [ ] **Step 1: Tests**

```ts
import { describe, expect, it } from "vitest";
import { controlApplies, inapplicabilityFactors } from "@/lib/interview/applicability";

describe("controlApplies", () => {
  it("null => siempre aplica", () => expect(controlApplies(null, [])).toBe(true));
  it("factors_any con match => aplica", () =>
    expect(controlApplies({ factors_any: ["a", "b"] }, ["b"])).toBe(true));
  it("factors_any sin match => no aplica", () =>
    expect(controlApplies({ factors_any: ["a"] }, ["x"])).toBe(false));
  it("factors_any vacío => aplica", () =>
    expect(controlApplies({ factors_any: [] }, [])).toBe(true));
});

describe("inapplicabilityFactors", () => {
  it("devuelve los factores de la regla", () =>
    expect(inapplicabilityFactors({ factors_any: ["a"] })).toEqual(["a"]));
  it("null => []", () => expect(inapplicabilityFactors(null)).toEqual([]));
});
```

- [ ] **Step 2: Correr y ver fallar.**
- [ ] **Step 3: Implementar** (puro, sin dependencias).
- [ ] **Step 4: Correr** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(interview): evaluador de aplicabilidad de controles"`

---

### Task 4: Entrevista de cumplimiento dinámica (page + ComplianceForm + override)

**Files:**
- Modify: `app/app/companies/[id]/diagnosis/page.tsx` (cargar `companies.factors` y `controls.applies_when`, pasar a UI)
- Modify: `lib/interview/questions.ts` (`ControlLike`/`ComplianceQuestion` +`appliesWhen`) y `buildComplianceQuestions`
- Modify: `lib/interview/answers-schema.ts` (`applicability` opcional)
- Modify: `components/interview/diagnosis-manager.tsx`, `components/interview/compliance-form.tsx`
- Modify: `messages/app/diagnosis.json`
- Test: `test/interview/answers-schema.test.ts` (o donde viva) — `applicability` opcional retrocompatible

**Interfaces:**
- `ComplianceQuestion` gana `appliesWhen: AppliesWhen`.
- `diagnosisAnswersSchema` gana `applicability: z.record(z.string(), z.boolean()).optional()`.
- `ComplianceForm` recibe `companyFactors: string[]` y `applicabilityOverrides: Record<string,boolean>`; calcula por pregunta `applica = override ?? controlApplies(q.appliesWhen, companyFactors)`; renderiza aplicables como hoy; agrupa las no-aplicables en un `<details>` "No aplica (N)" con el motivo (factores traducidos) y un toggle que setea override=true. Botón inverso en las aplicables para marcar No aplica (override=false).

- [ ] **Step 1** (i18n): claves `applicability.*` (título "No aplica (N)", "incluir en la entrevista", "marcar No aplica", "No aplica porque no se declaró: {factores}", nombres de factores).
- [ ] **Step 2** (schema): añadir `applicability` opcional a `diagnosisAnswersSchema`; test de retrocompat (parsea sin el campo).
- [ ] **Step 3** (questions): añadir `appliesWhen` a `ControlLike`/`ComplianceQuestion` y propagarlo en `buildComplianceQuestions`.
- [ ] **Step 4** (page): seleccionar también `applies_when` de controls y `factors` de la empresa; pasar `companyFactors` al `DiagnosisManager`.
- [ ] **Step 5** (UI): `DiagnosisManager` mantiene `answers.applicability` (vía `updateAnswers`) y lo pasa a `ComplianceForm`; implementar el recorte + sección "No aplica" + toggles.
- [ ] **Step 6**: typecheck + build → OK.
- [ ] **Step 7**: Commit — `git commit -m "feat(interview): cumplimiento dinamico segun factores + override"`

---

### Task 5: RAT dinámico (ocultar campos por factor + escape)

**Files:**
- Modify: `components/interview/rat-form.tsx`, `components/interview/diagnosis-manager.tsx` (pasar `companyFactors`)
- Modify: `messages/app/diagnosis.json`

**Interfaces:**
- `RatForm` recibe `companyFactors: string[]`. Bloques atados a factor no declarado van ocultos tras un enlace "esta actividad es una excepción" que los revela:
  - `intlTransfer`/`intlCountries` ← `international_transfers`
  - `processors` ← `critical_providers`
  - `isSensitive`: visible siempre, default acorde a `sensitive_data`.

- [ ] **Step 1** (i18n): clave `rat.exception` ("Esta actividad es una excepción: mostrar {campo}").
- [ ] **Step 2**: implementar el ocultar/escape por bloque en `RatForm`.
- [ ] **Step 3**: pasar `companyFactors` desde `DiagnosisManager`.
- [ ] **Step 4**: typecheck + build → OK.
- [ ] **Step 5**: Commit — `git commit -m "feat(interview): RAT dinamico (campos por factor con escape)"`

---

### Task 6: Materialización marca `not_applicable`

**Files:**
- Modify: `lib/interview/select-control-updates.ts` (o `lib/actions/interview.ts`)
- Modify: `lib/actions/interview.ts` (`materializeDiagnosis`)
- Test: `test/interview/select-control-updates.test.ts` (existente) o nuevo

**Interfaces:**
- `materializeDiagnosis` calcula, para cada control del catálogo aplicable a la empresa: si NO aplica (computado con `answers.applicability` override × factores) → upsert `assessment_controls.status='not_applicable'`; si aplica → flujo actual (`selectControlUpdates`). Debe cargar `controls.applies_when` + `companies.factors`.

- [ ] **Step 1**: Test — dada una empresa con factores y overrides, los controles No aplica se upsertean `not_applicable`; los evaluados mantienen su status; los pending sin tocar no se pisan.
- [ ] **Step 2**: Correr y ver fallar.
- [ ] **Step 3**: Implementar en `materializeDiagnosis` (cargar applies_when+factors; construir el set No-aplica; upsert).
- [ ] **Step 4**: Correr → PASS. typecheck → OK.
- [ ] **Step 5**: Commit — `git commit -m "feat(interview): materializar marca controles no_aplica"`

---

### Task 7: Checklist refleja `not_applicable` y avance sobre lo aplicable

**Files:**
- Modify: `app/app/companies/[id]/checklist/page.tsx` (+ helpers de avance si aplica)
- Modify: `messages/app/*.json` (badge "No aplica" si falta)
- Test: helper de avance si existe

**Interfaces:**
- Los controles `not_applicable` muestran badge "No aplica" y **se excluyen del denominador del avance %**. Verificar `load-eligibility.server.ts` / cualquier cálculo de progreso que cuente controles.

- [ ] **Step 1**: localizar el cálculo de avance/elegibilidad y excluir `not_applicable` del denominador.
- [ ] **Step 2**: badge "No aplica" en la fila del control en el checklist.
- [ ] **Step 3**: test del cálculo (si hay helper) → PASS. typecheck + build → OK.
- [ ] **Step 4**: E2E click-through (manual): micro "Margarita" sin factores → entrevista corta → materializar → checklist con No aplica + avance sobre lo aplicable.
- [ ] **Step 5**: Commit — `git commit -m "feat(checklist): No aplica + avance sobre controles aplicables"`

---

## Self-review

- **Cobertura del spec:** persistir factors (T1), applies_when+enum+reglas (T2), evaluador (T3), cumplimiento dinámico+override (T4), RAT dinámico (T5), materializar no_aplica (T6), checklist (T7). ✓
- **Sin placeholders:** los pasos deterministas traen código; el poblado de DPC-TER exige leer el catálogo (documentado, con regla "ante duda null"). ✓
- **Consistencia de tipos:** `AppliesWhen` (T3) fluye a `ComplianceQuestion` (T4) y a `materializeDiagnosis` (T6); `answers.applicability` opcional consistente en schema/UI/materialize. ✓

## Handoff

Ejecutar con **subagent-driven-development**, tarea por tarea, en orden (T1→T7). Luego ejecutar el plan de transcripción (`2026-07-05-transcript-autocomplete.md`) con el ajuste: el catálogo que recibe el LLM se filtra por aplicabilidad.
