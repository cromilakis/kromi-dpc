# Diagnosis / Interview Standard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the standardized diagnosis/interview (Momento 1): a hybrid RAT + compliance questionnaire, runnable assisted or self-service (token link), that materializes into the RAT inventory and per-control evaluations.

**Architecture:** New DB tables (`processing_activities`, `interview_sessions`, `share_links`) under RLS, plus pure TS logic in `lib/interview/` (question generation from `controls.verification_criteria`, RAT Zod schema, answer→control auto-map, materialization). Server actions in `lib/actions/interview.ts`. Consultant UI under `app/app/companies/[id]/diagnosis/`; self-service under `app/diagnosis/[token]/` gated by a `SECURITY DEFINER` RPC that validates a hashed token.

**Tech Stack:** Next.js 16 (App Router, RSC) · React 19 · TypeScript · Supabase (Postgres + RLS + Storage) · Zod · next-intl · Vitest.

## Global Constraints

- Identifiers (files, folders, routes, tables, enums, functions, vars) in **English**; UI prose/i18n values in **Spanish** (`messages/es.json`).
- Package manager: **pnpm**. Validate all inputs with **Zod on the server**; never trust the client.
- All new tables under **RLS**; consultants/admin via `is_consultant()`/`is_admin()`; the only anon path is the token RPC.
- `complexity_score` is internal-only — never exposed to the self-service respondent.
- No company user accounts — self-service access is via `share_links` token only.
- Content must render server-side; the token page must not leak data beyond its target session.
- TDD for pure logic (`lib/interview/`, `lib/share/`), tested with Vitest under `test/`.
- Migrations follow the existing pattern in `supabase/migrations/` (timestamp prefix, catalog/operations/RLS split already exists; this feature is operational).
- Legal content (criteria/RAT wording) carries the standing "validar con abogado" note; do not present as legal advice.

---

### Task 1: RAT Zod schema (`lib/interview/rat-schema.ts`)

**Files:**
- Create: `lib/interview/rat-schema.ts`
- Test: `test/interview/rat-schema.test.ts`

**Interfaces:**
- Produces: `ratActivitySchema` (Zod), `type RatActivity = z.infer<typeof ratActivitySchema>`. Fields: `area:string(1..)`, `name:string(1..)`, `purpose:string(1..)`, `legalBasis: enum(LEGAL_BASES)`, `dataCategories:string[]`, `dataSubjects:string[]`, `source:string`, `recipients:string[]`, `processors:string[]`, `intlTransfer:boolean`, `intlCountries:string[]`, `retention:string`, `securityMeasures:string[]`, `isSensitive:boolean`, `notes:string.optional()`. Also `LEGAL_BASES` const array.

- [ ] **Step 1: Write the failing test**

```ts
// test/interview/rat-schema.test.ts
import { describe, it, expect } from "vitest";
import { ratActivitySchema, LEGAL_BASES } from "@/lib/interview/rat-schema";

describe("ratActivitySchema", () => {
  const valid = {
    area: "Marketing", name: "Envío de promociones", purpose: "Comunicaciones comerciales",
    legalBasis: "consentimiento", dataCategories: ["contacto"], dataSubjects: ["clientes"],
    source: "Formulario web", recipients: [], processors: ["Mailchimp"],
    intlTransfer: true, intlCountries: ["US"], retention: "24 meses",
    securityMeasures: ["MFA"], isSensitive: false,
  };
  it("accepts a complete activity", () => {
    expect(ratActivitySchema.parse(valid)).toMatchObject({ area: "Marketing" });
  });
  it("rejects empty area", () => {
    expect(() => ratActivitySchema.parse({ ...valid, area: "" })).toThrow();
  });
  it("rejects an unknown legal basis", () => {
    expect(() => ratActivitySchema.parse({ ...valid, legalBasis: "vibes" })).toThrow();
  });
  it("exposes the legal bases catalog", () => {
    expect(LEGAL_BASES).toContain("consentimiento");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/interview/rat-schema.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/interview/rat-schema.ts
import { z } from "zod";

// Bases de licitud (Ley 21.719, Art. 12/13). Validar redacción con abogado.
export const LEGAL_BASES = [
  "consentimiento", "contrato", "obligacion_legal",
  "interes_legitimo", "interes_vital", "funcion_publica",
] as const;

export const ratActivitySchema = z.object({
  area: z.string().min(1),
  name: z.string().min(1),
  purpose: z.string().min(1),
  legalBasis: z.enum(LEGAL_BASES),
  dataCategories: z.array(z.string()).default([]),
  dataSubjects: z.array(z.string()).default([]),
  source: z.string().default(""),
  recipients: z.array(z.string()).default([]),
  processors: z.array(z.string()).default([]),
  intlTransfer: z.boolean().default(false),
  intlCountries: z.array(z.string()).default([]),
  retention: z.string().default(""),
  securityMeasures: z.array(z.string()).default([]),
  isSensitive: z.boolean().default(false),
  notes: z.string().optional(),
});

export type RatActivity = z.infer<typeof ratActivitySchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/interview/rat-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/interview/rat-schema.ts test/interview/rat-schema.test.ts
git commit -m "feat(interview): RAT activity Zod schema"
```

---

### Task 2: Answer→control auto-map (`lib/interview/auto-map.ts`)

**Files:**
- Create: `lib/interview/auto-map.ts`
- Test: `test/interview/auto-map.test.ts`

**Interfaces:**
- Consumes: control status literals used by `assessment_controls.status`: `"pending" | "compliant" | "partial" | "non_compliant"`.
- Produces: `type CriterionAnswer = "yes" | "partial" | "no" | "unknown"`; `mapAnswersToControlStatus(answers: CriterionAnswer[]): ControlStatus`. Rule: no answers or all "unknown" → `pending`; all "yes" → `compliant`; any "no" and no "yes"/"partial" → `non_compliant`; otherwise (mix) → `partial`.

- [ ] **Step 1: Write the failing test**

```ts
// test/interview/auto-map.test.ts
import { describe, it, expect } from "vitest";
import { mapAnswersToControlStatus } from "@/lib/interview/auto-map";

describe("mapAnswersToControlStatus", () => {
  it("all yes -> compliant", () => {
    expect(mapAnswersToControlStatus(["yes", "yes"])).toBe("compliant");
  });
  it("all no -> non_compliant", () => {
    expect(mapAnswersToControlStatus(["no", "no"])).toBe("non_compliant");
  });
  it("mix of yes and no -> partial", () => {
    expect(mapAnswersToControlStatus(["yes", "no"])).toBe("partial");
  });
  it("any partial -> partial", () => {
    expect(mapAnswersToControlStatus(["yes", "partial"])).toBe("partial");
  });
  it("empty or all unknown -> pending", () => {
    expect(mapAnswersToControlStatus([])).toBe("pending");
    expect(mapAnswersToControlStatus(["unknown", "unknown"])).toBe("pending");
  });
  it("unknown is ignored alongside real answers", () => {
    expect(mapAnswersToControlStatus(["yes", "unknown"])).toBe("compliant");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/interview/auto-map.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/interview/auto-map.ts
export type CriterionAnswer = "yes" | "partial" | "no" | "unknown";
export type ControlStatus = "pending" | "compliant" | "partial" | "non_compliant";

export function mapAnswersToControlStatus(answers: CriterionAnswer[]): ControlStatus {
  const real = answers.filter((a) => a !== "unknown");
  if (real.length === 0) return "pending";
  const yes = real.filter((a) => a === "yes").length;
  const partial = real.filter((a) => a === "partial").length;
  const no = real.filter((a) => a === "no").length;
  if (yes === real.length) return "compliant";
  if (no === real.length) return "non_compliant";
  void partial;
  return "partial";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/interview/auto-map.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/interview/auto-map.ts test/interview/auto-map.test.ts
git commit -m "feat(interview): answer->control status auto-map"
```

---

### Task 3: Share-link token (`lib/share/token.ts`)

**Files:**
- Create: `lib/share/token.ts`
- Test: `test/interview/share-token.test.ts`

**Interfaces:**
- Produces: `generateShareToken(): string` (URL-safe, ≥32 chars, from `node:crypto`); `hashShareToken(token: string): string` (sha256 hex, 64 chars). The plaintext token is returned to the caller once; only the hash is stored.

- [ ] **Step 1: Write the failing test**

```ts
// test/interview/share-token.test.ts
import { describe, it, expect } from "vitest";
import { generateShareToken, hashShareToken } from "@/lib/share/token";

describe("share token", () => {
  it("generates a url-safe token of decent length", () => {
    const t = generateShareToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(generateShareToken()).not.toBe(t);
  });
  it("hashes to 64 hex chars, deterministically", () => {
    const t = "abc";
    expect(hashShareToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashShareToken(t)).toBe(hashShareToken(t));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/interview/share-token.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/share/token.ts
import { createHash, randomBytes } from "node:crypto";

export function generateShareToken(): string {
  return randomBytes(24).toString("base64url"); // 32 url-safe chars
}
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/interview/share-token.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/share/token.ts test/interview/share-token.test.ts
git commit -m "feat(share): tokenized share-link generate/hash"
```

---

### Task 4: Question generation from controls (`lib/interview/questions.ts`)

**Files:**
- Create: `lib/interview/questions.ts`
- Test: `test/interview/questions.test.ts`

**Interfaces:**
- Consumes: a minimal control row shape `{ code: string; name: string; domain_id: string; verification_criteria: string[] }`.
- Produces: `type ComplianceQuestion = { controlCode: string; controlName: string; criteria: string[] }`; `buildComplianceQuestions(controls: ControlLike[]): ComplianceQuestion[]` — one entry per control that has ≥1 verification criterion, preserving input order, each criterion becoming an answerable item.

- [ ] **Step 1: Write the failing test**

```ts
// test/interview/questions.test.ts
import { describe, it, expect } from "vitest";
import { buildComplianceQuestions } from "@/lib/interview/questions";

const controls = [
  { code: "DPC-LIC-001", name: "Bases de licitud", domain_id: "d1", verification_criteria: ["¿Existe registro de bases?", "¿Se recoge consentimiento?"] },
  { code: "DPC-XXX-000", name: "Sin criterios", domain_id: "d2", verification_criteria: [] },
];

describe("buildComplianceQuestions", () => {
  it("emits one question group per control with criteria", () => {
    const q = buildComplianceQuestions(controls);
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ controlCode: "DPC-LIC-001", criteria: controls[0].verification_criteria });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/interview/questions.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/interview/questions.ts
export interface ControlLike {
  code: string;
  name: string;
  domain_id: string;
  verification_criteria: string[];
}
export interface ComplianceQuestion {
  controlCode: string;
  controlName: string;
  criteria: string[];
}
export function buildComplianceQuestions(controls: ControlLike[]): ComplianceQuestion[] {
  return controls
    .filter((c) => c.verification_criteria.length > 0)
    .map((c) => ({ controlCode: c.code, controlName: c.name, criteria: c.verification_criteria }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/interview/questions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/interview/questions.ts test/interview/questions.test.ts
git commit -m "feat(interview): build compliance questions from controls"
```

---

### Task 5: DB migration — tables, enums, RLS, token RPC

**Files:**
- Create: `supabase/migrations/20260705120000_interview.sql`
- Modify: `lib/supabase/types.ts` (add the new tables/enums to the typed `Database`)

**Interfaces:**
- Produces (SQL): tables `public.processing_activities`, `public.interview_sessions`, `public.share_links`; enums `interview_mode('assisted','self')`, `interview_status('draft','in_progress','submitted','reviewed')`, `share_kind('diagnosis','certificate','document')`; RPC `public.open_diagnosis(token text)` (`SECURITY DEFINER`) returning the single matching non-expired/non-revoked diagnosis session row + its company name; RPC `public.save_diagnosis_answers(token text, answers jsonb)` to append/replace the draft answers for that session.
- TS: extend `Database["public"]["Tables"]` and `["Enums"]` so `createClient()` calls stay typed.

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/20260705120000_interview.sql
create type interview_mode as enum ('assisted','self');
create type interview_status as enum ('draft','in_progress','submitted','reviewed');
create type share_kind as enum ('diagnosis','certificate','document');

create table public.processing_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  area text not null,
  name text not null,
  purpose text not null default '',
  legal_basis text not null default '',
  data_categories text[] not null default '{}',
  data_subjects text[] not null default '{}',
  source text not null default '',
  recipients text[] not null default '{}',
  processors text[] not null default '{}',
  intl_transfer boolean not null default false,
  intl_countries text[] not null default '{}',
  retention text not null default '',
  security_measures text[] not null default '{}',
  is_sensitive boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  mode interview_mode not null default 'assisted',
  status interview_status not null default 'draft',
  answers jsonb not null default '{}'::jsonb,
  respondent jsonb not null default '{}'::jsonb,
  progress int not null default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind share_kind not null,
  target_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now()
);

alter table public.processing_activities enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.share_links enable row level security;

-- Consultores/admin: acceso completo (patrón existente).
create policy pa_rw on public.processing_activities for all
  using (is_consultant()) with check (is_consultant());
create policy is_rw on public.interview_sessions for all
  using (is_consultant()) with check (is_consultant());
create policy sl_rw on public.share_links for all
  using (is_consultant()) with check (is_consultant());

create trigger set_pa_updated before update on public.processing_activities
  for each row execute function set_updated_at();
create trigger set_is_updated before update on public.interview_sessions
  for each row execute function set_updated_at();

-- Acceso self por token (anon): SECURITY DEFINER, expone SOLO la sesión objetivo.
create or replace function public.open_diagnosis(p_token text)
returns table (session_id uuid, company_name text, status interview_status, answers jsonb)
language sql security definer set search_path = public as $$
  select s.id, c.name, s.status, s.answers
  from public.share_links l
  join public.interview_sessions s on s.id = l.target_id
  join public.companies c on c.id = s.company_id
  where l.kind = 'diagnosis'
    and l.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and l.revoked_at is null
    and (l.expires_at is null or l.expires_at > now())
    and s.status in ('draft','in_progress')
  limit 1;
$$;

create or replace function public.save_diagnosis_answers(p_token text, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_session uuid;
begin
  select s.id into v_session
  from public.share_links l join public.interview_sessions s on s.id = l.target_id
  where l.kind = 'diagnosis'
    and l.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and l.revoked_at is null and (l.expires_at is null or l.expires_at > now())
    and s.status in ('draft','in_progress');
  if v_session is null then raise exception 'invalid_or_expired_token'; end if;
  update public.interview_sessions
    set answers = p_answers, status = 'in_progress', updated_at = now()
    where id = v_session;
end; $$;

grant execute on function public.open_diagnosis(text) to anon, authenticated;
grant execute on function public.save_diagnosis_answers(text, jsonb) to anon, authenticated;
```
(Note: `digest()` requires `pgcrypto`; it is already enabled in this project — verify with `select extname from pg_extension;`. If missing, prepend `create extension if not exists pgcrypto;`.)

- [ ] **Step 2: Apply locally and verify**

Run: `supabase db reset` (local) — applies all migrations + seed.
Expected: no errors; `\dt public.*` shows the 3 new tables; `\df public.open_diagnosis` exists.

- [ ] **Step 3: Add the types to `lib/supabase/types.ts`**

Add `processing_activities`, `interview_sessions`, `share_links` to `Database["public"]["Tables"]` (Row/Insert/Update) and the 3 enums to `["Enums"]`, mirroring the SQL columns/types (jsonb → `Json`; text[] → `string[]`).

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260705120000_interview.sql lib/supabase/types.ts
git commit -m "feat(interview): db tables, RLS and token RPCs for diagnosis"
```

---

### Task 6: Server actions (`lib/actions/interview.ts`)

**Files:**
- Create: `lib/actions/interview.ts`
- Reference: `lib/actions/assessments.ts` (pattern for `"use server"`, auth guard, `revalidatePath`), `lib/supabase/server.ts`, `lib/supabase/admin.ts`.

**Interfaces:**
- Consumes: `mapAnswersToControlStatus`, `buildComplianceQuestions`, `ratActivitySchema`, `generateShareToken`, `hashShareToken`.
- Produces (all `"use server"`):
  - `createDiagnosisSession(companyId: string): Promise<{ sessionId: string }>` — ensures an open `assessment` (reuse existing helper or create cycle), inserts `interview_sessions(mode:'assisted')`.
  - `createDiagnosisShareLink(sessionId: string, companyId: string, expiresInDays?: number): Promise<{ url: string }>` — generates token, stores hash in `share_links(kind:'diagnosis', target_id:sessionId)`, returns `/diagnosis/<token>` (plaintext once).
  - `saveDiagnosisDraft(sessionId: string, answers: unknown): Promise<void>` — consultant autosave (validates shape, writes `answers`).
  - `materializeDiagnosis(sessionId: string): Promise<void>` — reads `answers`, writes `processing_activities` rows (validated by `ratActivitySchema`), computes each control status via `mapAnswersToControlStatus`, upserts `assessment_controls`, sets session `status='reviewed'`, `revalidatePath` the company diagnosis + checklist pages, writes `audit_log`.

- [ ] **Step 1: Write the action module** (full code; guards mirror `assessments.ts`)

Implement each function above using `createClient()` (RLS as consultant) for consultant actions; validate `answers.rat[]` with `ratActivitySchema`; for compliance, group `answers.compliance[controlCode] = CriterionAnswer[]` → `mapAnswersToControlStatus` → upsert `assessment_controls(assessment_id, control_id, status)`. Every mutation guarded by `is_consultant()` (RLS) + a server-side profile check like `assessments.ts`.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 3: Unit-test the pure parts already covered** (auto-map/schema tested in Tasks 1–4); add one integration-ish test for `materializeDiagnosis` answer-shape parsing if feasible with a mocked client, else skip and rely on manual verification in Task 8.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/interview.ts
git commit -m "feat(interview): server actions (create/share/save/materialize)"
```

---

### Task 7: Consultant UI (`app/app/companies/[id]/diagnosis/`)

**Files:**
- Create: `app/app/companies/[id]/diagnosis/page.tsx`
- Create: `components/interview/rat-form.tsx`, `components/interview/compliance-form.tsx`, `components/interview/diagnosis-manager.tsx` (client where interactive)
- Modify: `components/app/shell/sidebar.tsx` (add "Diagnóstico" nav item → `/app/companies/[id]/diagnosis`), `messages/es.json` (new keys under `app.diagnosis`)

**Interfaces:**
- Consumes: the server actions from Task 6; `buildComplianceQuestions` fed by controls loaded server-side.

- [ ] **Step 1: Build the page** — server component: loads company + active assessment + controls (with `verification_criteria`) + existing session; renders `diagnosis-manager` with Section A (`rat-form`, add/edit activities) and Section B (`compliance-form`, per-control criteria as yes/partial/no/unknown). Autosave via `saveDiagnosisDraft`. "Generar enlace de autodiagnóstico" button → `createDiagnosisShareLink` (shows the URL once, copyable). "Materializar / revisar" → `materializeDiagnosis`. All UI text Spanish via `messages/es.json`.

- [ ] **Step 2: Typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: exit 0; route `/app/companies/[id]/diagnosis` listed.

- [ ] **Step 3: Manual verify** — with local Supabase + seed + consultant login, open a company → Diagnóstico, fill a RAT activity + a few control criteria, autosave, generate link, materialize; confirm `assessment_controls` statuses updated (checklist reflects them) and a `processing_activities` row exists.

- [ ] **Step 4: Commit**

```bash
git add app/app/companies/[id]/diagnosis components/interview messages/es.json components/app/shell/sidebar.tsx
git commit -m "feat(interview): consultant diagnosis UI"
```

---

### Task 8: Self-service UI (`app/diagnosis/[token]/`)

**Files:**
- Create: `app/diagnosis/[token]/page.tsx`
- Create: `lib/actions/diagnosis-public.ts` (`"use server"`: `loadPublicDiagnosis(token)` → calls `open_diagnosis` RPC via anon client; `savePublicDiagnosis(token, answers)` → `save_diagnosis_answers` RPC, validating shape with Zod first)
- Reference: `lib/supabase/server.ts` (anon client)

**Interfaces:**
- Consumes: RPCs `open_diagnosis`, `save_diagnosis_answers` (Task 5); reuses `rat-form`/`compliance-form` from Task 7 in a read/write-limited mode.

- [ ] **Step 1: Build the token page** — server component: calls `loadPublicDiagnosis(params.token)`. If null → a friendly "enlace no válido o expirado" state (Spanish). If ok → renders the same RAT + compliance forms bound to `savePublicDiagnosis` (autosave via the RPC), with a "Enviar" that sets progress; never shows internal fields (no complexity score, no other company data). No login.

- [ ] **Step 2: Typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: exit 0; route `/diagnosis/[token]` listed.

- [ ] **Step 3: Manual verify** — generate a link from Task 7, open `/diagnosis/<token>` in a logged-out browser, answer + autosave, confirm the session `answers` update in DB and that an invalid token shows the not-valid state. Confirm no other company data is reachable.

- [ ] **Step 4: Commit**

```bash
git add app/diagnosis components/interview lib/actions/diagnosis-public.ts messages/es.json
git commit -m "feat(interview): self-service diagnosis via token link"
```

---

## Self-Review

- **Spec coverage:** RAT (Task 1,5,7,8) · question generation from controls (Task 4,7) · auto-map + override (Task 2,6; override via existing `assessment_controls` editors) · assisted + self modes (Task 7,8) · save/resume (draft `answers`, Task 6,8) · token access no accounts (Task 3,5,8) · materialize into RAT + `assessment_controls` (Task 6) · RLS + token RPC (Task 5). Covered.
- **Out of scope (later sub-projects):** risk auto-eval (#2), proposal doc (#3), certification annex (#4). Not in this plan.
- **Placeholders:** none — logic tasks carry full code/tests; UI/migration tasks carry concrete SQL/signatures.
- **Type consistency:** `ControlStatus` literals match `assessment_controls.status`; `CriterionAnswer` shared between Task 2 and forms; `answers` jsonb shape (`{ rat: RatActivity[], compliance: Record<controlCode, CriterionAnswer[]> }`) consistent across Tasks 6–8.
- **Validation pendiente abogado:** RAT/criteria wording flagged (Global Constraints).
