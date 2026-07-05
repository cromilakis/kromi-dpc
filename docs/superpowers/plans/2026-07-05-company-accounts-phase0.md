# Fase 0 — Cuentas de empresa + auth + RLS del cliente — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Pasos con checkbox (`- [ ]`).

**Goal:** Fundación para que una empresa cliente tenga cuenta propia y acceda solo a SUS datos: tabla de membresía, helpers RLS, policies de aislamiento por empresa, vista que oculta lo interno, invitación desde el consultor y shell `/portal` con ruteo por rol.

**Architecture:** El cliente se identifica por una fila en `company_members` (paralelo a `profiles`, que es la allowlist del staff). `current_company_id()` (SECURITY DEFINER) es la base de todas las policies del cliente. El cliente NO tiene policy sobre `companies` base (para no exponer `complexity_score`); lee su empresa por la vista `company_client_view`. Ruteo: consultor→`/app`, cliente→`/portal`.

**Tech Stack:** Supabase (Postgres/RLS/Auth), Next.js 16 (App Router, server actions, layouts), TypeScript, Zod, Vitest, psql para tests de RLS.

**Relacionado:** specs `2026-07-05-company-accounts-portal-design.md` (épica) y `2026-07-05-pricing-calculator-design.md`.

## Global Constraints

- **Decisiones de la épica fijadas para esta fase:**
  1. **Identidad del cliente = fila en `company_members`** (NO se agrega `client` al enum `user_role`; `user_role` sigue siendo solo staff). Un usuario es cliente ⟺ tiene fila activa en `company_members`.
  2. **Exposición del score: vista `company_client_view`** (el cliente NUNCA tiene policy sobre `companies` base; nunca lee `complexity_score`, `audit_log`, ni datos de otra empresa).
  3. **Un usuario ↔ una empresa en v1** (multi-empresa: fuera de alcance).
- **Seguridad RLS (no negociable):** todo helper `SECURITY DEFINER` con `set search_path = ''` (patrón de `is_consultant()`), `revoke all ... from public, anon` + `grant execute ... to authenticated`. Cada tabla con RLS habilitada + GRANT explícito de DML (habilitar RLS no basta). El staff conserva sus policies actuales intactas.
- **Doctrina server actions:** `"use server"` + Zod antes de tocar datos + verificación de sesión + `audit_log` en mutaciones + i18n. Prosa español, código inglés. Secretos (service role) server-only.
- **Tailwind spacing:** solo tokens definidos (4,8,12,16,20,24,28,32,36,40,44,48,60,80,100,120) o arbitrarios en px; nunca `-6/-10/-14` sueltos.
- **No romper lo existente:** el consultor (`is_consultant()`) y el modo self por token deben seguir funcionando idénticos; los tests actuales (146) siguen verdes.

---

### Task 1: Migración — `company_members` + helpers + RLS de la tabla

**Files:**
- Create: `supabase/migrations/20260706100000_company_members.sql`
- Modify: `lib/supabase/types.ts` (regenerado)

**Interfaces (Produces):**
- Tabla `public.company_members (id uuid pk, user_id uuid → auth.users on delete cascade, company_id uuid → companies on delete cascade, invited_by uuid → auth.users, status text check in ('invited','active') default 'invited', created_at, updated_at, unique(user_id))` — unique(user_id) impone un-usuario-una-empresa.
- `public.current_company_id() returns uuid` — SECURITY DEFINER, search_path='', devuelve `company_id` de la fila `active` de `company_members` para `auth.uid()`, o null.
- `public.is_client() returns boolean` — SECURITY DEFINER, search_path='', exists fila `active` en `company_members` para `auth.uid()`.

- [ ] **Step 1: Escribir la migración** — tabla + `enable row level security` + trigger `set_updated_at` (ya existe la función) + los 2 helpers (copiar el patrón exacto de `is_consultant()`: language sql, stable, security definer, `set search_path = ''`) + grants:
  - `revoke all on function ... from public, anon; grant execute ... to authenticated;` para ambos helpers.
  - GRANT DML de `company_members`: `revoke all on public.company_members from anon, authenticated; grant select, insert, update, delete on public.company_members to authenticated;` (el staff lo gestiona; RLS abajo lo restringe).
  - RLS de `company_members`: SELECT/INSERT/UPDATE/DELETE `to authenticated using ((select public.is_consultant()))` (solo staff gestiona membresías); ADEMÁS una policy SELECT para que el propio cliente lea SU fila: `using (user_id = (select auth.uid()))`.

- [ ] **Step 2: Aplicar en local** — `docker exec -i supabase_db_kromi-dpc psql -U postgres -d postgres < supabase/migrations/20260706100000_company_members.sql`; verificar tabla + funciones (`\df current_company_id`, `\d company_members`).

- [ ] **Step 3: Regenerar tipos** — `pnpm supabase gen types typescript --local` con stderr redirigido APARTE (no `2>&1`; el CLI escribe "Connecting to db" en stderr y corrompe el TS). En PowerShell la redirección da UTF-16: reconvertir a UTF-8 antes de sobrescribir `lib/supabase/types.ts`. Verificar que aparece `company_members`.

- [ ] **Step 4: typecheck** → OK.

- [ ] **Step 5: Commit** — `feat(db): company_members + current_company_id()/is_client() + RLS`

---

### Task 2: Policies del cliente + vista `company_client_view`

**Files:**
- Create: `supabase/migrations/20260706101000_client_rls.sql`
- Modify: `lib/supabase/types.ts` (regenerado — la vista aparece en types)

**Interfaces (Produces):**
- Vista `public.company_client_view` con SOLO columnas seguras de `companies` (`id, name, rut, sector_id, size_tier, phase, contact, created_at`) — **sin `complexity_score`, sin `factors`, sin `notes`** — filtrada `where id = public.current_company_id()`. `grant select on public.company_client_view to authenticated`.
- Policies SELECT del cliente (además de las del staff, sin tocarlas) en:
  - `assessments`, `assessment_controls`: `using (company_id = (select public.current_company_id()))` (assessment_controls no tiene company_id directo → unir por assessment: `using (exists (select 1 from public.assessments a where a.id = assessment_id and a.company_id = (select public.current_company_id())))`).
  - `controls`, `domains`: catálogo — SELECT `to authenticated using (true)` si aún no lo es (el cliente necesita ver los criterios/nombres). Confirmar el estado actual de sus policies antes de agregar.
  - `certificates`: SELECT `using (company_id = (select public.current_company_id()))`.
  - `evidences`: SELECT `using (company_id = (select public.current_company_id()))`. (Insert del cliente = Fase 3, NO acá.)
- El cliente NO recibe policy sobre `companies` base, `audit_log`, `interview_sessions`, `share_links`, `processing_activities`, `sectors`, `remediations`, ni ninguna otra no listada → sin policy = sin acceso.

- [ ] **Step 1: Revisar policies actuales** de `controls`/`domains`/`certificates`/`evidences`/`assessments`/`assessment_controls` (`\d+` o leer `20260702100200_rls.sql`) para no duplicar ni chocar nombres de policy.
- [ ] **Step 2: Escribir la migración** con la vista + las policies del cliente (nombres de policy distintos de los del staff, p. ej. `"<tabla>_client_select"`).
- [ ] **Step 3: Aplicar en local** y verificar que la vista existe y filtra (`select * from company_client_view;` como postgres devuelve 0 filas si current_company_id() es null — es correcto).
- [ ] **Step 4: Regenerar tipos** (mismo cuidado de stderr/UTF-8). `pnpm typecheck` → OK.
- [ ] **Step 5: Commit** — `feat(db): RLS del cliente + company_client_view (oculta score)`

---

### Task 3: Tests de aislamiento RLS (CRÍTICO)

**Files:**
- Create: `test/rls/client-isolation.test.ts` (o script SQL `supabase/tests/client_rls.sql` ejecutado por psql — elegir el patrón; ver Step 1)

**Interfaces:** ninguna (solo verificación).

Este es el test más importante de toda la épica: prueba que el aislamiento por empresa funciona. Se ejecuta contra la DB local simulando distintos usuarios vía `request.jwt.claims`.

- [ ] **Step 1: Establecer el patrón de test RLS.** Verificar si el repo ya tiene tests SQL (`ls supabase/tests` / `grep -rn "request.jwt.claims" test supabase`). Si no, crear un script SQL que, dentro de una transacción, inserte 2 empresas (A, B), 2 usuarios cliente (uA→A, uB→B) en `company_members`, y assessments/evidences/certificates para cada una; luego para cada usuario haga:
  ```sql
  set local role authenticated;
  select set_config('request.jwt.claims', json_build_object('sub', '<uuid-uA>', 'role','authenticated')::text, true);
  ```
  y valide con asserts (`do $$ begin assert (select count(*) ...) = N; end $$;`).

- [ ] **Step 2: Aserciones de aislamiento** (cada una debe pasar):
  - Cliente uA ve exactamente 1 fila en `company_client_view` (la suya) y 0 de la empresa B.
  - Cliente uA ve los `assessments`/`assessment_controls`/`certificates`/`evidences` de A y NINGUNO de B.
  - `company_client_view` NO expone `complexity_score` (la columna no existe en la vista — assert vía `information_schema.columns`).
  - Cliente uA recibe 0 filas al intentar `select complexity_score from companies` (sin policy en base → 0/ην error).
  - Cliente uA no ve `audit_log` (0 filas) ni `interview_sessions` de B.
  - `is_consultant()` sigue dando true para un usuario staff y el consultor ve TODAS las empresas (no se rompió).
  - anónimo (sin jwt) ve 0 en todo.

- [ ] **Step 3: Correr** el script/tests → todo verde. Integrarlo a `pnpm test` si es TS, o documentar el comando psql en el package (`test:rls`).

- [ ] **Step 4: Commit** — `test(rls): aislamiento por empresa del cliente (cross-company, score oculto)`

---

### Task 4: Invitación del cliente (server action + UI del consultor)

**Files:**
- Create: `lib/actions/company-members.ts`
- Modify: `app/app/companies/[id]/page.tsx` (botón "Invitar acceso del cliente") + `messages/app/companies.json`
- Test: `test/company-members.test.ts`

**Interfaces (Produces):**
- `inviteCompanyMember(companyId: string, email: string): Promise<InviteResult>` — `"use server"`, Zod (`companyId` uuid, `email` email), verifica `is_consultant()` (server-side), crea el usuario de auth por invitación (`supabase.auth.admin.inviteUserByEmail(email)` con cliente service-role — server-only), inserta `company_members(user_id, company_id, invited_by, status:'invited')`, `audit_log`. Errores tipados (`validation`/`unauthorized`/`already_member`/`unavailable`). El unique(user_id) → si el email ya es cliente de otra empresa, devuelve `already_member`.

- [ ] **Step 1: Confirmar cliente service-role** — ver cómo el repo crea el cliente admin (`SUPABASE_SERVICE_ROLE_KEY` ya en `.env.example`; buscar `createClient` service-role existente en `lib/supabase/*`). Reusar; no exponer la key al cliente.
- [ ] **Step 2: Test** (supabase + auth admin mockeados, patrón de `test/interview/extract-action.test.ts`): valida entrada, exige consultor, inserta member, audita; email duplicado → `already_member`.
- [ ] **Step 3: Implementar** la action.
- [ ] **Step 4: UI** — botón + campo email en la ficha de empresa (solo consultor), con i18n; muestra estado (invitado). typecheck + build OK.
- [ ] **Step 5: Commit** — `feat(companies): invitar acceso del cliente (crea company_member + invite)`

---

### Task 5: Shell `/portal` + ruteo por rol

**Files:**
- Create: `app/portal/layout.tsx`, `app/portal/page.tsx` (placeholder mínimo — el dashboard real es Fase 1)
- Modify: `app/app/layout.tsx` (redirigir clientes a `/portal`)
- Modify: `messages/app/*.json` (namespace `portal`) según haga falta

**Interfaces:** rutas protegidas por rol.

- [ ] **Step 1: Determinar rol en servidor.** En `app/app/layout.tsx` (ya hace `getUser` + carga `profile`): si el usuario NO es staff (sin fila en `profiles`/no consultor) PERO es cliente (`company_members` activo), `redirect('/portal')`. Si no es ni staff ni cliente → `redirect('/login')` (o página de "sin acceso").
- [ ] **Step 2: `app/portal/layout.tsx`** — server component: `getUser`; si no hay sesión → `/login`; si es staff (consultor) → `redirect('/app')`; si es cliente activo → renderiza el shell del portal (mínimo: header con nombre de empresa vía `company_client_view` + salir). `NextIntlClientProvider` con los namespaces necesarios.
- [ ] **Step 3: `app/portal/page.tsx`** — placeholder: "Bienvenido, {empresa}. Tu panel estará disponible aquí." (el dashboard real = Fase 1). Lee de `company_client_view`.
- [ ] **Step 4: Verificar** que el consultor sigue entrando a `/app` sin cambios y que un cliente aterriza en `/portal`. typecheck + build OK.
- [ ] **Step 5: E2E click-through (manual):** invitar un cliente de prueba (o insertar `company_members` vía SQL + crear el auth user), loguear como cliente → cae en `/portal` y ve solo su empresa; loguear como consultor → `/app` intacto. Screenshot.
- [ ] **Step 6: Commit** — `feat(portal): shell del cliente + ruteo por rol`

---

## Self-review

- **Cobertura del spec (Fase 0):** membresía + helpers (T1), policies + vista (T2), tests de aislamiento (T3), invitación (T4), portal + ruteo (T5). ✓
- **Decisiones fijadas:** company_members (no enum), vista para el score, un-usuario-una-empresa — en Global Constraints. ✓
- **Sin placeholders:** los pasos SQL/acciones traen su forma concreta; el patrón de test RLS está especificado con el mecanismo `request.jwt.claims`. ✓
- **Seguridad primero:** T3 (aislamiento) es gate antes de exponer el portal; el cliente sin policy = sin acceso por defecto. ✓

## Handoff

Ejecutar con **subagent-driven-development**, T1→T5 en orden (T3 debe pasar antes de dar por buena la fundación). Las Fases 1–4 (dashboard, propuesta+Stripe, evidencias, re-certificación) van en planes posteriores.
