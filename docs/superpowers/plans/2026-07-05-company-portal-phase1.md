# Fase 1 — Portal del cliente: dashboard de cumplimiento — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Pasos con checkbox (`- [ ]`).

**Goal:** Reemplazar el placeholder de `/portal` por un dashboard de solo lectura donde la empresa cliente ve el estado de su certificación (vigente/por vencer/vencida), su avance de cumplimiento y un enlace verificable a su certificado. Todo por RLS del cliente (Fase 0), sin datos internos.

**Architecture:** Server components bajo `/portal` que leen con el cliente AUTENTICADO las tablas ya expuestas por las policies del cliente (Fase 0): `company_client_view` (empresa), `certificates` (client_select), `assessment_controls`+`assessments` (client_select). Un helper puro deriva el "estado" del certificado desde `status` + `valid_until`. El avance reusa `checklistProgress` (ya excluye `not_applicable`).

**Tech Stack:** Next.js 16 (RSC), TypeScript, next-intl, Supabase (RLS del cliente), Vitest.

**Relacionado:** spec épica `2026-07-05-company-accounts-portal-design.md`; fundación en `2026-07-05-company-accounts-phase0.md` (ya mergeada).

## Global Constraints

- **Solo lectura y solo lo del cliente:** el portal lee con el cliente autenticado; RLS ya garantiza el aislamiento (Fase 0, `pnpm test:rls`). No exponer `complexity_score`/`factors`/`audit_log` (la vista/policies ya lo impiden; no leer tablas internas).
- **Columna real:** el vencimiento del certificado es `certificates.valid_until` (date), NO `expires_at`. Estados en `certificate_status`: `active|expired|revoked`.
- **Reusar, no reinventar:** `checklistProgress` (`lib/companies/display.ts`), `StatusBadge`/`ProgressBar`/`Card` del kit, y el patrón del shell `/portal` (Fase 0). El verificador público ya vive en `/verify/[code]`.
- **i18n** namespace `portal` (`messages/app/portal.json`); prosa español, código inglés.
- **Tailwind spacing:** solo tokens definidos (4,8,12,16,20,24,28,32,36,40,44,48,60,80,100,120) o arbitrarios en px; nunca `-6/-10/-14` sueltos. Botones/enlaces con `cursor-pointer`.
- **No romper:** consultor (`/app`) y `pnpm test`/`test:rls` siguen verdes.

---

### Task 1: Loader del dashboard + helper de estado del certificado

**Files:**
- Create: `lib/portal/certificate-status.ts` (helper puro)
- Create: `lib/portal/load-dashboard.server.ts` (carga con el cliente autenticado)
- Test: `test/portal/certificate-status.test.ts`

**Interfaces (Produces):**
- `type CertStanding = "vigente" | "por_vencer" | "vencida" | "revocada" | "sin_certificado"`.
- `certificateStanding(cert: { status: string; valid_until: string } | null, today: string): CertStanding` — puro: null → `sin_certificado`; status `revoked` → `revocada`; status `expired` o `valid_until < today` → `vencida`; si faltan ≤ 60 días para `valid_until` → `por_vencer`; si no → `vigente`. (El umbral 60 días es constante nombrada `EXPIRY_WARNING_DAYS`.)
- `loadClientDashboard(): Promise<{ company: {...}; cert: {...}|null; progress: { evaluated: number; total: number; pct: number } }>` — server-only, usa `createClient()` (cliente autenticado): lee `company_client_view` (maybeSingle), el `certificates` más reciente por `issued_at` (client RLS lo filtra a su empresa), y los `assessment_controls` de su assessment abierto (client RLS) → `checklistProgress(statuses)`. No recibe companyId: el RLS + `current_company_id()` ya acota.

- [ ] **Step 1: Test del helper** — casos: null→sin_certificado; revoked→revocada; valid_until pasado→vencida; status expired→vencida; a 30 días→por_vencer; a 200 días→vigente. (Pasar `today` fijo, sin `Date.now()` en el test.)
- [ ] **Step 2: Correr y ver fallar.**
- [ ] **Step 3: Implementar** `certificate-status.ts` y `load-dashboard.server.ts` (mira `lib/certificates/load-eligibility.server.ts` para el patrón de lectura con el cliente autenticado y el join a assessments).
- [ ] **Step 4: Correr** test → PASS. `pnpm typecheck` → OK.
- [ ] **Step 5: Commit** — `feat(portal): loader del dashboard + estado del certificado`

---

### Task 2: UI del dashboard en `/portal`

**Files:**
- Modify: `app/portal/page.tsx` (reemplaza el placeholder)
- Modify: `messages/app/portal.json`
- (posible) Create: `components/portal/*` si conviene extraer tarjetas

**Interfaces:** consume `loadClientDashboard()` + `certificateStanding()`.

Contenido del dashboard (solo lectura):
- **Tarjeta "Estado de tu certificación"**: `StatusBadge` según `CertStanding` (vigente=positive, por_vencer=warning, vencida/revocada=negative, sin_certificado=neutral) + fechas (`issued_at`, `valid_until`) + código del certificado + enlace "Verificar en línea" a `/verify/{code}` (target público). Si `sin_certificado`: mensaje "Aún no tienes un certificado emitido".
- **Tarjeta "Avance de cumplimiento"**: `ProgressBar` con `progress.pct` (+ "{evaluated}/{total} controles evaluados"). Copy que aclare que es sobre los controles aplicables a su empresa.
- Encabezado con el nombre de la empresa (de `company_client_view`).

- [ ] **Step 1: i18n** — claves `portal.dashboard.*` (títulos de tarjetas, estados de certificado legibles, "Verificar en línea", "evaluados/total", "sin certificado", etc.).
- [ ] **Step 2: Implementar** `app/portal/page.tsx` como server component que llama `loadClientDashboard()` y renderiza las tarjetas (reusa `Card`/`StatusBadge`/`ProgressBar`; respeta spacing tokens).
- [ ] **Step 3: typecheck + build** → OK. `pnpm test`/`test:rls` verdes.
- [ ] **Step 4: E2E click-through (manual, lo hace el orquestador):** crear cliente + empresa con un certificado y controles evaluados vía SQL/admin; login como cliente → dashboard muestra estado correcto + avance + enlace verify; confirmar aislamiento (no ve otra empresa). Screenshot.
- [ ] **Step 5: Commit** — `feat(portal): dashboard de cumplimiento del cliente`

---

## Self-review

- **Cobertura del spec (Fase 1):** estado de certificación + avance + certificado verificable, todo por RLS del cliente. ✓
- **Reuso:** `checklistProgress`, kit UI, `/verify/[code]`, shell de Fase 0. ✓
- **Sin placeholders:** helper con reglas concretas + loader con fuentes concretas; UI con mapa de estados→variante. ✓
- **Columna correcta:** `valid_until` (no expires_at). ✓

## Handoff

Ejecutar con **subagent-driven-development**, T1→T2. Al terminar: gate + merge a main + deploy (autorizado por el usuario: sin clientes/prod-riesgo). Fases 2–4 (propuesta+Stripe, evidencias, re-certificación) en planes posteriores.
