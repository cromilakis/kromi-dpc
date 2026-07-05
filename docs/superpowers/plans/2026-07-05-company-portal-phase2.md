# Fase 2 — Propuesta, aceptación y pago (Stripe) — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Pasos con checkbox (`- [ ]`).

**Goal:** El consultor publica una propuesta (plan + precio) al portal; el cliente la ve y la acepta; al aceptar, paga por **Stripe Checkout (hosted, modo test)**; un **webhook** concilia el pago como fuente de verdad y marca la propuesta pagada.

**Architecture:** Tablas `proposals` + `payments` con RLS (consultor gestiona; cliente lee/acepta la suya; el webhook escribe con service-role). El precio lo decide el consultor (usa la calculadora interna del spec de pricing); el cliente NUNCA ve el Complexity Score, solo el monto final. Pago = Checkout Session creada server-side; retorno al portal; el estado real llega por webhook (`checkout.session.completed`), idempotente.

**Tech Stack:** Next.js 16 (server actions + route handler), Stripe (test, Checkout hosted), Supabase (RLS + service-role para el webhook), Zod, Vitest.

**Relacionado:** épica `2026-07-05-company-accounts-portal-design.md`; pricing `2026-07-05-pricing-calculator-design.md`; fundación Fase 0 (RLS del cliente, `current_company_id()`).

## Global Constraints

- **Stripe modo TEST**: `STRIPE_SECRET_KEY` (sk_test_…) y `STRIPE_WEBHOOK_SECRET` **server-only** (sin `NEXT_PUBLIC`). Cliente Stripe solo en servidor. Al ir a producción se cambian por claves live.
- **Webhook = fuente de verdad**: el estado `paid` NO se fija desde el redirect del cliente (manipulable), solo desde el webhook verificado por firma. Idempotente (reintentos de Stripe no duplican).
- **RLS**: cliente ve/acepta SOLO su propuesta (`company_id = current_company_id()`); consultor gestiona (is_consultant()); el webhook usa service-role (autenticado por la firma de Stripe, sin sesión de usuario). El cliente nunca ve `complexity_score`.
- **Doctrina**: `"use server"` + Zod + auth + `audit_log` en mutaciones; secretos server-only; i18n (`portal`/`companies`); prosa español, código inglés.
- **Tailwind spacing**: solo tokens definidos (4,8,12,16,20,24,28,32,36,40,44,48,60,80,100,120) o px arbitrarios; nunca -6/-10/-14. Botones cursor-pointer.
- **Degradación**: sin `STRIPE_SECRET_KEY` el flujo de pago se deshabilita con mensaje claro; la propuesta/aceptación funcionan igual.

---

### Task 1: Migración — `proposals` + `payments` + RLS

**Files:**
- Create: `supabase/migrations/20260706110000_proposals_payments.sql`
- Modify: `lib/supabase/types.ts` (regenerado)

**Interfaces (Produces):**
- Enum `proposal_status` = `('draft','sent','accepted','paid','expired')`; enum `payment_status` = `('pending','paid','failed')`.
- `proposals (id, company_id → companies on delete cascade, plan text, amount_clp int check >0, currency text default 'clp', status proposal_status default 'draft', created_by → auth.users, accepted_at timestamptz, created_at, updated_at)`.
- `payments (id, proposal_id → proposals on delete cascade, company_id → companies, stripe_session_id text unique, stripe_payment_intent text, amount_clp int, status payment_status default 'pending', created_at, updated_at)`.
- RLS: staff (is_consultant) full en ambas; **cliente**: SELECT proposals/payments `using (company_id = (select public.current_company_id()))`; cliente UPDATE proposals SOLO para aceptar (policy con `with check` que permita pasar a 'accepted' su propia propuesta — o dejar la aceptación a una server action con service-role y NO dar UPDATE al cliente; **preferible: server action, sin UPDATE directo del cliente**, más simple de razonar). GRANT DML a authenticated + service_role.

- [ ] **Step 1: Escribir migración** (enums en sentencias propias si hace falta; tablas; enable RLS; policies staff + cliente-select; grants). Documenta la decisión de que la aceptación va por server action (cliente sin UPDATE directo).
- [ ] **Step 2: Aplicar en local** + verificar (`\d proposals`, `\d payments`, enums).
- [ ] **Step 3: Regenerar tipos** (stderr aparte, UTF-8). `pnpm typecheck` OK.
- [ ] **Step 4: Commit** — `feat(db): proposals + payments + RLS`

---

### Task 2: Cliente Stripe + creación/publicación de propuesta (consultor)

**Files:**
- Create: `lib/stripe/client.ts` (server-only)
- Create: `lib/actions/proposals.ts`
- Modify: `app/app/companies/[id]/page.tsx` + `messages/app/companies.json`
- Test: `test/proposals.test.ts`

**Interfaces (Produces):**
- `lib/stripe/client.ts`: `getStripe()` → instancia server-only leyendo `STRIPE_SECRET_KEY`; lanza `StripeError('disabled')` si falta. (Usa el paquete `stripe`; instalar si no está: `pnpm add stripe`.)
- `createProposal(companyId, { plan, amountClp }): Promise<...>` — `"use server"`, Zod, is_consultant, inserta proposals(status 'sent'), audit. (Draft→sent simplificado: se publica al crear.)

- [ ] **Step 1: Instalar `stripe`** (`pnpm add stripe`) si no está en package.json.
- [ ] **Step 2: `lib/stripe/client.ts`** server-only (getStripe + StripeError).
- [ ] **Step 3: Test** de `createProposal` (supabase mockeado): Zod, exige consultor, inserta, audita.
- [ ] **Step 4: Implementar** la action + UI en la ficha de empresa (form: plan + monto CLP; solo consultor) con i18n.
- [ ] **Step 5: typecheck + build + test** verdes.
- [ ] **Step 6: Commit** — `feat(proposals): cliente Stripe + crear/publicar propuesta`

---

### Task 3: Cliente ve y acepta la propuesta (portal)

**Files:**
- Modify: `app/portal/page.tsx` (o `app/portal/proposal/page.tsx`) + `messages/app/portal.json`
- Modify: `lib/actions/proposals.ts` (acción `acceptProposal`)
- Test: extender `test/proposals.test.ts`

**Interfaces (Produces):**
- `acceptProposal(proposalId): Promise<...>` — `"use server"`, Zod, verifica que la propuesta pertenece a `current_company_id()` (lee con el cliente autenticado; RLS lo garantiza), marca `status='accepted', accepted_at=now()`, audit. (Sin dar UPDATE directo al cliente en RLS.)

- [ ] **Step 1:** UI en el portal: tarjeta "Tu propuesta" con plan + monto (formateado CLP) + estado; botón "Aceptar" si status='sent'. Si 'accepted'/'paid', mostrar el estado. i18n.
- [ ] **Step 2:** `acceptProposal` action + test.
- [ ] **Step 3:** typecheck + build + test verdes.
- [ ] **Step 4: Commit** — `feat(portal): ver y aceptar la propuesta`

---

### Task 4: Pago con Stripe Checkout (hosted)

**Files:**
- Modify: `lib/actions/proposals.ts` (acción `createCheckoutSession`)
- Modify: `app/portal/*` (botón "Pagar" + manejo de retorno `?paid`)
- Test: extender `test/proposals.test.ts`

**Interfaces (Produces):**
- `createCheckoutSession(proposalId): Promise<{ ok:true; url } | { ok:false; error }>` — `"use server"`, verifica propuesta del cliente (accepted), crea/actualiza `payments(status pending, stripe_session_id)`, crea Stripe Checkout Session (mode 'payment', currency 'clp', line_item con `amount_clp*100`? OJO: CLP es zero-decimal en Stripe → el monto va SIN multiplicar por 100; documentarlo), `metadata:{proposal_id, company_id}`, `success_url=<origin>/portal?paid=1`, `cancel_url=<origin>/portal`. Devuelve `session.url`. Si no hay `STRIPE_SECRET_KEY` → error `disabled`.

- [ ] **Step 1:** Implementar la action (CLP zero-decimal: NO multiplicar por 100). Persistir `stripe_session_id` en payments.
- [ ] **Step 2:** UI: botón "Pagar" en la propuesta aceptada → llama la action → `window.location = url`. Al volver con `?paid=1`, mensaje "estamos confirmando tu pago" (el estado real lo fija el webhook).
- [ ] **Step 3:** Test de la action (Stripe + supabase mockeados): crea payment pending + session; sin key → disabled.
- [ ] **Step 4:** typecheck + build + test verdes.
- [ ] **Step 5: Commit** — `feat(portal): pago con Stripe Checkout`

---

### Task 5: Webhook de conciliación (fuente de verdad)

**Files:**
- Create: `app/api/stripe/webhook/route.ts`
- Test: `test/stripe-webhook.test.ts`

**Interfaces (Produces):**
- Route handler `POST` en `/api/stripe/webhook`: lee el **raw body** (`await req.text()`), verifica la firma con `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`. En `checkout.session.completed` (y/o `payment_intent.succeeded`): con **service-role** (sin sesión), busca `payments` por `stripe_session_id` (idempotente: si ya 'paid', no-op), marca `payments.status='paid'` + `stripe_payment_intent`, y `proposals.status='paid'`; `audit_log`. Responde 200 rápido. Firma inválida → 400.

- [ ] **Step 1:** Implementar el route handler (raw body, verificación de firma, service-role client de `lib/supabase/admin.ts`, idempotencia por unique `stripe_session_id`).
- [ ] **Step 2:** Test (Stripe.constructEvent mockeado + supabase admin mockeado): evento válido → marca paid (idempotente en segundo evento); firma inválida → 400.
- [ ] **Step 3:** typecheck + build + test verdes.
- [ ] **Step 4: E2E manual (orquestador, requiere STRIPE_SECRET_KEY test + Stripe CLI):** con la key en .env.local y `stripe listen --forward-to localhost:3000/api/stripe/webhook`, flujo completo: consultor crea propuesta → cliente acepta → paga en Checkout (tarjeta test 4242…) → webhook marca paid → portal refleja 'pagado'. Verificar `payments`/`proposals` en DB.
- [ ] **Step 5: Commit** — `feat(stripe): webhook de conciliacion de pagos`

---

## Self-review

- **Cobertura del spec (Fase 2):** propuesta+aceptación (T1-T3), pago Checkout (T4), webhook fuente de verdad (T5). ✓
- **Seguridad:** webhook por firma + service-role; cliente sin UPDATE directo; secretos server-only; CLP zero-decimal documentado. ✓
- **Degradación:** sin key, pago deshabilitado; propuesta/aceptación siguen. ✓
- **Sin placeholders:** cada action con su forma; el gotcha de CLP zero-decimal y el raw-body del webhook explícitos. ✓

## Handoff

Ejecutar con **subagent-driven-development**, T1→T5. T1-T3 no necesitan Stripe (verificables ya). T4-T5 se verifican en vivo cuando `STRIPE_SECRET_KEY` (test) esté en `.env.local` + Stripe CLI para el webhook. Al terminar: gate + merge + `supabase db push` (migración T1) + deploy.
