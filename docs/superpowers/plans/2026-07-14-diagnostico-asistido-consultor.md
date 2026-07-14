# Diagnóstico asistido del consultor — Plan de implementación (sub-proyecto #2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el consultor cree una empresa con identidad mínima y aplique la MISMA encuesta del autodiagnóstico, persistiendo el diagnóstico (`consultant_assisted`), reemplazando el alta clasificatoria de `/app/companies/new`.

**Architecture:** Se extrae el núcleo del cuestionario a un componente compartido (`DiagnosisQuestionnaire`, render-prop `renderComplete`) y la derivación de clasificación a una función pura (`deriveClassification`), sin cambiar el flujo público. Una server action gated a consultor (`createCompanyWithDiagnosis`) recomputa clasificación y brechas en servidor y reusa `provisionCompany` + `persistDiagnosis`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (RLS), Zod, `lib/legal` + `lib/diagnosis` (motor + persistencia del #1), Vitest, Playwright, next-intl.

## Global Constraints

- pnpm. Comandos: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test:e2e`.
- Prosa en español; identificadores en inglés. Textos de UI externalizados (i18n).
- **No se confía en el cliente:** la clasificación (`deriveClassification`) y las brechas (`persistDiagnosis`) se recomputan en el servidor desde `answers`.
- **Rol:** `createCompanyWithDiagnosis` verifica sesión + `profiles.role in ('consultant','admin')` (defensa en profundidad además de RLS).
- Reusar `provisionCompany` (`lib/companies/provision.server.ts`) y `persistDiagnosis` (`lib/diagnosis/persist.server.ts`) del #1 — NO reimplementar.
- **No cambiar el comportamiento del flujo público** del autodiagnóstico al extraer el componente.
- Identidad de commits: `Cromilakis <ipcromilakis@gmail.com>`; sin trailers `Co-Authored-By` ni atribuciones a Claude.

## Estructura de archivos

- Create: `lib/diagnosis/derive.ts` — `deriveClassification` + mapas (`SIZE_MAP`/`RUBRO_MAP`/`FACTOR_MAP`).
- Test: `test/diagnosis-derive.test.ts`.
- Create: `components/self-assessment/diagnosis-questionnaire.tsx` — núcleo del cuestionario (render-prop).
- Modify: `components/self-assessment/diagnosis-wizard.tsx` — pasa a envolver `DiagnosisQuestionnaire`.
- Create: `lib/actions/assisted-diagnosis.ts` — `createCompanyWithDiagnosis`.
- Create: `components/companies/assisted-diagnosis-flow.tsx` — flujo consultor (identidad + cuestionario).
- Modify: `app/app/companies/new/page.tsx` — renderiza el flujo nuevo.
- Modify: `messages/app/*.json` (o donde vivan los textos de `app.companies`) — i18n del flujo nuevo.
- Modify: el CTA "Nueva empresa" (dondequiera que enlace a `/app/companies/new`) — sin cambio de ruta (misma URL), verificar que sigue apuntando ahí.

---

### Task 1: `deriveClassification` (función pura + tests)

**Files:**
- Create: `lib/diagnosis/derive.ts`
- Test: `test/diagnosis-derive.test.ts`

**Interfaces:**
- Consumes: `@/lib/legal` (`walkScreening`, `computeFullDiagnosis`, `SCREENING_NODES`, `INFERENCE_RULES`, `DEEP_DIVE_BRANCHES`); `@/lib/diagnosis/snapshot` (`type DiagnosisAnswers`); `@/lib/companies/schema` (`type ComplexityFactor`, `type SizeTier`).
- Produces: `deriveClassification(answers: DiagnosisAnswers): { sizeTier: SizeTier; sectorCode: string; factors: ComplexityFactor[] }`.

- [ ] **Step 1: Escribir el test que falla**

Create `test/diagnosis-derive.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deriveClassification } from "../lib/diagnosis/derive";
import type { DiagnosisAnswers } from "../lib/diagnosis/snapshot";

const COMPLEXITY = [
  "sensitive_data",
  "international_transfers",
  "automated_decisions",
  "multi_site",
  "critical_providers",
  "low_maturity",
];

describe("deriveClassification", () => {
  it("deriva sizeTier desde S-001 (micro)", () => {
    const answers: DiagnosisAnswers = {
      screening: [{ nodeId: "S-001", value: "micro" }],
      deepDive: [],
    };
    expect(deriveClassification(answers).sizeTier).toBe("micro");
  });

  it("mapea tramos del cuestionario a SizeTier (mediana → small, grande → enterprise)", () => {
    const mediana: DiagnosisAnswers = { screening: [{ nodeId: "S-001", value: "mediana" }], deepDive: [] };
    const grande: DiagnosisAnswers = { screening: [{ nodeId: "S-001", value: "grande" }], deepDive: [] };
    expect(deriveClassification(mediana).sizeTier).toBe("small");
    expect(deriveClassification(grande).sizeTier).toBe("enterprise");
  });

  it("deriva sectorCode desde S-002 (salud → salud, financiero → fintech)", () => {
    const salud: DiagnosisAnswers = { screening: [{ nodeId: "S-002", value: "salud" }], deepDive: [] };
    const fin: DiagnosisAnswers = { screening: [{ nodeId: "S-002", value: "financiero" }], deepDive: [] };
    expect(deriveClassification(salud).sectorCode).toBe("salud");
    expect(deriveClassification(fin).sectorCode).toBe("fintech");
  });

  it("aplica defaults: sin S-001 → micro, sin S-002 → otro", () => {
    const empty: DiagnosisAnswers = { screening: [], deepDive: [] };
    const c = deriveClassification(empty);
    expect(c.sizeTier).toBe("micro");
    expect(c.sectorCode).toBe("otro");
  });

  it("S-002 multi: toma el primer valor con mapeo", () => {
    const multi: DiagnosisAnswers = {
      screening: [
        { nodeId: "S-002", value: "otro" },
        { nodeId: "S-002", value: "salud" },
      ],
      deepDive: [],
    };
    // 'otro' mapea a 'otro' (primer valor con mapeo) — determinista por orden.
    expect(deriveClassification(multi).sectorCode).toBe("otro");
  });

  it("factors: array de ComplexityFactor válidos y deduplicado", () => {
    const answers: DiagnosisAnswers = {
      screening: [{ nodeId: "S-001", value: "micro" }, { nodeId: "S-002", value: "salud" }],
      deepDive: [],
    };
    const { factors } = deriveClassification(answers);
    expect(Array.isArray(factors)).toBe(true);
    expect(new Set(factors).size).toBe(factors.length); // sin duplicados
    for (const f of factors) expect(COMPLEXITY).toContain(f);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm test diagnosis-derive`
Expected: FAIL (módulo `lib/diagnosis/derive` no existe).

- [ ] **Step 3: Implementar**

Create `lib/diagnosis/derive.ts` (mueve los mapas desde `diagnosis-wizard.tsx`, no los reinventes):

```ts
import {
  DEEP_DIVE_BRANCHES,
  INFERENCE_RULES,
  SCREENING_NODES,
  computeFullDiagnosis,
  walkScreening,
} from "@/lib/legal";
import type { ComplexityFactor, SizeTier } from "@/lib/companies/schema";
import type { DiagnosisAnswers } from "@/lib/diagnosis/snapshot";

/** Tramo del cuestionario (S-001) → tramo de empresa. */
const SIZE_MAP: Record<string, SizeTier> = {
  micro: "micro",
  pequena: "micro",
  mediana: "small",
  grande: "enterprise",
};

/** Rubro del cuestionario (S-002) → código de sector del catálogo. */
const RUBRO_MAP: Record<string, string> = {
  retail: "retail",
  salud: "salud",
  financiero: "fintech",
  tecnologia: "startup",
  rrhh: "b2b",
  educacion: "otro",
  otro: "otro",
};

/** Factor de riesgo del diagnóstico → factor de complejidad del alta. */
const FACTOR_MAP: Record<string, ComplexityFactor> = {
  sensitive_data: "sensitive_data",
  biometric_data: "sensitive_data",
  international_transfers: "international_transfers",
  critical_providers: "critical_providers",
  automated_decisions: "automated_decisions",
  multi_site: "multi_site",
};

/**
 * Deriva la clasificación de la empresa (tamaño, rubro, factores) desde las
 * respuestas del cuestionario. Fuente única usada por el wizard (cliente, para
 * mostrar) y por la server action (servidor, autoritativo). Los factores salen
 * de los riskFactors que calcula el motor a partir de TODAS las respuestas.
 */
export function deriveClassification(answers: DiagnosisAnswers): {
  sizeTier: SizeTier;
  sectorCode: string;
  factors: ComplexityFactor[];
} {
  const sizeValue =
    answers.screening.find((a) => a.nodeId === "S-001")?.value ?? "";
  const sizeTier = SIZE_MAP[sizeValue] ?? "micro";

  const sectorCode =
    answers.screening
      .filter((a) => a.nodeId === "S-002")
      .map((a) => RUBRO_MAP[a.value])
      .find(Boolean) ?? "otro";

  const walked = walkScreening(SCREENING_NODES, answers.screening);
  const result = computeFullDiagnosis(
    walked,
    INFERENCE_RULES,
    DEEP_DIVE_BRANCHES,
    answers.deepDive,
  );
  const factors = Array.from(
    new Set(
      result.riskFactors
        .map((f) => FACTOR_MAP[f])
        .filter((f): f is ComplexityFactor => Boolean(f)),
    ),
  );

  return { sizeTier, sectorCode, factors };
}
```

> Confirma que `computeFullDiagnosis(...).riskFactors` existe (lo usa hoy el `derived` useMemo del wizard). Si el orden de `S-002` multi difiere, ajusta el test al comportamiento real (primer valor con mapeo).

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm test diagnosis-derive`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/diagnosis/derive.ts test/diagnosis-derive.test.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(diagnosis): deriveClassification (tamaño/rubro/factores desde las respuestas)"
```

---

### Task 2: Extraer `DiagnosisQuestionnaire` (refactor, preserva el flujo público)

**Files:**
- Create: `components/self-assessment/diagnosis-questionnaire.tsx`
- Modify: `components/self-assessment/diagnosis-wizard.tsx`

**Interfaces:**
- Consumes: `deriveClassification` (Task 1).
- Produces: `DiagnosisQuestionnaire` (client) con prop
  `renderComplete: (args: { result: FullDiagnosisResult; answers: DiagnosisAnswers; restart: () => void }) => React.ReactNode`.
  Mientras el cuestionario no está completo, renderiza las preguntas; al completarse, retorna `renderComplete({ result, answers, restart })`.

- [ ] **Step 1: Crear `DiagnosisQuestionnaire` moviendo el núcleo del wizard**

Crea `components/self-assessment/diagnosis-questionnaire.tsx` y **mueve** desde `diagnosis-wizard.tsx` (sin reescribir la lógica, cópiala tal cual y ajústala a la nueva firma):
- Todo el estado del cuestionario: `screeningAnswers`, `ddAnswers`, `customText`, `confirmed`, `questionRef`.
- Los helpers `screeningUsesContinue`/`deepDiveUsesContinue`, `isStepAnswered`, el `useMemo` de `steps`, `currentIndex`/`currentStep`/`isComplete`/`canGoBack`/`currentId`, `answersPayload`, `result`, `currentValues`, `currentCustom`.
- Los handlers `selectSingle`, `toggleMulti`, `setCustom`, `confirmStep`, `goBack`, `restart`.
- El bloque de estilos `optionCardClasses`/`optionLabelClasses`, el `type Step`, `interface DeepDiveEntry`, y el JSX de la tarjeta de pregunta (opciones, textarea de texto libre, botón Continuar, botón Anterior) y el estado de carga (`if (!currentStep) return loading`).
- El tipo de `answersPayload` es `DiagnosisAnswers` (impórtalo de `@/lib/diagnosis/snapshot`).

Firma y rama de completado:

```tsx
"use client";
// ...imports (los mismos que usa el núcleo) + DiagnosisAnswers + FullDiagnosisResult
export function DiagnosisQuestionnaire({
  renderComplete,
}: {
  renderComplete: (args: {
    result: FullDiagnosisResult;
    answers: DiagnosisAnswers;
    restart: () => void;
  }) => React.ReactNode;
}) {
  // ...todo el estado/handlers/derivados movidos...

  if (isComplete && result) {
    return <>{renderComplete({ result, answers: answersPayload, restart })}</>;
  }
  if (!currentStep) {
    return (/* estado de carga movido */);
  }
  return (/* JSX de la tarjeta de pregunta movido */);
}
```

> NO muevas el `showLead`, ni `DiagnosisResultPanel`/`DiagnosisLeadForm`, ni el `derived` useMemo, ni `sectors`: eso queda en el wrapper público (Step 2).

- [ ] **Step 2: Reescribir `DiagnosisWizard` como envoltorio delgado**

Reescribe `components/self-assessment/diagnosis-wizard.tsx` para que use `DiagnosisQuestionnaire` y conserve el comportamiento público (resultado → panel → lead-form):

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { useTranslations } from "next-intl";
import { DiagnosisQuestionnaire } from "./diagnosis-questionnaire";
import { DiagnosisResultPanel } from "./diagnosis-result";
import { DiagnosisLeadForm } from "./lead-form";
import { buildPreliminaryPanorama } from "@/lib/self-assessment/panorama";
import { deriveClassification } from "@/lib/diagnosis/derive";
import type { WizardSector } from "@/components/companies/new-company-wizard";

export function DiagnosisWizard({ sectors }: { sectors: WizardSector[] }) {
  const t = useTranslations("diagnosis");
  const [showLead, setShowLead] = useState(false);

  return (
    <DiagnosisQuestionnaire
      renderComplete={({ result, answers, restart }) => {
        const derived = deriveClassification(answers);
        if (showLead) {
          return (
            <DiagnosisLeadForm
              sectors={sectors}
              sizeTier={derived.sizeTier}
              factors={derived.factors}
              sectorCode={derived.sectorCode}
              diagnosis={{ riskLevel: result.riskLevel, totalBreaches: result.totalBreaches }}
              panorama={buildPreliminaryPanorama(result)}
              answers={answers}
              onBack={() => setShowLead(false)}
            />
          );
        }
        return (
          <>
            <DiagnosisResultPanel result={result} onGetFullDiagnosis={() => setShowLead(true)} />
            <div className="mt-32 text-center">
              <Button variant="ghost" onClick={() => { setShowLead(false); restart(); }}>
                {t("nav.restart")}
              </Button>
            </div>
          </>
        );
      }}
    />
  );
}
```

> `derived` ahora sale de `deriveClassification(answers)` (Task 1), no del useMemo inline (que se eliminó al mover el núcleo). El comportamiento observable es idéntico: mismos props a `DiagnosisLeadForm`.

- [ ] **Step 3: Verificar typecheck, lint y tests (comportamiento público preservado)**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: sin errores; 0 warnings nuevos; tests verdes.

- [ ] **Step 4: Commit**

```bash
git add components/self-assessment/diagnosis-questionnaire.tsx components/self-assessment/diagnosis-wizard.tsx
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "refactor(diagnosis): extraer DiagnosisQuestionnaire reutilizable (flujo público preservado)"
```

---

### Task 3: Server action `createCompanyWithDiagnosis`

**Files:**
- Create: `lib/actions/assisted-diagnosis.ts`

**Interfaces:**
- Consumes: `deriveClassification` (Task 1); `provisionCompany` (`@/lib/companies/provision.server`); `persistDiagnosis` (`@/lib/diagnosis/persist.server`); `createClient` (`@/lib/supabase/server`); `identificationSchema` (`@/lib/companies/schema`).
- Produces: `createCompanyWithDiagnosis(input: unknown): Promise<{ ok: false; error: "validation" | "unauthorized" | "rutTaken" | "unavailable" }>` (en éxito hace `redirect(...)`, no retorna).

- [ ] **Step 1: Implementar la action**

Create `lib/actions/assisted-diagnosis.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { identificationSchema } from "@/lib/companies/schema";
import { deriveClassification } from "@/lib/diagnosis/derive";
import { persistDiagnosis } from "@/lib/diagnosis/persist.server";
import { provisionCompany } from "@/lib/companies/provision.server";
import { createClient } from "@/lib/supabase/server";

const answersSchema = z.object({
  screening: z
    .array(z.strictObject({ nodeId: z.string().max(200), value: z.string().max(200) }))
    .max(200),
  deepDive: z
    .array(
      z.strictObject({
        questionId: z.string().max(200),
        branchId: z.string().max(200),
        value: z.string().max(200),
      }),
    )
    .max(200),
});

const inputSchema = z.strictObject({
  ...identificationSchema.shape,
  answers: answersSchema,
});

export type CreateCompanyWithDiagnosisError =
  | "validation"
  | "unauthorized"
  | "rutTaken"
  | "unavailable";

export type CreateCompanyWithDiagnosisResult = {
  ok: false;
  error: CreateCompanyWithDiagnosisError;
};

export async function createCompanyWithDiagnosis(
  input: unknown,
): Promise<CreateCompanyWithDiagnosisResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[assisted-diagnosis] lectura de profile falló:", profileError.message);
    return { ok: false, error: "unavailable" };
  }
  if (!profile || (profile.role !== "consultant" && profile.role !== "admin")) {
    return { ok: false, error: "unauthorized" };
  }

  // Clasificación autoritativa recomputada en servidor desde las respuestas.
  const classification = deriveClassification(data.answers);

  const prov = await provisionCompany(supabase, {
    name: data.name,
    rut: data.rut,
    sectorCode: classification.sectorCode,
    sizeTier: classification.sizeTier,
    factors: classification.factors,
    contact: {
      name: data.contactName,
      email: data.contactEmail ?? null,
      phone: data.contactPhone ?? null,
    },
  });
  if (!prov.ok) return { ok: false, error: prov.error === "validation" ? "validation" : prov.error };

  const persisted = await persistDiagnosis(
    prov.companyId,
    data.answers,
    "consultant_assisted",
    user.id,
  );
  if (!persisted.ok) {
    console.error("[assisted-diagnosis] persistDiagnosis falló para company", prov.companyId);
    // La empresa ya se creó; el diagnóstico se puede re-persistir. No se aborta.
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "company.created_with_diagnosis",
    entity: "companies",
    entity_id: prov.companyId,
    detail: {
      source: "consultant_assisted",
      size_tier: classification.sizeTier,
      sector_code: classification.sectorCode,
      diagnosis_persisted: persisted.ok,
    } as never,
  });
  if (auditError) {
    console.error("[assisted-diagnosis] audit falló:", auditError.message);
  }

  redirect(`/app/companies/${prov.companyId}`);
}
```

> `provisionCompany` mapea `rutTaken`/`validation`/`unavailable`; se propagan tal cual (rutTaken → el flujo cliente muestra "RUT ya registrado"). `redirect` lanza `NEXT_REDIRECT` (comportamiento estándar de Next; no lo captures).

- [ ] **Step 2: Verificar typecheck y lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: sin errores; 0 warnings nuevos.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/assisted-diagnosis.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(diagnosis): createCompanyWithDiagnosis (alta + diagnóstico asistido del consultor)"
```

---

### Task 4: Reemplazar `/app/companies/new` por el flujo asistido

**Files:**
- Create: `components/companies/assisted-diagnosis-flow.tsx`
- Modify: `app/app/companies/new/page.tsx`
- Modify: los textos i18n de `app.companies` (mismo archivo donde ya viven; ver `getTranslations("app.companies.wizard")`).

**Interfaces:**
- Consumes: `DiagnosisQuestionnaire` (Task 2), `createCompanyWithDiagnosis` (Task 3), `identificationSchema` (`@/lib/companies/schema`).

- [ ] **Step 1: Componente del flujo consultor**

Create `components/companies/assisted-diagnosis-flow.tsx` (client): dos fases en estado local — `"identity"` y `"survey"`.
- Fase `identity`: formulario con razón social, RUT, nombre de contacto, correo y/o teléfono (reusa `Field`/`Input`/`Button` de `@/components/ui`; valida en cliente con `identificationSchema.safeParse` para UX, igual que `lead-form.tsx`). Botón "Continuar" → guarda la identidad en estado y pasa a `survey`.
- Fase `survey`: monta `<DiagnosisQuestionnaire renderComplete={({ result, answers }) => (...) } />`. En `renderComplete` muestra `DiagnosisResultPanel` (reusable) + un botón "Guardar diagnóstico" que, en un `useTransition`, llama `createCompanyWithDiagnosis({ ...identity, answers })`. Como la action hace `redirect` en éxito, no hay retorno feliz; si retorna `{ok:false}`, mapea el error a un aviso (rutTaken → "RUT ya registrado"; validation/unavailable/unauthorized → mensaje correspondiente). Usa `t(...)` para todos los textos (nuevas claves bajo `app.companies` / un namespace `app.assistedDiagnosis`).

> Reusa `DiagnosisResultPanel` de `@/components/self-assessment/diagnosis-result` para mostrar el panorama al consultor antes de guardar. No dupliques el panel.

- [ ] **Step 2: Reescribir la página**

Reescribe `app/app/companies/new/page.tsx` para renderizar `<AssistedDiagnosisFlow />` en lugar de `<NewCompanyWizard sectors={...} />`. Ya no necesita cargar el catálogo de `sectors` (la clasificación se deriva de la encuesta); quita esa carga y el estado `catalogEmpty`. Conserva `PageHeader` con los textos del alta.

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/shell";
import { AssistedDiagnosisFlow } from "@/components/companies/assisted-diagnosis-flow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.companies.meta");
  return { title: t("newTitle") };
}

export default async function NewCompanyPage() {
  const t = await getTranslations("app.companies.wizard");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <AssistedDiagnosisFlow />
    </>
  );
}
```

> `NewCompanyWizard` y `createCompany` quedan sin usar por esta ruta; NO los borres en #2 (se remueven en #8 junto con el resto de la maquinaria vieja). Verifica con grep que ninguna OTRA ruta los use antes de asumir que quedan huérfanos; si algo más los usa, déjalos.

- [ ] **Step 3: Claves i18n**

Añade las claves nuevas usadas por `AssistedDiagnosisFlow` (labels de identidad, botón "Guardar diagnóstico", mensajes de error rutTaken/validation/unavailable/unauthorized) en el archivo de mensajes de `app.companies` (localiza dónde viven las claves `app.companies.wizard.*` y agrega ahí, o crea `app.assistedDiagnosis.*`). Sin hardcodear strings.

- [ ] **Step 4: Verificar typecheck, lint y tests**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`
Expected: sin errores; 0 warnings nuevos; tests verdes.

- [ ] **Step 5: Commit**

```bash
git add components/companies/assisted-diagnosis-flow.tsx app/app/companies/new/page.tsx messages/
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(diagnosis): reemplazar /app/companies/new por el flujo de diagnóstico asistido"
```

---

### Task 5: E2E del flujo asistido (consultor)

**Files:**
- Create: `e2e/assisted-diagnosis.spec.ts` (ajusta a la carpeta E2E real; `playwright.config.ts` define `testDir`).

**Interfaces:**
- Consumes: dev server, Supabase local (migraciones del #1 aplicadas), y una **sesión de consultor** (usuario con fila en `profiles` rol consultant/admin — usa el seed de demo si lo provee, o crea uno).

- [ ] **Step 1: Escribir la E2E**

Inicia sesión como consultor, navega a `/app/companies/new`, completa la identidad (razón social, RUT válido único, contacto), responde la encuesta (tamaño micro, rubro salud, etc., como en el flujo público), pulsa "Guardar diagnóstico", y assert que redirige a `/app/companies/<id>`.

> Requiere un usuario consultor. Revisa `supabase/seeds/seed-demo.sql` por un consultor de demo y sus credenciales; si no existe uno con contraseña conocida, créalo en el setup del test (admin API) o documéntalo. Usa RUT distinto por corrida (unique).

- [ ] **Step 2: Ejecutar la E2E**

Run: `pnpm test:e2e assisted-diagnosis`
Expected: PASS.

- [ ] **Step 3: Verificación de datos**

Run: `docker exec supabase_db_kromi-dpc psql -U postgres -d postgres -c "select source, total_breaches, created_by is not null as by_consultant from public.company_diagnoses order by created_at desc limit 1;"`
Expected: `consultant_assisted | <n> | t`.

- [ ] **Step 4: Commit**

```bash
git add e2e/assisted-diagnosis.spec.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "test(e2e): flujo de diagnóstico asistido del consultor"
```

---

## Notas de verificación (convención del repo)

- **Lógica pura** (`deriveClassification`) → tests unitarios Vitest (Task 1).
- **Refactor del componente** (Task 2) → typecheck/lint + suite existente + el camino E2E público (post-pago) que ya ejercita el cuestionario.
- **Server action / flujo** (Tasks 3-4) → typecheck/lint + la E2E de consultor (Task 5). No se mockea Supabase (convención del repo).

## Fuera de alcance (recordatorio)

Entrevista vieja de `/app/companies/[id]/diagnosis` y maquinaria de `controls`/`interview_sessions` (#8); ver/editar brechas persistidas en `/app` (posterior); re-diagnóstico/recert; detalle cara al cliente (#3); remoción de lo viejo (#8).
