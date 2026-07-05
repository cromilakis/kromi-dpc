# Autocompletado del diagnóstico desde transcripción — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Goal:** Que el equipo pegue una transcripción de reunión y un LLM (DeepSeek) proponga —con procedencia y cero asunciones— el llenado del RAT y del cumplimiento, para revisión humana antes de entrar al borrador.

**Architecture:** Módulo LLM server-only (`lib/llm/*`) que hace la llamada determinista y valida la salida con Zod; una server action que carga el catálogo de controles, llama al módulo, persiste transcripción + extracción en `interview_sessions` y devuelve sugerencias; UI de importar + revisar (aceptar/editar/descartar) que fusiona lo aceptado en el `answers` existente (autosave ya presente). El LLM nunca escribe al expediente.

**Tech Stack:** Next.js 16 (App Router, RSC, server actions), TypeScript, Zod, next-intl, Supabase (Postgres/RLS), Vitest, DeepSeek (API compatible con OpenAI).

## Global Constraints

- **Determinismo, cero asunciones (NO NEGOCIABLE):** cada campo sugerido exige una cita textual (`evidence`). Sin evidencia → no se propone; lo ambiguo va a `unassigned`. `temperature: 0` + `response_format: json_object`. El LLM devuelve *sugerencias*, nunca escribe a `answers` ni al expediente.
- **Validación en servidor con Zod ANTES de tocar datos**; jamás confiar en el cliente ni en la salida del LLM sin validar.
- **RLS + auth** en toda server action (defensa en profundidad; `is_consultant()` ya rige las tablas de entrevista). `audit_log` en toda mutación sensible.
- **i18n**: todo texto de UI en `messages/app/*.json` (namespace `app.diagnosis`), nunca hardcodeado. Prosa en español; código/identificadores en inglés.
- **Secretos server-only**: `DEEPSEEK_API_KEY` sin `NEXT_PUBLIC`; la llamada solo ocurre en el servidor.
- **Spacing tokens de Tailwind**: usar SOLO valores definidos en `@theme` (`--spacing-*`: 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 60, 80, 100, 120) o valores arbitrarios en px (`h-[14px]`). NUNCA números intermedios como `-6`, `-10`, `-14` (Tailwind v4 los resuelve con el base dinámico 0.25rem → 4px×N → elementos gigantes).
- **`"use server"`**: un archivo con `"use server"` solo exporta funciones async (los schemas Zod y tipos viven fuera, p. ej. en `lib/interview/*` o `lib/llm/*`).

---

### Task 1: Cliente DeepSeek (`lib/llm/deepseek.ts`)

**Files:**
- Create: `lib/llm/deepseek.ts`
- Test: `test/llm/deepseek.test.ts`

**Interfaces:**
- Produces: `chatJSON(messages: ChatMessage[], opts?: { signal?: AbortSignal }): Promise<{ content: string; usage: unknown }>`; `type ChatMessage = { role: "system"|"user"|"assistant"; content: string }`; `class LlmError extends Error { code: "llm_disabled"|"llm_failed" }`.
- Consumes: `process.env.DEEPSEEK_API_KEY`.

Comportamiento: si no hay API key → `throw new LlmError("llm_disabled")`. Hace POST a `https://api.deepseek.com/chat/completions` con `model: "deepseek-chat"`, `temperature: 0`, `response_format: { type: "json_object" }`. Timeout ~30s vía AbortController. Un reintento ante 5xx o timeout; ante 4xx no reintenta. Cualquier fallo terminal → `LlmError("llm_failed")`.

- [ ] **Step 1: Test de "sin API key lanza llm_disabled"**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { chatJSON, LlmError } from "@/lib/llm/deepseek";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("chatJSON", () => {
  it("lanza llm_disabled si falta la API key", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    await expect(chatJSON([{ role: "user", content: "hola" }])).rejects.toMatchObject({ code: "llm_disabled" });
  });
});
```

- [ ] **Step 2: Correr y ver fallar** — `pnpm test test/llm/deepseek.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: Implementar el cliente**

```ts
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class LlmError extends Error {
  constructor(public code: "llm_disabled" | "llm_failed", message?: string) {
    super(message ?? code);
    this.name = "LlmError";
  }
}

const ENDPOINT = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
const TIMEOUT_MS = 30_000;

async function once(messages: ChatMessage[], signal?: AbortSignal) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new LlmError("llm_disabled");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const retriable = res.status >= 500;
      throw Object.assign(new LlmError("llm_failed", `HTTP ${res.status}`), { retriable });
    }
    const data = await res.json();
    return { content: data.choices?.[0]?.message?.content ?? "", usage: data.usage };
  } catch (cause) {
    if (cause instanceof LlmError && cause.code === "llm_disabled") throw cause;
    const retriable = (cause as { retriable?: boolean })?.retriable ?? true; // timeout/red = retriable
    throw Object.assign(new LlmError("llm_failed", String(cause)), { retriable });
  } finally {
    clearTimeout(timer);
  }
}

export async function chatJSON(messages: ChatMessage[], opts?: { signal?: AbortSignal }) {
  try {
    return await once(messages, opts?.signal);
  } catch (cause) {
    if (cause instanceof LlmError && cause.code === "llm_disabled") throw cause;
    if ((cause as { retriable?: boolean })?.retriable) return once(messages, opts?.signal);
    throw cause;
  }
}
```

- [ ] **Step 4: Test de éxito (fetch mockeado) y de reintento en 5xx**

```ts
it("devuelve content+usage con fetch OK", async () => {
  vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }], usage: { total_tokens: 5 } }),
    { status: 200 },
  )));
  const out = await chatJSON([{ role: "user", content: "x" }]);
  expect(out.content).toBe("{\"ok\":true}");
  expect(out.usage).toEqual({ total_tokens: 5 });
});

it("reintenta una vez ante 5xx y luego propaga llm_failed", async () => {
  vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
  const fetchMock = vi.fn(async () => new Response("err", { status: 503 }));
  vi.stubGlobal("fetch", fetchMock);
  await expect(chatJSON([{ role: "user", content: "x" }])).rejects.toMatchObject({ code: "llm_failed" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 5: Correr** — `pnpm test test/llm/deepseek.test.ts` → PASS.

- [ ] **Step 6: Commit** — `git add lib/llm/deepseek.ts test/llm/deepseek.test.ts && git commit -m "feat(llm): cliente DeepSeek chatJSON (temp 0, JSON mode, timeout, retry)"`

---

### Task 2: Extracción validada (`lib/llm/extract-diagnosis.ts`)

**Files:**
- Create: `lib/llm/extract-diagnosis.ts`
- Test: `test/llm/extract-diagnosis.test.ts`

**Interfaces:**
- Consumes: `chatJSON`, `LlmError` (Task 1); `ratActivitySchema`, `LEGAL_BASES` (`lib/interview/rat-schema.ts`); `ControlLike` (`lib/interview/questions.ts`).
- Produces:
  - `extractionResultSchema` (Zod) y `type ExtractionResult`.
  - `buildExtractionPrompt(args: { transcript: string; controls: ControlLike[] }): ChatMessage[]`.
  - `sanitizeExtraction(raw: unknown, controls: ControlLike[]): ExtractionResult` — valida y descarta filas sin evidencia / con control inexistente / criterionIndex fuera de rango, moviéndolas a `unassigned`.
  - `extractDiagnosis(args: { transcript: string; controls: ControlLike[] }): Promise<ExtractionResult>` — llama a `chatJSON`, parsea JSON, `sanitizeExtraction`; si el parse/validación falla, reintenta 1 vez; si vuelve a fallar → `LlmError("llm_failed")`.

Contrato de salida:
```ts
import { z } from "zod";
import { LEGAL_BASES } from "@/lib/interview/rat-schema";

const ratFieldsSchema = z.object({
  area: z.string().optional(),
  name: z.string().optional(),
  purpose: z.string().optional(),
  legalBasis: z.enum(LEGAL_BASES).optional(),
  dataCategories: z.array(z.string()).optional(),
  dataSubjects: z.array(z.string()).optional(),
  source: z.string().optional(),
  recipients: z.array(z.string()).optional(),
  processors: z.array(z.string()).optional(),
  intlTransfer: z.boolean().optional(),
  intlCountries: z.array(z.string()).optional(),
  retention: z.string().optional(),
  securityMeasures: z.array(z.string()).optional(),
  isSensitive: z.boolean().optional(),
}).strict();

const ratSuggestionSchema = z.object({
  fields: ratFieldsSchema,
  evidence: z.record(z.string(), z.string()),
});
const complianceSuggestionSchema = z.object({
  controlCode: z.string(),
  criterionIndex: z.number().int().min(0),
  answer: z.enum(["yes", "partial", "no"]),
  evidence: z.string().min(1),
});
const unassignedSchema = z.object({ text: z.string(), reason: z.string() });

export const extractionResultSchema = z.object({
  rat: z.array(ratSuggestionSchema),
  compliance: z.array(complianceSuggestionSchema),
  unassigned: z.array(unassignedSchema),
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
```

`buildExtractionPrompt`: system prompt con las reglas duras (solo lo explícito; cada campo con cita en `evidence`; sin cita → omitir y explicar en `unassigned`; responder SOLO JSON con la forma dada). El user prompt incluye la transcripción entre delimitadores y el catálogo de controles como líneas `"[código] nombre — criterios: [0] c0 | [1] c1 | ..."` para que el LLM pueda referenciar `controlCode`+`criterionIndex`.

`sanitizeExtraction` (validación dura post-parse):
- `rat`: descarta toda sugerencia cuyo `evidence` esté vacío o cuyas claves de `evidence` no correspondan a ningún campo presente en `fields`. Descartadas → `unassigned` con `reason: "sin evidencia textual"`.
- `compliance`: descarta filas cuyo `controlCode` no exista en `controls`, cuyo `criterionIndex` esté fuera del rango de `verification_criteria` de ese control, o `evidence` vacío. Descartadas → `unassigned`.

- [ ] **Step 1: Test de `sanitizeExtraction` descarta sin evidencia**

```ts
import { describe, expect, it } from "vitest";
import { sanitizeExtraction } from "@/lib/llm/extract-diagnosis";

const controls = [{ code: "C1", name: "Ctrl 1", domain_id: "d", verification_criteria: ["a", "b"] }];

describe("sanitizeExtraction", () => {
  it("descarta RAT sin evidencia y lo manda a unassigned", () => {
    const out = sanitizeExtraction({
      rat: [{ fields: { name: "X" }, evidence: {} }],
      compliance: [],
      unassigned: [],
    }, controls);
    expect(out.rat).toHaveLength(0);
    expect(out.unassigned.length).toBeGreaterThan(0);
  });

  it("descarta compliance con control inexistente o índice fuera de rango", () => {
    const out = sanitizeExtraction({
      rat: [],
      compliance: [
        { controlCode: "NOPE", criterionIndex: 0, answer: "yes", evidence: "cita" },
        { controlCode: "C1", criterionIndex: 5, answer: "no", evidence: "cita" },
        { controlCode: "C1", criterionIndex: 1, answer: "yes", evidence: "cita" },
      ],
      unassigned: [],
    }, controls);
    expect(out.compliance).toHaveLength(1);
    expect(out.compliance[0]).toMatchObject({ controlCode: "C1", criterionIndex: 1 });
    expect(out.unassigned).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Correr y ver fallar** — `pnpm test test/llm/extract-diagnosis.test.ts` → FAIL.

- [ ] **Step 3: Implementar** `extractionResultSchema`, `buildExtractionPrompt`, `sanitizeExtraction`, `extractDiagnosis` (según interfaces arriba).

- [ ] **Step 4: Test de `extractDiagnosis` con `chatJSON` mockeado** (vi.mock de `@/lib/llm/deepseek` devolviendo JSON válido; y un caso de JSON inválido que reintenta y luego lanza `llm_failed`).

- [ ] **Step 5: Correr** → PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat(llm): extraccion validada del diagnostico (schema Zod + sanitizado a unassigned)"`

---

### Task 3: Migración — columnas `transcript` + `ai_extraction`

**Files:**
- Create: `supabase/migrations/20260705150000_diagnosis_transcript.sql`
- Modify: `lib/supabase/types.ts` (regenerado)

- [ ] **Step 1: Escribir la migración**

```sql
-- Autocompletado del diagnóstico desde transcripción: se guarda el texto
-- crudo de la reunión y la extracción validada del LLM en la sesión.
-- RLS existente (is_consultant()) ya cubre interview_sessions; el GRANT de
-- UPDATE a authenticated ya se otorgó en la migración de entrevista.
alter table public.interview_sessions
  add column if not exists transcript text,
  add column if not exists ai_extraction jsonb;

comment on column public.interview_sessions.transcript is
  'Transcripción cruda de la reunión pegada por el consultor (puede contener datos personales; RLS solo consultores).';
comment on column public.interview_sessions.ai_extraction is
  'Salida validada del LLM (ExtractionResult): rat[], compliance[], unassigned[]. Auditable; no es el expediente.';
```

- [ ] **Step 2: Aplicar en local** — `docker exec -i supabase_db_kromi-dpc psql -U postgres -d postgres < supabase/migrations/20260705150000_diagnosis_transcript.sql` y verificar columnas (`\d interview_sessions`).

- [ ] **Step 3: Regenerar tipos** — `pnpm supabase gen types typescript --local > lib/supabase/types.ts` (o el comando del repo; verificar que aparecen `transcript` y `ai_extraction`).

- [ ] **Step 4: typecheck** — `pnpm typecheck` → OK.

- [ ] **Step 5: Commit** — `git commit -m "feat(db): interview_sessions.transcript + ai_extraction"`

*(La aplicación a cloud (`supabase db push`) se hace en el cierre, junto con el resto de migraciones pendientes.)*

---

### Task 4: Server action `extractDiagnosisFromTranscript`

**Files:**
- Modify: `lib/actions/interview.ts`
- Test: `test/interview/extract-action.test.ts`

**Interfaces:**
- Consumes: `extractDiagnosis`, `LlmError` (Task 2); `buildComplianceQuestions`/`ControlLike` (`lib/interview/questions.ts`); catálogo de `controls` de la base (mismo criterio de rubro que `createCompany`: `sector_scope is null` o incluye el sector de la empresa).
- Produces: `extractDiagnosisFromTranscript(sessionId: string, transcript: string): Promise<ExtractFromTranscriptResult>` donde `type ExtractFromTranscriptResult = { ok: true; extraction: ExtractionResult } | { ok: false; error: InterviewActionError | "llm_disabled" | "llm_failed" }`.

Lógica:
1. Zod: `{ sessionId: uuid, transcript: string.min(1).max(50000) }`.
2. Auth (`getUser`) + cargar sesión (`id, company_id`); si no → `unauthorized`/`not_found`.
3. Cargar `companies.sector_id` → `sectors.code`; cargar `controls` aplicables (`.or("sector_scope.is.null,sector_scope.cs.{<code>}")`), mapear a `ControlLike`.
4. `try { extraction = await extractDiagnosis({ transcript, controls }) } catch (e) { if (e instanceof LlmError) return { ok:false, error: e.code }; throw }`.
5. `update interview_sessions set transcript = ..., ai_extraction = extraction where id = sessionId`.
6. `audit_log` (`interview.transcript_extracted`, detalle: company_id, rat_count, compliance_count, unassigned_count).
7. `return { ok: true, extraction }`. **No** toca `answers`.

- [ ] **Step 1: Test (integración, LLM + supabase mockeados)** — verifica: valida entrada; con `extractDiagnosis` mockeado persiste `transcript`+`ai_extraction`, NO escribe `answers`, deja audit_log; si `extractDiagnosis` lanza `LlmError("llm_disabled")` → `{ ok:false, error:"llm_disabled" }`.

- [ ] **Step 2: Correr y ver fallar.**

- [ ] **Step 3: Implementar la action** en `lib/actions/interview.ts` (seguir la doctrina del archivo: "use server", Zod, auth, mutación+audit, tipos de error).

- [ ] **Step 4: Correr** → PASS. **typecheck** → OK.

- [ ] **Step 5: Commit** — `git commit -m "feat(interview): extractDiagnosisFromTranscript (persiste transcript+extraction, no toca answers)"`

---

### Task 5: UI — importar transcripción (`transcript-import.tsx`)

**Files:**
- Create: `components/interview/transcript-import.tsx`
- Modify: `messages/app/diagnosis.json` (claves `transcript.*`)

**Interfaces:**
- Consumes: `extractDiagnosisFromTranscript` (Task 4).
- Produces: `<TranscriptImport sessionId={string} onExtracted={(r: ExtractionResult) => void} disabled?={boolean} />`.

Comportamiento: botón "Importar desde transcripción" abre un panel con `<textarea>` (aviso i18n: el texto se envía a DeepSeek), botón "Analizar" (estado loading), manejo de errores (`llm_disabled` → nota "función no configurada"; `llm_failed` → reintentar). Al éxito llama `onExtracted(extraction)`. Usa tokens de spacing válidos (ver Global Constraints).

- [ ] **Step 1: Claves i18n** en `messages/app/diagnosis.json` bajo `transcript`: `button`, `panelTitle`, `placeholder`, `privacyNote`, `analyze`, `analyzing`, `errors.llm_disabled`, `errors.llm_failed`.

- [ ] **Step 2: Implementar el componente** (client). Sin lógica de fusión aquí — solo obtiene la extracción y la entrega vía `onExtracted`.

- [ ] **Step 3: typecheck + build** — `pnpm typecheck && pnpm build` → OK.

- [ ] **Step 4: Commit** — `git commit -m "feat(interview): UI para importar transcripcion y disparar extraccion"`

---

### Task 6: UI — revisión y fusión (`extraction-review.tsx` + wiring)

**Files:**
- Create: `components/interview/extraction-review.tsx`
- Modify: `components/interview/diagnosis-manager.tsx`
- Modify: `messages/app/diagnosis.json` (claves `review.*`)

**Interfaces:**
- Consumes: `ExtractionResult` (Task 2); `RatActivity` (`lib/interview/rat-schema.ts`); el estado `answers` y `updateAnswers` del `DiagnosisManager`.
- Produces: `<ExtractionReview extraction={ExtractionResult} onAcceptRat={(a: RatActivity) => void} onAcceptCompliance={(controlCode: string, index: number, answer: "yes"|"partial"|"no") => void} onClose={() => void} />`.

Comportamiento:
- Tres grupos: **RAT**, **Cumplimiento**, **Información sin asignar**.
- Cada sugerencia RAT: muestra los `fields` propuestos + sus citas (`evidence`); Aceptar (crea una `RatActivity` completando defaults del `ratActivitySchema` con los `fields`), Editar (opcional en v1: aceptar y luego editar en el RatForm), Descartar.
- Cada sugerencia de cumplimiento: muestra control + criterio + respuesta + cita; Aceptar (setea ese criterio), Descartar.
- "Información sin asignar": solo lectura (texto + motivo).
- "Aceptar todo" por grupo (RAT / cumplimiento).

Wiring en `DiagnosisManager`:
- Estado `extraction: ExtractionResult | null`. Montar `<TranscriptImport onExtracted={setExtraction} />` y, si hay `extraction`, `<ExtractionReview ... onClose={() => setExtraction(null)} />`.
- `onAcceptRat(activity)` → `updateAnswers(c => ({ ...c, rat: [...c.rat, activity] }))`.
- `onAcceptCompliance(code, i, ans)` → `updateAnswers` seteando `compliance[code][i] = ans` (mismo patrón que `ComplianceForm.onChange`).
- (El autosave con debounce ya persiste `answers`.)

- [ ] **Step 1: Claves i18n** `review.*` (títulos de grupo, acciones aceptar/descartar/aceptarTodo, encabezado "sugerido desde la transcripción", etiqueta de cita).

- [ ] **Step 2: Implementar `extraction-review.tsx`.**

- [ ] **Step 3: Wire en `diagnosis-manager.tsx`** (estado + callbacks de fusión).

- [ ] **Step 4: typecheck + build** → OK.

- [ ] **Step 5: E2E click-through (manual, dev):** con `DEEPSEEK_API_KEY` en `.env.local`, iniciar sesión de diagnóstico → importar una transcripción real → revisar sugerencias → aceptar algunas RAT + cumplimiento → verificar que aparecen en los formularios (borrador) → "Aplicar diagnóstico" → verificar `processing_activities` y `assessment_controls`. Screenshot de la pantalla de revisión.

- [ ] **Step 6: Commit** — `git commit -m "feat(interview): revision de sugerencias del LLM y fusion al borrador"`

---

### Task 7: Renombrar "materializar" → "Aplicar diagnóstico"

**Files:**
- Modify: `messages/app/diagnosis.json`

Solo copy (sin cambios de lógica): `actions.materialize` → "Aplicar diagnóstico"; `actions.materializing` → "Aplicando…"; `actions.materialized` → "Se generó el RAT y se actualizó el checklist DPC."; revisar `status.reviewed` → "Aplicado". Verificar que no queden textos que digan "materializar" en la UI (`grep -ri materializ messages/`).

- [ ] **Step 1: Editar las claves i18n.**
- [ ] **Step 2: build** → OK; revisar en la UI que el botón dice "Aplicar diagnóstico".
- [ ] **Step 3: Commit** — `git commit -m "refactor(interview): 'materializar' -> 'Aplicar diagnostico' (claridad)"`

---

## Self-review

- **Cobertura del spec:** cliente LLM (T1), extracción validada + unassigned (T2), persistencia (T3), server action (T4), UI importar (T5), UI revisar+fusión+rename determinismo humano (T6), rename materializar (T7). Determinismo cubierto en T1 (temp0/JSON), T2 (Zod+sanitizado), T4 (no toca answers), T6 (revisión humana). ✓
- **Sin placeholders:** los pasos con código lo traen; los tests tienen aserciones concretas. El timestamp de migración es un valor real elegido (20260705150000). ✓
- **Consistencia de tipos:** `ExtractionResult` fluye T2→T4→T5→T6; `onAcceptCompliance(code,index,answer)` calza con `ComplianceForm.onChange`; `answer` excluye `unknown` en todo el camino LLM. ✓

## Execution Handoff

Plan guardado en `docs/superpowers/plans/2026-07-05-transcript-autocomplete.md`. Ejecución recomendada: **subagent-driven-development** (un subagente por tarea + revisión entre tareas). La Task 6 incluye verificación E2E manual con la API key real.
