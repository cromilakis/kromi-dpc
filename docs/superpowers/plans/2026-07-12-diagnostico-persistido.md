# Modelo de diagnóstico persistido — Plan de implementación (sub-proyecto #1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir por empresa las brechas del diagnóstico (`lib/legal`) como registro inmutable, poblado desde el self-service, como fundación del programa de documentos/certificado.

**Architecture:** Dos tablas (`company_diagnoses` cabecera + `diagnosis_breaches` filas snapshot) con RLS de solo-lectura para el cliente. Una función pura `computeDiagnosisSnapshot(answers)` reconstruye las brechas con el motor `lib/legal`; una server `persistDiagnosis` (service-role) recomputa, marca la corrida previa `superseded` e inserta cabecera + filas. El self-service envía las respuestas completas y `registerAndStartCheckout` persiste tras crear la empresa.

**Tech Stack:** Next.js 16 (Server Actions), Supabase (Postgres, RLS), Zod, `lib/legal` (motor puro), Vitest.

## Global Constraints

- pnpm. Comandos: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`.
- Prosa en español; identificadores en inglés.
- **No se confía en el cliente:** las brechas SIEMPRE se recomputan de `answers` en el servidor con `lib/legal`.
- **Snapshot inmutable:** al persistir se congela el contenido legal (description, articles, fine, severity) de cada brecha.
- **RLS:** cliente solo SELECT de lo suyo (`current_company_id()`); escritura por service-role (`createAdminClient()`).
- Escritura pública/anon → `createAdminClient()` (server-only, `lib/supabase/admin.ts`).
- Migraciones idempotentes (`create table if not exists`, `create index if not exists`).
- Identidad de commits: `Cromilakis <ipcromilakis@gmail.com>`; sin trailers `Co-Authored-By` ni atribuciones a Claude.
- Enterprise (sin empresa creada) no persiste diagnóstico.

## Estructura de archivos

- Create: `supabase/migrations/20260713100000_diagnosis_persistence.sql` — tablas + RLS + índices.
- Modify: `lib/supabase/types.ts` — Row/Insert/Update de las dos tablas.
- Create: `lib/diagnosis/snapshot.ts` — `computeDiagnosisSnapshot` + `toBreachSnapshot` (puras).
- Test: `test/diagnosis-snapshot.test.ts`.
- Create: `lib/diagnosis/persist.server.ts` — `persistDiagnosis` (service-role).
- Modify: `lib/self-assessment/lead-schema.ts` — `answers` en `registrationLeadSchema`.
- Modify: `components/self-assessment/diagnosis-wizard.tsx` — serializar respuestas y pasarlas al form.
- Modify: `components/self-assessment/lead-form.tsx` — incluir `answers` en el payload de `registerAndStartCheckout`.
- Modify: `lib/actions/self-assessment.ts` — llamar `persistDiagnosis` en `registerAndStartCheckout`.

---

### Task 1: Migración — tablas de diagnóstico persistido + RLS

**Files:**
- Create: `supabase/migrations/20260713100000_diagnosis_persistence.sql`
- Modify: `lib/supabase/types.ts`

**Interfaces:**
- Produces: tablas `company_diagnoses` y `diagnosis_breaches` con las columnas del spec; RLS de SELECT para el cliente.

- [ ] **Step 1: Escribir la migración**

Create `supabase/migrations/20260713100000_diagnosis_persistence.sql`:

```sql
-- Diagnóstico persistido: fuente única de verdad del cumplimiento por empresa.
-- Poblado desde el self-service (y desde el consultor en un sub-proyecto
-- posterior). Registro inmutable (snapshot) del contenido legal de cada brecha.

create table if not exists public.company_diagnoses (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id),
  source         text not null check (source in ('self_service','consultant_assisted')),
  answers        jsonb not null,
  risk_level     text not null,
  total_breaches integer not null default 0,
  created_by     uuid references auth.users(id),
  status         text not null default 'active' check (status in ('active','superseded')),
  created_at     timestamptz not null default now()
);
create index if not exists company_diagnoses_company_id_idx
  on public.company_diagnoses (company_id);
create index if not exists company_diagnoses_active_idx
  on public.company_diagnoses (company_id) where status = 'active';

create table if not exists public.diagnosis_breaches (
  id                uuid primary key default gen_random_uuid(),
  diagnosis_id      uuid not null references public.company_diagnoses(id) on delete cascade,
  breach_code       text not null,
  area              text not null,
  area_label        text not null,
  severity          text not null,
  articles          text[] not null default '{}',
  fine_min_utm      integer,
  fine_max_utm      integer,
  description       text not null,
  dimension         integer,
  resolution_status text not null default 'open' check (resolution_status in ('open','resolved')),
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists diagnosis_breaches_diagnosis_id_idx
  on public.diagnosis_breaches (diagnosis_id);

comment on table public.company_diagnoses is
  'Corridas del diagnóstico por empresa (fuente única de verdad). answers = respuestas del cuestionario para auditoría/re-cálculo. Una active por empresa; las previas superseded.';
comment on table public.diagnosis_breaches is
  'Brechas detectadas (snapshot inmutable del contenido legal al momento del diagnóstico). resolution_status lo cambia el cliente en un sub-proyecto posterior.';

-- RLS: el cliente solo lee lo de SU empresa; la escritura va por service-role.
alter table public.company_diagnoses enable row level security;
alter table public.diagnosis_breaches enable row level security;

create policy company_diagnoses_client_select on public.company_diagnoses
  for select to authenticated
  using (company_id = public.current_company_id());

create policy diagnosis_breaches_client_select on public.diagnosis_breaches
  for select to authenticated
  using (exists (
    select 1 from public.company_diagnoses d
    where d.id = diagnosis_breaches.diagnosis_id
      and d.company_id = public.current_company_id()
  ));
```

> Antes de escribir las policies, abre `supabase/migrations/20260706101000_client_rls.sql` y confirma la firma de `public.current_company_id()` y el estilo de las policies del cliente (`for select to authenticated using (...)`). Ajusta si el proyecto usa otra convención.

- [ ] **Step 2: Aplicar y verificar**

Run: `supabase db reset`
Expected: termina "Finished supabase db reset", aplicando `20260713100000_diagnosis_persistence.sql`.

Run: `docker exec supabase_db_kromi-kpc psql -U postgres -d postgres -c "select count(*) from information_schema.tables where table_name in ('company_diagnoses','diagnosis_breaches');"`
Expected: `2`.

Run: `docker exec supabase_db_kromi-kpc psql -U postgres -d postgres -c "select tablename, policyname from pg_policies where tablename in ('company_diagnoses','diagnosis_breaches') order by 1;"`
Expected: 2 filas (una policy select por tabla).

- [ ] **Step 3: Tipos a mano en `lib/supabase/types.ts`**

Añade en `public.Tables` las dos tablas nuevas siguiendo el patrón del archivo (Row/Insert/Update). `company_diagnoses` Row: `id: string`, `company_id: string`, `source: string`, `answers: Json`, `risk_level: string`, `total_breaches: number`, `created_by: string | null`, `status: string`, `created_at: string`; Insert/Update con los mismos, `id?`, `total_breaches?`, `created_by?: string | null`, `status?`, `created_at?`, y `company_id`/`source`/`answers`/`risk_level` requeridos en Insert. `diagnosis_breaches` Row: `id: string`, `diagnosis_id: string`, `breach_code: string`, `area: string`, `area_label: string`, `severity: string`, `articles: string[]`, `fine_min_utm: number | null`, `fine_max_utm: number | null`, `description: string`, `dimension: number | null`, `resolution_status: string`, `resolved_at: string | null`, `created_at: string`; Insert/Update análogos (`id?`, `articles?`, `fine_min_utm?: number | null`, etc.). Añade `Relationships` a `companies`/`auth.users`/`company_diagnoses` como en tablas vecinas.

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260713100000_diagnosis_persistence.sql lib/supabase/types.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(diagnosis): tablas de diagnóstico persistido (company_diagnoses + diagnosis_breaches) con RLS"
```

---

### Task 2: `computeDiagnosisSnapshot` + `toBreachSnapshot` (puras + tests)

**Files:**
- Create: `lib/diagnosis/snapshot.ts`
- Test: `test/diagnosis-snapshot.test.ts`

**Interfaces:**
- Consumes: `@/lib/legal` (`walkScreening`, `computeFullDiagnosis`, `SCREENING_NODES`, `INFERENCE_RULES`, `DEEP_DIVE_BRANCHES`, `BREACH_AREA_LABELS`, tipos `BreachDescriptor`, `ScreeningAnswer`, `DeepDiveAnswer`, `RiskLevel`).
- Produces:
  - `type DiagnosisAnswers = { screening: ScreeningAnswer[]; deepDive: DeepDiveAnswer[] }`
  - `type BreachSnapshot = { breachCode: string; area: string; areaLabel: string; severity: string; articles: string[]; fineMinUtm: number; fineMaxUtm: number; description: string; dimension: number }`
  - `toBreachSnapshot(breach: BreachDescriptor): BreachSnapshot`
  - `computeDiagnosisSnapshot(answers: DiagnosisAnswers): { riskLevel: string; totalBreaches: number; breaches: BreachSnapshot[] }`

- [ ] **Step 1: Escribir el test que falla**

Create `test/diagnosis-snapshot.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  computeDiagnosisSnapshot,
  toBreachSnapshot,
  type DiagnosisAnswers,
} from "../lib/diagnosis/snapshot";
import type { BreachDescriptor } from "../lib/legal";

const breach: BreachDescriptor = {
  id: "B-SEG-003",
  description: "No hay control de acceso a los datos.",
  severity: "critico",
  articles: ["Art. 14 quáter"],
  fineRangeUtn: { min: 100, max: 5000 },
  estimatedWeeks: 4,
  dimension: 6,
};

describe("toBreachSnapshot", () => {
  it("mapea un BreachDescriptor a snapshot con área derivada del code", () => {
    const s = toBreachSnapshot(breach);
    expect(s.breachCode).toBe("B-SEG-003");
    expect(s.area).toBe("SEG");
    expect(s.areaLabel).toBe("Seguridad de la información");
    expect(s.severity).toBe("critico");
    expect(s.articles).toEqual(["Art. 14 quáter"]);
    expect(s.fineMinUtm).toBe(100);
    expect(s.fineMaxUtm).toBe(5000);
    expect(s.description).toBe("No hay control de acceso a los datos.");
    expect(s.dimension).toBe(6);
  });

  it("es serializable a JSON sin pérdida", () => {
    const s = toBreachSnapshot(breach);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe("computeDiagnosisSnapshot", () => {
  it("sin respuestas devuelve un snapshot vacío coherente", () => {
    const empty: DiagnosisAnswers = { screening: [], deepDive: [] };
    const r = computeDiagnosisSnapshot(empty);
    expect(Array.isArray(r.breaches)).toBe(true);
    expect(r.totalBreaches).toBe(r.breaches.length);
    expect(typeof r.riskLevel).toBe("string");
  });

  it("cada brecha computada tiene la forma de snapshot esperada", () => {
    // Respuesta de tamaño (S-001) para arrancar el screening; el set exacto de
    // brechas depende del motor, así que se valida la FORMA de cada una.
    const answers: DiagnosisAnswers = {
      screening: [{ nodeId: "S-001", value: "micro" }],
      deepDive: [],
    };
    const r = computeDiagnosisSnapshot(answers);
    for (const b of r.breaches) {
      expect(typeof b.breachCode).toBe("string");
      expect(b.area).toBe(b.breachCode.split("-")[1]);
      expect(typeof b.areaLabel).toBe("string");
      expect(["critico", "alto", "medio", "bajo"]).toContain(b.severity);
      expect(Array.isArray(b.articles)).toBe(true);
      expect(typeof b.fineMinUtm).toBe("number");
      expect(typeof b.description).toBe("string");
    }
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm test diagnosis-snapshot`
Expected: FAIL (módulo `lib/diagnosis/snapshot` no existe).

- [ ] **Step 3: Implementar**

Create `lib/diagnosis/snapshot.ts`:

```ts
import {
  BREACH_AREA_LABELS,
  DEEP_DIVE_BRANCHES,
  INFERENCE_RULES,
  SCREENING_NODES,
  computeFullDiagnosis,
  walkScreening,
  type BreachDescriptor,
  type DeepDiveAnswer,
  type ScreeningAnswer,
} from "@/lib/legal";

/** Respuestas serializadas del cuestionario (screening + deep-dive). */
export interface DiagnosisAnswers {
  screening: ScreeningAnswer[];
  deepDive: DeepDiveAnswer[];
}

/** Snapshot inmutable de una brecha para persistir. */
export interface BreachSnapshot {
  breachCode: string;
  area: string;
  areaLabel: string;
  severity: string;
  articles: string[];
  fineMinUtm: number;
  fineMaxUtm: number;
  description: string;
  dimension: number;
}

/** Área = segundo segmento del code ("B-SEG-003" → "SEG"). */
function areaOf(breachCode: string): string {
  return breachCode.split("-")[1] ?? "";
}

export function toBreachSnapshot(breach: BreachDescriptor): BreachSnapshot {
  const area = areaOf(breach.id);
  return {
    breachCode: breach.id,
    area,
    areaLabel: BREACH_AREA_LABELS[area] ?? area,
    severity: breach.severity,
    articles: [...breach.articles],
    fineMinUtm: breach.fineRangeUtn.min,
    fineMaxUtm: breach.fineRangeUtn.max,
    description: breach.description,
    dimension: breach.dimension,
  };
}

/**
 * Recomputa el diagnóstico desde las respuestas con el motor lib/legal y
 * devuelve un resultado serializable listo para persistir. Función pura.
 */
export function computeDiagnosisSnapshot(answers: DiagnosisAnswers): {
  riskLevel: string;
  totalBreaches: number;
  breaches: BreachSnapshot[];
} {
  const walked = walkScreening(SCREENING_NODES, answers.screening);
  const result = computeFullDiagnosis(
    walked,
    INFERENCE_RULES,
    DEEP_DIVE_BRANCHES,
    answers.deepDive,
  );
  return {
    riskLevel: result.riskLevel,
    totalBreaches: result.totalBreaches,
    breaches: result.breaches.map(toBreachSnapshot),
  };
}
```

> Verifica en `lib/legal/index.ts` que `result.breaches` (de `computeFullDiagnosis`) contiene el conjunto completo (screening + deep-dive + inferencia); es lo que usa `buildPreliminaryPanorama`. Si el nombre del campo difiere, ajústalo.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm test diagnosis-snapshot`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/diagnosis/snapshot.ts test/diagnosis-snapshot.test.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(diagnosis): computeDiagnosisSnapshot (recomputa brechas serializables desde respuestas)"
```

---

### Task 3: `persistDiagnosis` (server, service-role)

**Files:**
- Create: `lib/diagnosis/persist.server.ts`

**Interfaces:**
- Consumes: `computeDiagnosisSnapshot`, `DiagnosisAnswers` (Task 2); `createAdminClient` (`@/lib/supabase/admin`).
- Produces: `persistDiagnosis(companyId: string, answers: DiagnosisAnswers, source: "self_service" | "consultant_assisted", createdBy?: string | null): Promise<{ ok: true; diagnosisId: string } | { ok: false; error: "unavailable" }>`.

- [ ] **Step 1: Implementar**

Create `lib/diagnosis/persist.server.ts`:

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeDiagnosisSnapshot, type DiagnosisAnswers } from "./snapshot";

export type PersistDiagnosisResult =
  | { ok: true; diagnosisId: string }
  | { ok: false; error: "unavailable" };

/**
 * Recomputa las brechas desde `answers` (nunca se confía en el cliente), marca
 * la corrida `active` previa de la empresa como `superseded` e inserta la
 * cabecera + las filas de brechas (snapshot inmutable). Service-role.
 *
 * Sin transacción (supabase-js no las expone): si falla el insert de brechas
 * tras crear la cabecera, se loggea y se devuelve error (estado parcial
 * tolerado, consistente con createCompany/provisionCompany).
 */
export async function persistDiagnosis(
  companyId: string,
  answers: DiagnosisAnswers,
  source: "self_service" | "consultant_assisted",
  createdBy?: string | null,
): Promise<PersistDiagnosisResult> {
  const snapshot = computeDiagnosisSnapshot(answers);
  try {
    const admin = createAdminClient();

    // Supersede la corrida activa previa (a lo sumo una active por empresa).
    const { error: supersedeError } = await admin
      .from("company_diagnoses")
      .update({ status: "superseded" })
      .eq("company_id", companyId)
      .eq("status", "active");
    if (supersedeError) {
      console.error("[diagnosis] supersede falló:", supersedeError.message);
      return { ok: false, error: "unavailable" };
    }

    const { data: diagnosis, error: headerError } = await admin
      .from("company_diagnoses")
      .insert({
        company_id: companyId,
        source,
        answers: answers as never,
        risk_level: snapshot.riskLevel,
        total_breaches: snapshot.totalBreaches,
        created_by: createdBy ?? null,
        status: "active",
      })
      .select("id")
      .single();
    if (headerError || !diagnosis) {
      console.error("[diagnosis] insert cabecera falló:", headerError?.message);
      return { ok: false, error: "unavailable" };
    }

    if (snapshot.breaches.length > 0) {
      const { error: breachError } = await admin
        .from("diagnosis_breaches")
        .insert(
          snapshot.breaches.map((b) => ({
            diagnosis_id: diagnosis.id,
            breach_code: b.breachCode,
            area: b.area,
            area_label: b.areaLabel,
            severity: b.severity,
            articles: b.articles,
            fine_min_utm: b.fineMinUtm,
            fine_max_utm: b.fineMaxUtm,
            description: b.description,
            dimension: b.dimension,
          })),
        );
      if (breachError) {
        console.error("[diagnosis] insert brechas falló:", breachError.message);
        return { ok: false, error: "unavailable" };
      }
    }

    return { ok: true, diagnosisId: diagnosis.id };
  } catch (cause) {
    console.error("[diagnosis] persistDiagnosis no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
```

- [ ] **Step 2: Verificar typecheck y lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: sin errores; 0 warnings nuevos.

- [ ] **Step 3: Commit**

```bash
git add lib/diagnosis/persist.server.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(diagnosis): persistDiagnosis (service-role, snapshot + supersede)"
```

---

### Task 4: Enganche del self-service (answers en el payload + persistencia)

**Files:**
- Modify: `lib/self-assessment/lead-schema.ts`
- Modify: `components/self-assessment/diagnosis-wizard.tsx`
- Modify: `components/self-assessment/lead-form.tsx`
- Modify: `lib/actions/self-assessment.ts`

**Interfaces:**
- Consumes: `persistDiagnosis` (Task 3); `DiagnosisAnswers` (Task 2); `registerAndStartCheckout` existente.
- Produces: `registrationLeadSchema` con campo `answers`; el diagnóstico self-service queda persistido al registrarse.

- [ ] **Step 1: `answers` en el schema de registro**

En `lib/self-assessment/lead-schema.ts`, dentro de `registrationLeadSchema` (el `strictObject`), añade el campo:

```ts
    answers: z.object({
      screening: z.array(
        z.strictObject({ nodeId: z.string(), value: z.string() }),
      ),
      deepDive: z.array(
        z.strictObject({
          questionId: z.string(),
          branchId: z.string(),
          value: z.string(),
        }),
      ),
    }),
```

(déjalo junto a `password`/`panorama`; el servidor recomputa las brechas de aquí).

- [ ] **Step 2: Serializar respuestas en el wizard**

En `components/self-assessment/diagnosis-wizard.tsx`, donde se construye el `result` (useMemo con `sAnswers`/`ddList`), expón esas mismas listas para el formulario. Construye un objeto memoizado:

```ts
const answersPayload = useMemo(
  () => {
    const screening: { nodeId: string; value: string }[] = [];
    screeningAnswers.forEach((values, nodeId) => {
      for (const value of values) screening.push({ nodeId, value });
    });
    const deepDive: { questionId: string; branchId: string; value: string }[] = [];
    ddAnswers.forEach((entry, questionId) => {
      for (const value of entry.values) {
        deepDive.push({ questionId, branchId: entry.branchId, value });
      }
    });
    return { screening, deepDive };
  },
  [screeningAnswers, ddAnswers],
);
```

Pásalo a `DiagnosisLeadForm` como prop nueva `answers={answersPayload}`.

> Usa los mismos `screeningAnswers`/`ddAnswers` que ya alimentan el `result`; no dupliques la lógica de recorrido si ya existe una estructura equivalente — reusa.

- [ ] **Step 3: Propagar `answers` en el form y el payload**

En `components/self-assessment/lead-form.tsx`:
- Añade a `DiagnosisLeadFormProps` la prop `answers: { screening: { nodeId: string; value: string }[]; deepDive: { questionId: string; branchId: string; value: string }[] }` y recíbela en la firma.
- En `submit()`, rama `paysOnline`, incluye `answers` en la llamada: `registerAndStartCheckout({ ...payload, password, panorama, answers })`.

- [ ] **Step 4: Persistir en `registerAndStartCheckout`**

En `lib/actions/self-assessment.ts`, dentro de `registerAndStartCheckout`, **después** del insert exitoso de `company_members` y del lead (con la empresa ya creada por `provisionCompany`), añade la persistencia del diagnóstico (no bloqueante del cobro, pero sí registrada):

```ts
import { persistDiagnosis } from "@/lib/diagnosis/persist.server";
// ...
// data.answers viene validado por registrationLeadSchema (Task 4, Step 1).
const persisted = await persistDiagnosis(prov.companyId, data.answers, "self_service");
if (!persisted.ok) {
  console.error("[register] persistDiagnosis falló para company", prov.companyId);
  // No abortamos el cobro: el lead/empresa existen; el diagnóstico se puede
  // re-persistir. Se loggea para seguimiento.
}
```

Colócalo tras crear `company_members` y antes (o después) del insert del lead — en cualquier caso con `prov.companyId` disponible. `data.answers` existe porque el schema ya lo valida.

- [ ] **Step 5: Verificar typecheck, lint y tests**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: sin errores; 0 warnings nuevos; tests verdes (incluye `diagnosis-snapshot`).

- [ ] **Step 6: Commit**

```bash
git add lib/self-assessment/lead-schema.ts components/self-assessment/diagnosis-wizard.tsx components/self-assessment/lead-form.tsx lib/actions/self-assessment.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(diagnosis): persistir el diagnóstico self-service al registrarse (answers en el payload)"
```

---

## Notas de verificación (convención del repo)

- **Lógica pura** (`computeDiagnosisSnapshot`/`toBreachSnapshot`) → tests unitarios Vitest (Task 2).
- **Migración / server / enganche** → verificados por typecheck/lint + `supabase db reset` + queries psql; la persistencia end-to-end se validará por E2E en el sub-proyecto #3 (portal de detalle), que es donde el dato persistido se hace visible. Documentar que #1 no tiene E2E propio (no hay superficie visible aún).

## Fuera de alcance (recordatorio)

Detalle en el portal (#3), documentos (#4/#5), UI de "marcar resuelta" (#6), herramienta del consultor (#2), certificado nuevo (#7), remoción de lo viejo (#8).
