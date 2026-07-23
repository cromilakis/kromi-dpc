# Acceso al portal post-pago — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el prospecto público que paga el diagnóstico cree su cuenta antes de pagar y acceda a un portal (estados pago-pendiente / en-preparación / listo) al que puede volver cuando quiera.

**Architecture:** Registro antes de pagar: una server action pública (service-role) crea el usuario auth confirmado, provisiona la empresa (núcleo de `createCompany` extraído), enlaza `company_members` (active) y el lead (`self_assessments.company_id`), inicia sesión y abre Stripe Checkout. El webhook proyecta el pago en `companies.service_paid_at`. El portal deriva su estado de campos de `companies` expuestos por `company_client_view` (RLS del cliente).

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Auth admin API, Postgres, RLS), Zod, Stripe (Checkout hosted), Vitest, Playwright, next-intl.

## Global Constraints

- Gestor de paquetes: **pnpm**. Comandos: `pnpm test` (Vitest), `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test:e2e` (Playwright).
- Prosa en español; identificadores/código en inglés (CLAUDE.md).
- Validar entradas con **Zod en servidor**; nunca confiar en el cliente.
- **RLS** en datos de usuario; secretos fuera del cliente. La creación de usuarios auth y la provisión de empresa post-pago van con **`createAdminClient()`** (service-role, `lib/supabase/admin.ts`).
- Textos de UI **externalizados** (next-intl, `messages/es.json`); no hardcodear strings.
- **CLP zero-decimal** en Stripe: `unit_amount` en pesos sin ×100 (ya resuelto en `lib/self-assessment/pricing.ts`).
- Contraseña mínima **8 caracteres** (cliente + servidor, mismo schema).
- Identidad de commits: `Cromilakis <ipcromilakis@gmail.com>`; sin trailers `Co-Authored-By` ni atribuciones a Claude.
- Un-usuario-una-empresa: `company_members` tiene `unique(user_id)`.
- El estado real del pago lo fija **solo el webhook** verificado por firma; el redirect de retorno no es confiable.

---

### Task 1: Migración — vínculo lead↔empresa, flags de estado y vista

**Files:**
- Create: `supabase/migrations/20260712100000_post_pago_portal.sql`
- Modify: `lib/supabase/types.ts` (Row/Insert/Update de `companies` y `self_assessments`; la vista `company_client_view`)

**Interfaces:**
- Produces: columnas `self_assessments.company_id`, `companies.client_ready_at`, `companies.service_paid_at`, `companies.preliminary_panorama`; vista `company_client_view` con esas tres columnas de `companies` expuestas.

- [ ] **Step 1: Escribir la migración**

Create `supabase/migrations/20260712100000_post_pago_portal.sql`:

```sql
-- Acceso al portal post-pago: vincula el lead pagado con su empresa, proyecta
-- el estado de pago/preparación en companies (legible por el cliente vía la
-- vista) y guarda el panorama preliminar para mostrarlo en el portal.

alter table public.self_assessments
  add column if not exists company_id uuid references public.companies(id);
create index if not exists self_assessments_company_id_idx
  on public.self_assessments (company_id);

alter table public.companies
  add column if not exists service_paid_at    timestamptz,
  add column if not exists client_ready_at    timestamptz,
  add column if not exists preliminary_panorama jsonb;

comment on column public.companies.service_paid_at is
  'Fijado por el webhook de Stripe cuando el lead público vinculado paga. Proyección legible por el cliente de self_assessments.payment_status.';
comment on column public.companies.client_ready_at is
  'Lo activa el consultor cuando el diagnóstico completo y la propuesta están publicados (estado portal: en-preparación -> listo).';
comment on column public.companies.preliminary_panorama is
  'Panorama preliminar del autodiagnóstico (nivel, N.º hallazgos, áreas/severidades) para mostrarlo en el portal bajo RLS del cliente.';

-- Recrear la vista del cliente para exponer los tres campos nuevos. Mantiene
-- la exclusión de complexity_score y notes (definición previa en
-- 20260706101000_client_rls.sql). Copiar EXACTAMENTE las columnas de esa vista
-- y añadir las tres nuevas antes de recrearla.
drop view if exists public.company_client_view;
create view public.company_client_view
with (security_invoker = true) as
  select
    id, name, rut, sector_id, size_tier, phase, factors, contact, created_at,
    service_paid_at, client_ready_at, preliminary_panorama
  from public.companies
  where id = public.current_company_id();

grant select on public.company_client_view to authenticated;
```

> Antes de escribir el `select`, abre `supabase/migrations/20260706101000_client_rls.sql`, localiza la definición vigente de `company_client_view` y copia su lista de columnas EXACTA (la de arriba es la esperada; ajústala si difiere). No inventes columnas.

- [ ] **Step 2: Aplicar y verificar el esquema**

Run: `supabase db reset`
Expected: termina con "Finished supabase db reset" e incluye "Applying migration 20260712100000_post_pago_portal.sql".

Run: `docker exec supabase_db_kromi-kpc psql -U postgres -d postgres -c "select column_name from information_schema.columns where table_name='companies' and column_name in ('service_paid_at','client_ready_at','preliminary_panorama') order by 1;"`
Expected: 3 filas (client_ready_at, preliminary_panorama, service_paid_at).

Run: `docker exec supabase_db_kromi-kpc psql -U postgres -d postgres -c "select column_name from information_schema.columns where table_name='company_client_view' and column_name in ('service_paid_at','client_ready_at','preliminary_panorama') order by 1;"`
Expected: 3 filas.

- [ ] **Step 3: Actualizar los tipos generados a mano**

En `lib/supabase/types.ts`, en `self_assessments` (Row/Insert/Update) añade `company_id: string | null` (Row) y `company_id?: string | null` (Insert/Update). En `companies` (Row/Insert/Update) añade `service_paid_at`, `client_ready_at` (`string | null`) y `preliminary_panorama` (`Json | null`). Busca la definición de `company_client_view` en `Views` y añade las mismas tres columnas a su `Row`.

- [ ] **Step 4: Verificar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260712100000_post_pago_portal.sql lib/supabase/types.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(portal): esquema para acceso post-pago (vínculo lead-empresa, flags de estado, vista)"
```

---

### Task 2: Panorama preliminar serializable (función pura + tests)

**Files:**
- Create: `lib/self-assessment/panorama.ts`
- Test: `test/panorama.test.ts`

**Interfaces:**
- Consumes: `FullDiagnosisResult` y `groupBreachesByAreaSeverity` de `@/lib/legal`.
- Produces: `type PreliminaryPanorama = { riskLevel: RiskLevel; totalBreaches: number; areas: { areaLabel: string; severity: Severity; count: number }[] }` y `buildPreliminaryPanorama(result: FullDiagnosisResult): PreliminaryPanorama`.

- [ ] **Step 1: Escribir el test que falla**

Create `test/panorama.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPreliminaryPanorama } from "../lib/self-assessment/panorama";
import type { FullDiagnosisResult } from "../lib/legal";

const result = {
  riskLevel: "alto",
  totalBreaches: 3,
  breaches: [
    { area: "consent", areaLabel: "Consentimiento", severity: "critico" },
    { area: "salud", areaLabel: "Datos de salud", severity: "critico" },
    { area: "conservacion", areaLabel: "Conservación", severity: "medio" },
  ],
} as unknown as FullDiagnosisResult;

describe("buildPreliminaryPanorama", () => {
  it("resume nivel, total y áreas agrupadas por severidad", () => {
    const p = buildPreliminaryPanorama(result);
    expect(p.riskLevel).toBe("alto");
    expect(p.totalBreaches).toBe(3);
    expect(p.areas.length).toBeGreaterThan(0);
    expect(p.areas[0]).toHaveProperty("areaLabel");
    expect(p.areas[0]).toHaveProperty("severity");
    expect(p.areas[0]).toHaveProperty("count");
  });

  it("es serializable a JSON sin pérdida", () => {
    const p = buildPreliminaryPanorama(result);
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `pnpm test panorama`
Expected: FAIL ("buildPreliminaryPanorama is not a function" / módulo no encontrado).

- [ ] **Step 3: Implementar la función**

Create `lib/self-assessment/panorama.ts`:

```ts
import {
  groupBreachesByAreaSeverity,
  type FullDiagnosisResult,
  type RiskLevel,
  type Severity,
} from "@/lib/legal";

/**
 * Resumen serializable del panorama preliminar para persistir y mostrar en el
 * portal (estado "en preparación"). No incluye texto libre del usuario ni
 * detalle interno: solo nivel, total y áreas agrupadas por severidad.
 */
export interface PreliminaryPanorama {
  riskLevel: RiskLevel;
  totalBreaches: number;
  areas: { areaLabel: string; severity: Severity; count: number }[];
}

export function buildPreliminaryPanorama(
  result: FullDiagnosisResult,
): PreliminaryPanorama {
  const groups = groupBreachesByAreaSeverity(result.breaches);
  return {
    riskLevel: result.riskLevel,
    totalBreaches: result.totalBreaches,
    areas: groups.map((g) => ({
      areaLabel: g.areaLabel,
      severity: g.severity,
      count: g.count,
    })),
  };
}
```

> Verifica en `lib/legal` la forma exacta de lo que devuelve `groupBreachesByAreaSeverity` (en `components/self-assessment/diagnosis-result.tsx` se usa como `{ area, areaLabel, severity, count }`). Ajusta los nombres de campo si difieren.

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `pnpm test panorama`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/self-assessment/panorama.ts test/panorama.test.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(self-assessment): panorama preliminar serializable para el portal"
```

---

### Task 3: Schema de registro con contraseña (función pura + tests)

**Files:**
- Modify: `lib/self-assessment/lead-schema.ts`
- Test: `test/diagnosis-lead.test.ts` (añadir casos)

**Interfaces:**
- Consumes: `diagnosisLeadSchema` existente.
- Produces: `registrationLeadSchema` (= `diagnosisLeadSchema` + `password: string (min 8, max 200)` + `panorama` opcional) y `type RegistrationLeadInput`.

- [ ] **Step 1: Escribir los tests que fallan**

Añade a `test/diagnosis-lead.test.ts`:

```ts
import { registrationLeadSchema } from "../lib/self-assessment/lead-schema";

describe("registrationLeadSchema", () => {
  const base = {
    name: "Clínica Demo SpA",
    rut: "76.086.428-5",
    contactName: "María Pérez",
    contactEmail: "maria@clinicademo.cl",
    sectorCode: "salud",
    sizeTier: "micro" as const,
    factors: ["sensitive_data"],
    diagnosis: { riskLevel: "critico" as const, totalBreaches: 9 },
    password: "supersecreta",
  };

  it("acepta un registro válido con contraseña", () => {
    expect(registrationLeadSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza contraseña de menos de 8 caracteres", () => {
    expect(registrationLeadSchema.safeParse({ ...base, password: "1234567" }).success).toBe(false);
  });

  it("rechaza cuando falta la contraseña", () => {
    const { password, ...rest } = base;
    void password;
    expect(registrationLeadSchema.safeParse(rest).success).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `pnpm test diagnosis-lead`
Expected: FAIL ("registrationLeadSchema is not exported").

- [ ] **Step 3: Implementar el schema**

En `lib/self-assessment/lead-schema.ts`, tras `diagnosisLeadSchema`, añade:

```ts
/**
 * Registro del embudo público de pago: los MISMOS datos del lead + contraseña
 * para crear la cuenta antes de pagar. `panorama` (opcional) viaja para
 * persistir el resumen visible en el portal; se valida laxo (jsonb).
 */
export const registrationLeadSchema = z
  .strictObject({
    ...identificationSchema.shape,
    ...classificationSchema.shape,
    ...complexitySchema.shape,
    diagnosis: z.strictObject({
      riskLevel: z.enum(DIAGNOSIS_RISK_LEVELS),
      totalBreaches: z.number().int().min(0).max(1000),
    }),
    password: z.string().min(8).max(200),
    panorama: z.unknown().optional(),
    website: z.string().max(200).optional(),
  })
  .refine((data) => Boolean(data.contactEmail || data.contactPhone), {
    message: "contact_required",
    path: ["contactEmail"],
  })
  .refine((data) => !isDummyRut(data.rut), { message: "dummy_rut", path: ["rut"] });

export type RegistrationLeadInput = z.infer<typeof registrationLeadSchema>;
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `pnpm test diagnosis-lead`
Expected: PASS (todos, incluidos los nuevos).

- [ ] **Step 5: Commit**

```bash
git add lib/self-assessment/lead-schema.ts test/diagnosis-lead.test.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(self-assessment): schema de registro con contraseña"
```

---

### Task 4: Estado del portal (función pura + tests)

**Files:**
- Create: `lib/portal/service-state.ts`
- Test: `test/portal-service-state.test.ts`

**Interfaces:**
- Produces: `type PortalServiceState = "pending" | "preparing" | "ready"` y `portalServiceState(input: { servicePaidAt: string | null; clientReadyAt: string | null }): PortalServiceState`.

- [ ] **Step 1: Escribir el test que falla**

Create `test/portal-service-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { portalServiceState } from "../lib/portal/service-state";

describe("portalServiceState", () => {
  it("sin pago => pending", () => {
    expect(portalServiceState({ servicePaidAt: null, clientReadyAt: null })).toBe("pending");
  });
  it("pagado sin publicar => preparing", () => {
    expect(portalServiceState({ servicePaidAt: "2026-07-12T00:00:00Z", clientReadyAt: null })).toBe("preparing");
  });
  it("pagado y publicado => ready", () => {
    expect(
      portalServiceState({ servicePaidAt: "2026-07-12T00:00:00Z", clientReadyAt: "2026-07-13T00:00:00Z" }),
    ).toBe("ready");
  });
  it("publicado sin pago (caso consultor manual) => ready", () => {
    expect(portalServiceState({ servicePaidAt: null, clientReadyAt: "2026-07-13T00:00:00Z" })).toBe("ready");
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm test portal-service-state`
Expected: FAIL (módulo no encontrado).

- [ ] **Step 3: Implementar**

Create `lib/portal/service-state.ts`:

```ts
export type PortalServiceState = "pending" | "preparing" | "ready";

/**
 * Estado del servicio en el portal del cliente:
 * - ready: el equipo publicó el trabajo (client_ready_at) — prima sobre todo,
 *   así el portal del cliente que YA fue provisionado por un consultor (sin
 *   pago público) también muestra su dashboard.
 * - preparing: pagó (service_paid_at) pero aún no se publica.
 * - pending: no ha pagado.
 */
export function portalServiceState(input: {
  servicePaidAt: string | null;
  clientReadyAt: string | null;
}): PortalServiceState {
  if (input.clientReadyAt) return "ready";
  if (input.servicePaidAt) return "preparing";
  return "pending";
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm test portal-service-state`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/portal/service-state.ts test/portal-service-state.test.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(portal): función de estado del servicio (pending/preparing/ready)"
```

---

### Task 5: Extraer la provisión de empresa reutilizable (service-role)

**Files:**
- Modify: `lib/actions/companies.ts`
- Create: `lib/companies/provision.server.ts`

**Interfaces:**
- Produces: `provisionCompany(client, params): Promise<{ ok: true; companyId: string } | { ok: false; error: "rutTaken" | "validation" | "unavailable" }>` donde `client` es un cliente Supabase (autenticado o admin) y `params = { name; rut; sectorCode; sizeTier; factors; contact: { name; email; phone }; preliminaryPanorama?: unknown }`.
- Consumes: `computeCompanyScore` (`lib/companies/scoring.server.ts`), `formatRut`.

- [ ] **Step 1: Extraer el núcleo a `provision.server.ts`**

Create `lib/companies/provision.server.ts` con la lógica HOY embebida en `createCompany` (líneas ~61-150 de `lib/actions/companies.ts`): lookup de sector, insert de `companies` (añadiendo `preliminary_panorama: params.preliminaryPanorama ?? null`), lookup de `controls`, insert de `assessments` (cycle 1) e insert de `assessment_controls`. Firma:

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatRut } from "@/lib/companies/rut";
import { computeCompanyScore } from "@/lib/companies/scoring.server";
import type { ComplexityFactor, SizeTier } from "@/lib/companies/schema";
import type { Database } from "@/lib/supabase/types";

const PG_UNIQUE_VIOLATION = "23505";

export interface ProvisionCompanyParams {
  name: string;
  rut: string;
  sectorCode: string;
  sizeTier: SizeTier;
  factors: ComplexityFactor[];
  contact: { name: string; email: string | null; phone: string | null };
  preliminaryPanorama?: unknown;
}

export type ProvisionCompanyResult =
  | { ok: true; companyId: string }
  | { ok: false; error: "rutTaken" | "validation" | "unavailable" };

/** Inserta empresa + evaluación ciclo 1 + assessment_controls pending. Acepta
 *  cliente autenticado (consultor, RLS) o admin (service-role, flujo público). */
export async function provisionCompany(
  client: SupabaseClient<Database>,
  params: ProvisionCompanyParams,
): Promise<ProvisionCompanyResult> {
  // ... mover aquí el cuerpo actual (sector lookup -> insert company ->
  // controls -> assessment -> assessment_controls), devolviendo companyId.
  // El insert de companies añade: preliminary_panorama: params.preliminaryPanorama ?? null.
}
```

> Copia el cuerpo real desde `createCompany`; no reimplementes de memoria. El `audit_log` y el `redirect` NO van aquí (quedan en `createCompany`, que sí tiene sesión/actor).

- [ ] **Step 2: Reescribir `createCompany` para usar el núcleo**

En `lib/actions/companies.ts`, `createCompany` conserva: parse Zod, `getUser()`, y luego llama `provisionCompany(supabase, {...data, contact})`; mapea el error (`rutTaken`/`validation`/`unavailable`) a su `CreateCompanyResult`, escribe `audit_log` con el `companyId` devuelto y hace `redirect`. Elimina el código duplicado que se movió.

- [ ] **Step 3: Verificar typecheck y tests existentes**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.

Run: `pnpm test`
Expected: PASS (todos; `test/companies.test.ts` del scoring sigue verde).

- [ ] **Step 4: Verificar el alta de consultor sigue funcionando (humo)**

Run: `pnpm lint`
Expected: 0 errores.

(La verificación funcional del alta de consultor se cubre en la E2E existente / manual; este refactor no cambia su comportamiento.)

- [ ] **Step 5: Commit**

```bash
git add lib/companies/provision.server.ts lib/actions/companies.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "refactor(companies): extraer provisionCompany reutilizable (service-role)"
```

---

### Task 6: Server action `registerAndStartCheckout`

**Files:**
- Modify: `lib/actions/self-assessment.ts`

**Interfaces:**
- Consumes: `registrationLeadSchema`, `provisionCompany`, `createAdminClient`, `createClient` (server, para iniciar sesión), `computeServiceUf`/`serviceChargeClp`, el armado de Checkout de `startDiagnosisCheckout`.
- Produces: `registerAndStartCheckout(input: unknown): Promise<{ ok: true; url: string } | { ok: false; error: "validation" | "account_exists" | "disabled" | "unavailable" }>`. Supersede a `startDiagnosisCheckout` para micro/pequeña (enterprise sigue con `submitDiagnosisLead`).

- [ ] **Step 1: Implementar la action**

En `lib/actions/self-assessment.ts` añade `registerAndStartCheckout`. Orden (todo con `createAdminClient()` salvo el sign-in):

```ts
export type RegisterAndStartCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: "validation" | "account_exists" | "disabled" | "unavailable" };

export async function registerAndStartCheckout(
  input: unknown,
): Promise<RegisterAndStartCheckoutResult> {
  const parsed = registrationLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const data = parsed.data;
  if (data.website) return { ok: false, error: "validation" }; // honeypot
  if (data.sizeTier === "enterprise") return { ok: false, error: "validation" };

  const amountClp = serviceChargeClp(computeServiceUf(data.sizeTier, data.factors));

  try {
    const admin = createAdminClient();

    // 1) Usuario auth confirmado. Si el email ya existe -> account_exists.
    const created = await admin.auth.admin.createUser({
      email: data.contactEmail!, // contacto mínimo garantiza email o teléfono;
      password: data.password,    // para registro exigimos email (ver Step 2).
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      const exists =
        created.error?.code === "email_exists" ||
        /already.*registered|exists/i.test(created.error?.message ?? "");
      if (exists) return { ok: false, error: "account_exists" };
      console.error("[register] createUser falló:", created.error?.message);
      return { ok: false, error: "unavailable" };
    }
    const authUserId = created.data.user.id;

    // 2) Provisiona la empresa (service-role).
    const prov = await provisionCompany(admin, {
      name: data.name, rut: data.rut, sectorCode: data.sectorCode,
      sizeTier: data.sizeTier, factors: [...data.factors],
      contact: { name: data.contactName, email: data.contactEmail ?? null, phone: data.contactPhone ?? null },
      preliminaryPanorama: data.panorama ?? null,
    });
    if (!prov.ok) {
      console.error("[register] provisionCompany falló:", prov.error);
      return { ok: false, error: prov.error === "rutTaken" ? "unavailable" : prov.error };
    }

    // 3) company_members active (sin invited_by: no hay consultor).
    const { error: memberError } = await admin.from("company_members").insert({
      user_id: authUserId, company_id: prov.companyId, invited_by: null, status: "active",
    });
    if (memberError) { console.error("[register] company_members:", memberError.message); return { ok: false, error: "unavailable" }; }

    // 4) Inserta el lead vinculado (reusa buildLeadRow + company_id + amount).
    const { data: lead, error: leadError } = await admin
      .from("self_assessments")
      .insert({ ...buildLeadRow(data), amount_clp: amountClp, company_id: prov.companyId })
      .select("id").single();
    if (leadError || !lead) { console.error("[register] lead:", leadError?.message); return { ok: false, error: "unavailable" }; }

    // 5) Inicia sesión (cookies) con el cliente server.
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.contactEmail!, password: data.password,
    });
    if (signInError) console.warn("[register] auto sign-in falló:", signInError.message);
    // (no bloqueante: el usuario podrá iniciar sesión manualmente igual.)

    // 6) Checkout Session (mismo armado que startDiagnosisCheckout).
    let stripe;
    try { stripe = getStripe(); }
    catch (cause) { if (cause instanceof StripeError) return { ok: false, error: "disabled" }; throw cause; }
    const origin = await resolveOrigin();
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price_data: { currency: "clp", product_data: { name: `Servicio KPC — ${data.name}`, description: "Diagnóstico completo + propuesta de mitigación + certificación (IVA incluido)." }, unit_amount: amountClp }, quantity: 1 }],
        customer_email: data.contactEmail ?? undefined,
        metadata: { kind: "diagnosis_lead", lead_id: lead.id },
        success_url: `${origin}/portal`,
        cancel_url: `${origin}/portal`,
      });
    } catch (cause) { console.error("[register] checkout:", cause); return { ok: false, error: "unavailable" }; }
    if (!session.url) return { ok: false, error: "unavailable" };

    await admin.from("self_assessments").update({ stripe_session_id: session.id }).eq("id", lead.id);
    return { ok: true, url: session.url };
  } catch (cause) {
    console.error("[register] registerAndStartCheckout no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
```

> `success_url`/`cancel_url` ahora apuntan a `/portal` (el usuario ya quedó logueado). El portal muestra el estado según `service_paid_at`.

- [ ] **Step 2: Exigir email en el registro**

El registro necesita email (es la identidad de la cuenta). En `components/self-assessment/lead-form.tsx` (Task 8) el correo pasa a ser obligatorio cuando `paysOnline`. En la action, si `!data.contactEmail`, devuelve `{ ok: false, error: "validation" }` antes del paso 1.

- [ ] **Step 3: Verificar typecheck y lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: sin errores; 0 warnings nuevos en el archivo.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/self-assessment.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(self-assessment): registerAndStartCheckout (registro antes de pagar)"
```

---

### Task 7: Webhook — proyectar el pago en `companies.service_paid_at`

**Files:**
- Modify: `app/api/stripe/webhook/route.ts`

**Interfaces:**
- Consumes: `reconcileDiagnosisLead(session, event)` existente.
- Produces: tras marcar `self_assessments.payment_status='paid'`, si la fila tiene `company_id`, setea `companies.service_paid_at = now()`.

- [ ] **Step 1: Ampliar `reconcileDiagnosisLead`**

En `reconcileDiagnosisLead`, cambia el `.update(...).select("id")` a `.select("id, company_id")` y, si `updated.company_id`, añade:

```ts
if (updated.company_id) {
  const { error: companyError } = await admin
    .from("companies")
    .update({ service_paid_at: new Date().toISOString() })
    .eq("id", updated.company_id)
    .is("service_paid_at", null); // idempotente
  if (companyError) {
    console.error(`[stripe-webhook] proyectar service_paid_at (company=${updated.company_id}) falló:`, companyError.message);
  }
}
```

> `new Date().toISOString()` es válido aquí (route handler runtime), no es un script de workflow.

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(webhook): proyectar el pago del lead en companies.service_paid_at"
```

---

### Task 8: Formulario — campo de contraseña y llamada al registro

**Files:**
- Modify: `components/self-assessment/lead-form.tsx`
- Modify: `messages/es.json`

**Interfaces:**
- Consumes: `registerAndStartCheckout`.
- Produces: el formulario recoge contraseña (cuando `paysOnline`), hace el correo obligatorio, y en `submit()` llama a `registerAndStartCheckout` (en vez de `startDiagnosisCheckout`) para micro/pequeña.

- [ ] **Step 1: Añadir estado y campo de contraseña**

En `lead-form.tsx`: `const [password, setPassword] = useState("")`. Añade el `<Field>` de contraseña (input `type="password"`, `autoComplete="new-password"`) dentro del grupo de contacto, visible solo cuando `paysOnline`. Añade claves i18n `diagnosis.lead.form.passwordLabel`, `passwordPlaceholder`, `passwordHint` ("Con esta contraseña entrarás a tu portal") y `form.errors.password` ("Elige una contraseña de al menos 8 caracteres.") en `messages/es.json`.

- [ ] **Step 2: Correo obligatorio + validación de contraseña cuando `paysOnline`**

En `validateForm()`: si `paysOnline`, exige `contactEmail` (marca `errors.contactEmail`) y `password.length >= 8` (marca `errors.password`). Añade `"password"` al tipo `ErrorField`.

- [ ] **Step 3: Llamar al registro en `submit()`**

En `submit()`, rama `paysOnline`: construir `panorama` con `buildPreliminaryPanorama(result)` (el `result` ya viene por props desde el wizard; si no, pásalo como prop nueva `panorama`) y llamar:

```ts
const res = await registerAndStartCheckout({ ...payload, password, panorama });
if (res.ok) { window.location.href = res.url; return; }
if (res.error === "account_exists") { setFieldErrors((p) => ({ ...p, contactEmail: true })); setSubmitError(true); /* mostrar mensaje "ya tienes cuenta, inicia sesión" */ return; }
if (res.error === "disabled") { setPhase("done"); return; }
setSubmitError(true);
```

Añade una clave i18n para el mensaje `account_exists` ("Ya existe una cuenta con ese correo. Inicia sesión para continuar.").

> El `payload` ya no necesita ir por `startDiagnosisCheckout`. `buildPreliminaryPanorama` requiere el `FullDiagnosisResult`: pásalo del wizard a `DiagnosisLeadForm` como prop `panorama` ya calculada (para no importar lógica de `lib/legal` en el form).

- [ ] **Step 4: Verificar typecheck, lint y build de tipos i18n**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add components/self-assessment/lead-form.tsx components/self-assessment/diagnosis-wizard.tsx messages/es.json
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(self-assessment): contraseña en el formulario y registro antes de pagar"
```

---

### Task 9: Portal — estados A/B/C, panorama y re-pago

**Files:**
- Modify: `lib/portal/load-dashboard.server.ts`
- Modify: `app/portal/page.tsx`
- Create: `components/portal/service-status.tsx`
- Modify: `lib/actions/self-assessment.ts` (acción `resumeDiagnosisCheckout`)
- Modify: `messages/es.json`

**Interfaces:**
- Consumes: `portalServiceState`, `company_client_view` con `service_paid_at`/`client_ready_at`/`preliminary_panorama`.
- Produces: `resumeDiagnosisCheckout(): Promise<{ ok: true; url: string } | { ok: false; error: ... }>` (re-pago del lead ya existente del cliente autenticado); el portal renderiza estado A (pago pendiente + botón de pago), B (pagado, en preparación + panorama), C (dashboard actual).

- [ ] **Step 1: Ampliar el loader**

En `ClientDashboard` añade `servicePaidAt: string | null; clientReadyAt: string | null; panorama: PreliminaryPanorama | null`. En `loadClientDashboard`, del `select("*")` de `company_client_view` toma `service_paid_at`, `client_ready_at`, `preliminary_panorama` y mapéalos (castea el jsonb a `PreliminaryPanorama`).

- [ ] **Step 2: Acción de re-pago**

En `lib/actions/self-assessment.ts`, `resumeDiagnosisCheckout`: cliente autenticado → `current_company_id()` implícito; lee `self_assessments` por `company_id` (con `createAdminClient`, porque el cliente no tiene SELECT sobre el lead) del usuario — para obtenerlo, primero resuelve la company del usuario vía `company_client_view` (cliente autenticado), luego con admin busca el lead por `company_id`, crea una nueva Checkout Session (mismo armado, `success_url`/`cancel_url` a `/portal`), actualiza `stripe_session_id` y devuelve `url`. No inserta lead nuevo.

- [ ] **Step 3: Componente de estado + render**

Create `components/portal/service-status.tsx` que reciba `state: PortalServiceState`, `panorama` y renderice: A) aviso "completa tu pago" + `<form>`/botón que invoca `resumeDiagnosisCheckout` (client component con `useTransition`, `window.location.href = url`); B) aviso "pago recibido / en preparación" + tabla del panorama (áreas/severidad/count, reutilizando estilos de `diagnosis-result.tsx`). En `app/portal/page.tsx`: calcula `const state = portalServiceState({ servicePaidAt, clientReadyAt })`; si `state !== "ready"` renderiza `<ServiceStatus>` en vez del dashboard (certificado/progreso/propuesta/evidencias); si `ready`, el dashboard actual. Añade claves i18n bajo `portal.service` (`pendingTitle`, `pendingBody`, `payButton`, `preparingTitle`, `preparingBody`, `panoramaTitle`, etc.).

- [ ] **Step 4: Verificar typecheck y lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add lib/portal/load-dashboard.server.ts app/portal/page.tsx components/portal/service-status.tsx lib/actions/self-assessment.ts messages/es.json
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "feat(portal): estados pago-pendiente/en-preparación/listo + panorama + re-pago"
```

---

### Task 10: E2E — registro → pago → portal

**Files:**
- Create: `e2e/post-pago-portal.spec.ts` (ajusta la carpeta E2E real del repo; ver `playwright.config`)

**Interfaces:**
- Consumes: dev server en `:3000`, Supabase local con la migración aplicada, `stripe listen` reenviando a `/api/stripe/webhook`, `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` de test.

- [ ] **Step 1: Escribir el test E2E**

Recorre: `/self-assessment` → responder un diagnóstico micro (tamaño "1 a 2 personas", rubro Salud, etc.) → resultado → "Continuar" → completar razón social, RUT válido (`76.086.428-5`), contacto, **contraseña** → "Pagar ahora" → en Stripe Checkout (test) pagar con `4242 4242 4242 4242` → assert redirección a `/portal` mostrando estado "en preparación" con el panorama. Segundo caso: cerrar sesión, volver a `/login`, iniciar con el email+contraseña, assert que entra al portal.

> Usa RUTs distintos por corrida (el `unique(companies.rut)` rechaza repetidos): parametriza el RUT o limpia la fila entre corridas. Documenta que requiere `stripe listen` activo.

- [ ] **Step 2: Ejecutar la E2E**

Run: `pnpm test:e2e post-pago-portal`
Expected: PASS (ambos casos).

- [ ] **Step 3: Verificación de datos (webhook)**

Run: `docker exec supabase_db_kromi-kpc psql -U postgres -d postgres -c "select payment_status, company_id is not null as linked from public.self_assessments order by created_at desc limit 1;"`
Expected: `paid | t`.

Run: `docker exec supabase_db_kromi-kpc psql -U postgres -d postgres -c "select service_paid_at is not null as paid from public.companies order by created_at desc limit 1;"`
Expected: `t`.

- [ ] **Step 4: Commit**

```bash
git add e2e/post-pago-portal.spec.ts
git -c user.name="Cromilakis" -c user.email="ipcromilakis@gmail.com" commit -m "test(e2e): flujo registro -> pago -> portal post-pago"
```

---

## Notas de verificación (convención del repo)

- **Lógica pura** (panorama, schema, estado del portal) → tests unitarios Vitest (TDD arriba).
- **Server actions / provisión / auth / webhook** → NO se mockea Supabase (el repo no lo hace); se verifican con la **E2E de Playwright** (Task 10) + typecheck/lint. Por eso esas tareas no llevan test unitario propio.
- Tras la Task 10, correr la suite completa: `pnpm test` (unit) y `pnpm test:e2e` (flujo).

## Fuera de alcance (recordatorio)

- Vista detallada del plan de mitigación para el cliente (spec aparte).
- Generación automática del diagnóstico completo sin equipo.
- Activar `client_ready_at` desde `/app` (control del consultor): es un botón simple en la ficha de empresa; puede entrar en este plan como sub-tarea de Task 9 si se desea, o en el spec del panel del consultor.
