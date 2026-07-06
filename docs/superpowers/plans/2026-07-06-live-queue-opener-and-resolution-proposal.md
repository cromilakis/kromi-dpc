# Cola con opener + orden curado, y propuesta de resolución (Fase 2) — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Pasos con checkbox (`- [ ]`).

**Goal:** (A) La cola de preguntas arranca con un opener amplio y fluye en orden curado,
tachando lo resuelto; (B) al cerrar el diagnóstico, la IA propone por cada gap una acción
estructurada (acción + prioridad + esfuerzo + plazo) que el consultor acepta al Plan.

**Architecture:** El opener es texto i18n renderizado como ítem-lead en el panel en vivo; el
orden curado es una migración de datos sobre `domains.sort` (el guion ya ordena por ahí). La
Fase 2 reusa el patrón de `extract-diagnosis` (DeepSeek, temp 0, Zod tolerante): un helper
puro arma la propuesta, una server action la genera desde el borrador de la sesión (sin
persistir) y otra materializa cada tarjeta aceptada en `remediation_items` (con columnas
nuevas de estructura). Humano confirma cada tarea.

**Tech Stack:** Next.js 16, TypeScript, Zod, next-intl, Vitest, Supabase (RLS), DeepSeek.

## Global Constraints

- **Cero asunciones / determinismo:** el LLM propone, no escribe al expediente ni certifica;
  la acción se ancla al criterio incumplido; sin acción con sentido ⇒ se descarta (no inventa).
  Prioridad/esfuerzo/plazo son sugerencias editables. Gate humano por tarjeta.
- **Seguridad:** consultor autenticado + verificación en la action además de RLS; secretos
  server-only (DEEPSEEK_API_KEY); Zod en servidor antes de tocar datos; `audit_log` en toda
  mutación.
- **Doctrina:** prosa español / código inglés; i18n (`app.diagnosis.*`, `app.plan.*`) — sin
  strings hardcodeados; helpers puros testeables; spacing tokens definidos en `@theme` o px
  arbitrarios `[Npx]` (nunca 6/10/14/56 sueltos); `cn()` no dedupe (no clases mismo-eje que
  choquen); `cursor-pointer` en interactivos.
- **No romper:** flujo manual del plan (`createRemediationItem`), extracción/transcripción,
  panel en vivo, `pnpm test` y `pnpm test:rls` verdes.
- **Migración:** local primero (`supabase migration new`), `supabase db reset` o `db push`
  local, `gen types` (stderr por separado, no `2>&1`), y push a cloud al cerrar.

---

### Task 1: Migración — columnas de estructura en `remediation_items` + reorden de dominios

**Files:**
- Create: `supabase/migrations/<ts>_remediation_structure_and_domain_order.sql`
- Modify: `lib/supabase/types.ts` (regenerado)

**Interfaces (Produces):**
- `remediation_items` gana: `priority text`, `effort_estimate text`, `origin text not null
  default 'manual'`, `control_code text`, `criterion_index int` (todas salvo `origin` nullable).
- `domains.sort` reordenado al orden conversacional del spec §A.2.

- [ ] **Step 1: Escribir la migración**

```sql
-- Estructura de propuestas de resolución (Fase 2) en el plan de adecuación.
-- Columnas nullable: no rompen las tareas manuales existentes (origin='manual').
alter table public.remediation_items
  add column if not exists priority text
    check (priority in ('alta', 'media', 'baja')),
  add column if not exists effort_estimate text
    check (effort_estimate in ('bajo', 'medio', 'alto')),
  add column if not exists origin text not null default 'manual'
    check (origin in ('manual', 'diagnosis')),
  add column if not exists control_code text,
  add column if not exists criterion_index int;

comment on column public.remediation_items.origin is
  'manual (creada por consultor) | diagnosis (propuesta IA aceptada)';

-- Orden conversacional del guion/cola (abierta -> específica). Pendiente de
-- validación consultor/abogado (mismo estatus que interview_questions).
update public.domains set sort = v.sort from (values
  ('DPC-FIN', 1), ('DPC-INV', 2), ('DPC-LIC', 3), ('DPC-PRO', 4),
  ('DPC-CAL', 5), ('DPC-TRA', 6), ('DPC-DER', 7), ('DPC-SEG', 8),
  ('DPC-CON', 9), ('DPC-RES', 10), ('DPC-TER', 11), ('DPC-SEN', 12),
  ('DPC-INC', 13), ('DPC-EIA', 14)
) as v(code, sort) where public.domains.code = v.code;
```

- [ ] **Step 2: Aplicar en local** — `supabase db push` (local) o `supabase migration up`.
  Verificar: `select code, sort from domains order by sort;` da el orden del spec.
- [ ] **Step 3: Regenerar tipos** — `supabase gen types typescript --local > lib/supabase/types.ts`
  (redirigir stderr por separado; NO `2>&1`). Confirmar que `remediation_items` Row/Insert
  incluye `priority`, `effort_estimate`, `origin`, `control_code`, `criterion_index`.
- [ ] **Step 4: typecheck** — `pnpm typecheck` OK.
- [ ] **Step 5: Commit** — `feat(db): estructura de propuestas en remediation_items + reorden de dominios`

---

### Task 2: Opener en el panel en vivo (pregunta de apertura)

**Files:**
- Modify: `components/interview/live-interview-panel.tsx`, `messages/app/diagnosis.json`

**Interfaces (Consumes):** el panel ya tiene la cola (`buildQuestionQueue`) y `t` de
`app.diagnosis.live`.

Comportamiento: sobre la lista de la cola, un **ítem-lead fijo** que muestra el opener,
con etiqueta "Apertura" (badge neutral). No se tacha ni cuenta para cobertura. Es siempre lo
primero que ve el consultor.

- [ ] **Step 1: i18n** — en `messages/app/diagnosis.json`, bajo `app.diagnosis.live`, agregar:

```json
"openerLabel": "Apertura",
"opener": "Cuéntame en general cómo funciona el negocio: qué datos de personas manejan (clientes, trabajadores, proveedores), de dónde salen y para qué los usan."
```

- [ ] **Step 2: Render del lead** — en `live-interview-panel.tsx`, dentro del bloque de la
  cola (`<div>` con `queueTitle`), ANTES del `queue.length === 0 ? ... : <ul>...`, insertar:

```tsx
<div className="mb-8 flex items-baseline gap-8 rounded-tags bg-ash px-8 py-4">
  <StatusBadge variant="neutral">{t("openerLabel")}</StatusBadge>
  <span className="text-body-sm font-medium text-ink">{t("opener")}</span>
</div>
```

- [ ] **Step 3: typecheck + build** — `pnpm typecheck && pnpm build` OK.
- [ ] **Step 4: Commit** — `feat(interview): pregunta de apertura fija al tope de la cola`

---

### Task 3: Helper LLM `propose-remediation` (propuesta estructurada)

**Files:**
- Create: `lib/llm/propose-remediation.ts`
- Test: `test/llm/propose-remediation.test.ts`

**Interfaces (Produces):**
- `export interface RemediationGap { controlCode: string; controlName: string; criterionIndex:
  number; criterion: string; gapType: "no" | "partial" | "flagged"; }`
- `export const proposalItemSchema` (Zod) y `export type ProposalItem = z.infer<...>` con
  `{ controlCode: string; criterionIndex: number; gapType: "no"|"partial"|"flagged"; action:
  string; priority: "alta"|"media"|"baja"; effort: "bajo"|"medio"|"alto"; suggestedDueWeeks:
  number; rationale: string; }`
- `export function buildProposalPrompt(gaps: RemediationGap[]): ChatMessage[]`
- `export function sanitizeProposal(raw: unknown, gaps: RemediationGap[]): ProposalItem[]` —
  descarta items sin `action` (trim vacío) y los que no calcen con un gap dado (por
  controlCode+criterionIndex); nunca inventa gaps que no se enviaron.
- `export async function proposeRemediation(gaps: RemediationGap[]): Promise<ProposalItem[]>` —
  `chatJSON` + `sanitizeProposal`. Si `gaps` vacío ⇒ `[]` sin llamar al LLM.

Patrón: idéntico a `lib/llm/extract-diagnosis.ts` (Zod tolerante, `.catch`/defaults, temp 0
vía `chatJSON`, `LlmError` propagado).

- [ ] **Step 1: Tests** — `test/llm/propose-remediation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  buildProposalPrompt,
  sanitizeProposal,
  type RemediationGap,
} from "@/lib/llm/propose-remediation";

const gaps: RemediationGap[] = [
  { controlCode: "DPC-CAL-001", controlName: "Calidad", criterionIndex: 0,
    criterion: "¿Existe procedimiento de actualización?", gapType: "partial" },
];

describe("buildProposalPrompt", () => {
  it("incluye system + user y menciona los criterios de los gaps", () => {
    const msgs = buildProposalPrompt(gaps);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
    expect(msgs[1].content).toContain("DPC-CAL-001");
    expect(msgs[1].content).toContain("procedimiento de actualización");
  });
});

describe("sanitizeProposal", () => {
  it("acepta un item válido que calza con un gap", () => {
    const out = sanitizeProposal({ items: [{
      controlCode: "DPC-CAL-001", criterionIndex: 0, gapType: "partial",
      action: "Definir procedimiento de actualización y rectificación.",
      priority: "media", effort: "medio", suggestedDueWeeks: 4,
      rationale: "El criterio de actualización está parcial.",
    }] }, gaps);
    expect(out).toHaveLength(1);
    expect(out[0].action).toContain("procedimiento");
  });

  it("descarta un item con action vacía (cero asunciones)", () => {
    const out = sanitizeProposal({ items: [{
      controlCode: "DPC-CAL-001", criterionIndex: 0, gapType: "partial",
      action: "   ", priority: "media", effort: "medio", suggestedDueWeeks: 4,
      rationale: "x",
    }] }, gaps);
    expect(out).toHaveLength(0);
  });

  it("descarta un item que no corresponde a ningún gap enviado", () => {
    const out = sanitizeProposal({ items: [{
      controlCode: "DPC-XXX-999", criterionIndex: 3, gapType: "no",
      action: "Algo inventado.", priority: "alta", effort: "alto",
      suggestedDueWeeks: 2, rationale: "x",
    }] }, gaps);
    expect(out).toHaveLength(0);
  });

  it("normaliza priority/effort fuera de enum a undefined-descartado o default seguro", () => {
    const out = sanitizeProposal({ items: [{
      controlCode: "DPC-CAL-001", criterionIndex: 0, gapType: "partial",
      action: "Acción válida.", priority: "URGENTE", effort: "medio",
      suggestedDueWeeks: 4, rationale: "x",
    }] }, gaps);
    // priority fuera de enum -> 'media' por defecto (no tumba el item)
    expect(out).toHaveLength(1);
    expect(out[0].priority).toBe("media");
  });
});
```

- [ ] **Step 2: Correr y ver fallar** — `pnpm test propose-remediation` → FAIL (módulo no existe).
- [ ] **Step 3: Implementar** `lib/llm/propose-remediation.ts`:

```ts
import { z } from "zod";
import { chatJSON, type ChatMessage } from "@/lib/llm/deepseek";

export interface RemediationGap {
  controlCode: string;
  controlName: string;
  criterionIndex: number;
  criterion: string;
  gapType: "no" | "partial" | "flagged";
}

// priority/effort fuera de enum -> default seguro (no tumba el item); el humano
// edita. gapType con .catch para tolerar ruido del LLM (se corrige contra el gap).
export const proposalItemSchema = z.object({
  controlCode: z.string(),
  criterionIndex: z.number().int().min(0),
  gapType: z.enum(["no", "partial", "flagged"]).catch("partial"),
  action: z.string().default(""),
  priority: z.enum(["alta", "media", "baja"]).catch("media"),
  effort: z.enum(["bajo", "medio", "alto"]).catch("medio"),
  suggestedDueWeeks: z.coerce.number().int().min(1).max(52).catch(4),
  rationale: z.string().default(""),
});
export type ProposalItem = z.infer<typeof proposalItemSchema>;

const responseSchema = z.object({
  items: z.array(proposalItemSchema).default([]),
});

const SYSTEM_PROMPT = `Eres un asistente que propone acciones de remediación para gaps de
cumplimiento de la Ley 21.719 (Chile). Recibes una lista de CRITERIOS INCUMPLIDOS (gaps) y
para CADA UNO propones una acción concreta para satisfacerlo.

REGLAS (NO NEGOCIABLES):
1. NO inventes hechos de la empresa. Solo sabes que el criterio está incumplido; propón la
   acción que lo satisface, en imperativo, concreta y accionable.
2. Si no puedes proponer una acción con sentido para un gap, deja "action" vacío ("").
3. "priority": alta | media | baja. Guía: gapType "no" -> alta; "flagged" -> media;
   "partial" -> media. Ajusta con criterio, pero no inventes urgencias externas.
4. "effort": bajo | medio | alto (estimación gruesa de esfuerzo de implementación).
5. "suggestedDueWeeks": entero de semanas sugeridas (1..52).
6. "rationale": una frase que referencia el criterio incumplido. Sin datos inventados.
7. Responde SOLO JSON: { "items": [ { "controlCode", "criterionIndex", "gapType", "action",
   "priority", "effort", "suggestedDueWeeks", "rationale" } ] }. Un item por gap recibido.`;

export function buildProposalPrompt(gaps: RemediationGap[]): ChatMessage[] {
  const lines = gaps
    .map(
      (g) =>
        `- control ${g.controlCode} (${g.controlName}), criterionIndex ${g.criterionIndex}, ` +
        `gapType ${g.gapType}: "${g.criterion}"`,
    )
    .join("\n");
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Gaps (criterios incumplidos):\n${lines}` },
  ];
}

export function sanitizeProposal(
  raw: unknown,
  gaps: RemediationGap[],
): ProposalItem[] {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) return [];
  const allowed = new Set(gaps.map((g) => `${g.controlCode}#${g.criterionIndex}`));
  const seen = new Set<string>();
  const out: ProposalItem[] = [];
  for (const item of parsed.data.items) {
    const key = `${item.controlCode}#${item.criterionIndex}`;
    if (!allowed.has(key)) continue; // no corresponde a un gap enviado
    if (seen.has(key)) continue; // dedupe por gap
    if (!item.action.trim()) continue; // sin acción con sentido -> se descarta
    seen.add(key);
    out.push(item);
  }
  return out;
}

export async function proposeRemediation(
  gaps: RemediationGap[],
): Promise<ProposalItem[]> {
  if (gaps.length === 0) return [];
  const raw = await chatJSON(buildProposalPrompt(gaps));
  return sanitizeProposal(raw, gaps);
}
```

- [ ] **Step 4: Correr** → PASS; `pnpm typecheck` OK.
- [ ] **Step 5: Commit** — `feat(llm): helper propose-remediation (propuesta estructurada por gap)`

---

### Task 4: Server actions — generar propuesta y aceptar tarjeta

**Files:**
- Create: `lib/interview/build-gaps.ts` (helper puro) + `test/interview/build-gaps.test.ts`
- Modify: `lib/actions/remediation.ts` (agregar `proposeRemediationForSession` y
  `createRemediationFromProposal`)

**Interfaces (Produces):**
- `export function buildGaps(compliance: Record<string, string[]>, controls: Array<{ code:
  string; name: string; criteria: string[] }>): RemediationGap[]` — recorre solo los
  controles dados (ya filtrados por aplicabilidad); por criterio con `no|partial|flagged`
  emite un `RemediationGap`. Ignora `yes` y `unknown`/ausentes.
- `proposeRemediationForSession(sessionId: string): Promise<{ ok: true; proposal: ProposalItem[]
  } | { ok: false; error: ... }>` — auth consultor, lee sesión+empresa+controles aplicables
  (mismo patrón que `extractDiagnosisFromTranscript`), arma gaps con `buildGaps`, llama
  `proposeRemediation`, adjunta `controlName`/`criterion` para la UI. NO persiste.
- `createRemediationFromProposal(input): Promise<RemediationActionResult>` — Zod:
  `{ companyId: uuid, controlCode: string, criterionIndex: int>=0, title: string(1..300),
  priority: enum, effort: enum, dueDate?: iso.date }`; inserta `remediation_item` con
  `origin: 'diagnosis'`, `solution_id: null`, + `audit_log` `remediation.item_added`
  (`source: 'diagnosis'`).

- [ ] **Step 1: Tests del helper puro** — `test/interview/build-gaps.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildGaps } from "@/lib/interview/build-gaps";

const controls = [
  { code: "DPC-CAL-001", name: "Calidad", criteria: ["c0", "c1", "c2", "c3"] },
  { code: "DPC-CON-001", name: "Confidencialidad", criteria: ["d0", "d1"] },
];

describe("buildGaps", () => {
  it("emite gap por criterio no/partial/flagged e ignora yes/unknown/ausente", () => {
    const gaps = buildGaps(
      { "DPC-CAL-001": ["no", "partial", "yes", "flagged"], "DPC-CON-001": ["yes", "yes"] },
      controls,
    );
    expect(gaps.map((g) => [g.controlCode, g.criterionIndex, g.gapType])).toEqual([
      ["DPC-CAL-001", 0, "no"],
      ["DPC-CAL-001", 1, "partial"],
      ["DPC-CAL-001", 3, "flagged"],
    ]);
    expect(gaps[0].criterion).toBe("c0");
    expect(gaps[0].controlName).toBe("Calidad");
  });

  it("sin gaps cuando todo es yes/unknown", () => {
    expect(buildGaps({ "DPC-CAL-001": ["yes", "unknown"] }, controls)).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr y ver fallar** — `pnpm test build-gaps` → FAIL.
- [ ] **Step 3: Implementar** `lib/interview/build-gaps.ts`:

```ts
import type { RemediationGap } from "@/lib/llm/propose-remediation";

const GAP_TYPES = new Set(["no", "partial", "flagged"]);

export function buildGaps(
  compliance: Record<string, string[]>,
  controls: Array<{ code: string; name: string; criteria: string[] }>,
): RemediationGap[] {
  const gaps: RemediationGap[] = [];
  for (const control of controls) {
    const answers = compliance[control.code] ?? [];
    control.criteria.forEach((criterion, criterionIndex) => {
      const a = answers[criterionIndex];
      if (!GAP_TYPES.has(a)) return;
      gaps.push({
        controlCode: control.code,
        controlName: control.name,
        criterionIndex,
        criterion,
        gapType: a as RemediationGap["gapType"],
      });
    });
  }
  return gaps;
}
```

- [ ] **Step 4: Correr** → PASS.
- [ ] **Step 5: Implementar las server actions** en `lib/actions/remediation.ts`.
  `proposeRemediationForSession`: reusar el bloque de lectura de sesión/empresa/controles
  aplicables de `extractDiagnosisFromTranscript` (auth `getUser`, `interview_sessions` →
  `company_id, answers`; `companies` → `factors, sectors(code)`; `controls` filtrados por
  sector y aplicabilidad con el mismo cálculo `applies_when` × factores × override
  `answers.applicability`). Con los controles aplicables `{ code, name, verification_criteria }`
  y `answers.compliance`, llamar `buildGaps` → `proposeRemediation`. Devolver la propuesta
  enriquecida con `controlName` y `criterion` (buscados por code+index). Errores: mapear
  `LlmError.disabled/failed` a `llm_disabled|llm_failed` como en interview.

```ts
// (esqueleto — reusa helpers y patrón de extractDiagnosisFromTranscript)
const proposeSchema = z.object({ sessionId: z.uuid() });

export async function proposeRemediationForSession(sessionId: string) {
  const parsed = proposeSchema.safeParse({ sessionId });
  if (!parsed.success) return { ok: false as const, error: "validation" as const };
  const supabase = await createClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false as const, error: "unauthorized" as const };
  // ... leer sesión, empresa, controles aplicables (idéntico a interview) ...
  // const applicable: Array<{ code, name, criteria }> = ...
  // const compliance = (session.answers as any)?.compliance ?? {}
  const gaps = buildGaps(compliance, applicable);
  try {
    const proposal = await proposeRemediation(gaps);
    // enriquecer con controlName/criterion desde `applicable`
    return { ok: true as const, proposal: enriched };
  } catch (e) {
    if (e instanceof LlmError) {
      return { ok: false as const, error: e.disabled ? "llm_disabled" as const : "llm_failed" as const };
    }
    console.error("[remediation] proposeRemediationForSession falló:", e);
    return { ok: false as const, error: "unavailable" as const };
  }
}

const fromProposalSchema = z.object({
  companyId: z.uuid(),
  controlCode: z.string().trim().min(1).max(40),
  criterionIndex: z.number().int().min(0),
  title: z.string().trim().min(1).max(300),
  priority: z.enum(["alta", "media", "baja"]),
  effort: z.enum(["bajo", "medio", "alto"]),
  dueDate: z.iso.date().optional(),
});

export async function createRemediationFromProposal(
  input: unknown,
): Promise<RemediationActionResult> {
  const parsed = fromProposalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const supabase = await createClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false, error: "unauthorized" };
  const { companyId, controlCode, criterionIndex, title, priority, effort, dueDate } = parsed.data;
  const { data, error } = await supabase
    .from("remediation_items")
    .insert({
      company_id: companyId,
      title,
      priority,
      effort_estimate: effort,
      origin: "diagnosis",
      control_code: controlCode,
      criterion_index: criterionIndex,
      due_date: dueDate ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "42501") return { ok: false, error: "unauthorized" };
    console.error("[remediation] createRemediationFromProposal falló:", error?.message);
    return { ok: false, error: "unavailable" };
  }
  await writeAudit(supabase, {
    actorId: userId, action: "remediation.item_added", entityId: data.id,
    detail: { company_id: companyId, source: "diagnosis", control_code: controlCode,
      criterion_index: criterionIndex, priority, effort_estimate: effort, title },
  });
  revalidatePath(`/app/companies/${companyId}/plan`);
  return { ok: true };
}
```

- [ ] **Step 6: typecheck + tests** — `pnpm typecheck && pnpm test` verdes.
- [ ] **Step 7: Commit** — `feat(remediation): generar propuesta desde el diagnóstico y aceptar al plan`

---

### Task 5: UI — panel de propuesta de resolución

**Files:**
- Create: `components/interview/resolution-proposal.tsx` (client)
- Modify: `components/interview/diagnosis-manager.tsx` (montar la sección), `messages/app/diagnosis.json`

**Interfaces (Consumes):** `proposeRemediationForSession`, `createRemediationFromProposal`,
`sessionId`, `companyId`.

Comportamiento:
- Botón **"Proponer resolución"** → llama `proposeRemediationForSession`. Mientras carga:
  estado `pending`. Error → i18n. Éxito → guarda `proposal` en estado.
- Por cada item: tarjeta con control (nombre) + criterio + badge del veredicto (`no`→danger,
  `partial`→warning, `flagged`→warning); **action editable** (`<Textarea>`), `priority`
  (`<select>`), `effort` (`<select>`), plazo (`<input type="date">` prellenado con hoy +
  `suggestedDueWeeks`). Botones **"Aceptar"** (crea la tarea; al éxito quita la tarjeta) y
  **"Descartar"** (solo la quita del estado local).
- Vacío tras generar: mensaje "sin gaps: nada que proponer".

- [ ] **Step 1: i18n** — en `messages/app/diagnosis.json`, nuevo bloque `app.diagnosis.proposal`:

```json
"proposal": {
  "title": "Propuesta de resolución",
  "subtitle": "Genera acciones sugeridas por cada gap del diagnóstico. Revisa y acepta las que correspondan al plan.",
  "generate": "Proponer resolución",
  "generating": "Generando…",
  "empty": "Sin gaps por resolver: nada que proponer.",
  "actionLabel": "Acción sugerida",
  "priorityLabel": "Prioridad",
  "effortLabel": "Esfuerzo",
  "dueLabel": "Plazo",
  "accept": "Aceptar",
  "dismiss": "Descartar",
  "accepted": "Agregada al plan",
  "priority": { "alta": "Alta", "media": "Media", "baja": "Baja" },
  "effort": { "bajo": "Bajo", "medio": "Medio", "alto": "Alto" },
  "verdict": { "no": "No cumple", "partial": "Parcial", "flagged": "Falta aclarar" },
  "errors": {
    "llm_disabled": "El asistente de IA no está configurado.",
    "llm_failed": "El asistente no pudo generar la propuesta. Reintenta.",
    "generic": "No se pudo generar la propuesta."
  }
}
```

- [ ] **Step 2: Implementar** `resolution-proposal.tsx` (client). Usa `Button`, `Card`,
  `StatusBadge`, `Textarea`, `cn` de `@/components/ui`; `useTransition` para el submit;
  spacing tokens válidos; `cursor-pointer` en botones/selects. El plazo por defecto se calcula
  con `suggestedDueWeeks` (fecha = hoy + weeks*7, formateada `YYYY-MM-DD`).
- [ ] **Step 3: Montaje** — en `diagnosis-manager.tsx`, montar `<ResolutionProposal
  sessionId=... companyId=... />` como sección propia (debajo del cumplimiento), solo cuando
  hay sesión. Pasar `companyId` (ya disponible en el manager).
- [ ] **Step 4: typecheck + build + tests** — `pnpm typecheck && pnpm build && pnpm test` y
  `pnpm test:rls` verdes.
- [ ] **Step 5: E2E click-through (orquestador):** empresa con sesión; sembrar borrador con
  gaps (`no`/`partial`/`flagged`); en el panel, "Proponer resolución" → verificar tarjetas
  con acción/prioridad/esfuerzo/plazo, editar una, "Aceptar" → aparece en el Plan de
  adecuación con `origin='diagnosis'`; "Descartar" quita otra. Verificar el opener al tope de
  la cola. Screenshot. Limpiar datos de prueba.
- [ ] **Step 6: Commit** — `feat(diagnosis): panel de propuesta de resolución estructurada`

---

## Self-review

- **Cobertura del spec:** A.1 opener (T2), A.2 orden (T1), A.3 se mantiene (sin cambio),
  B.2 helper (T3), B.1/B.3 gaps+actions (T4), B.4 UI (T5), B.5 migración (T1). ✓
- **Determinismo:** `sanitizeProposal` descarta acción vacía y gaps no enviados; `buildGaps`
  solo marca no/partial/flagged; humano acepta por tarjeta. ✓
- **Tipos:** `RemediationGap`/`ProposalItem` definidos en T3 y consumidos en T4/T5;
  `priority`/`effort`/`origin` de la migración T1 usados en T4. ✓
- **No romper:** columnas nullable + `origin default 'manual'` no tocan `createRemediationItem`. ✓

## Handoff

Ejecutar con **subagent-driven-development**, T1→T5. Migración local primero; push a cloud al
cerrar. Al terminar: gate + merge a main + deploy. Fase 3 (voz/STT) queda para después.
