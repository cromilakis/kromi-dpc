-- ============================================================================
-- Test RLS: aislamiento por empresa del cliente (Task 3 — CRÍTICO).
-- Contrato: docs/superpowers/plans/2026-07-05-company-accounts-phase0.md
--
-- Prueba que:
--   * el cliente de la empresa A ve SOLO datos de A (0 de B) en
--     company_client_view / assessments / assessment_controls / certificates
--     / evidences;
--   * la vista company_client_view NUNCA expone complexity_score/notes/factors;
--   * el cliente no tiene acceso a companies (base), audit_log ni
--     interview_sessions;
--   * el consultor (is_consultant()) sigue viendo TODAS las empresas;
--   * sin sesión (sin request.jwt.claims), is_client()/is_consultant() = false
--     y company_client_view no devuelve filas.
--
-- Ejecutar contra la DB local (todo dentro de una transacción con ROLLBACK
-- final: no deja datos de prueba en la DB):
--
--   docker exec -i supabase_db_kromi-dpc psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/client_rls_test.sql
--
-- (equivalente npm: `pnpm test:rls`, ver package.json)
--
-- Mecanismo de simulación de usuario (psql, dentro de la transacción):
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub','<uuid>','role','authenticated')::text, true);
--
-- Si CUALQUIER `assert` falla, el script aborta con error (ON_ERROR_STOP) y
-- NO debe silenciarse ni ajustarse para que pase: es un hallazgo de
-- seguridad real a corregir en las migraciones de Task 1/2 (nunca acá).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Fixtures — como postgres (rol de superusuario, bypassa RLS)
-- ----------------------------------------------------------------------------
-- UUIDs fijos para reproducibilidad:
--   company_a = 11111111-1111-1111-1111-111111111111
--   company_b = 22222222-2222-2222-2222-222222222222
--   user_a    = 33333333-3333-3333-3333-333333333333 (cliente activo de A)
--   user_b    = 44444444-4444-4444-4444-444444444444 (cliente activo de B)
--   assessment_a/b, evidence_a/b, certificate_a/b, interview_b: prefijos 5-b.
--   consultor: reusa 65723b0c-448b-443f-b0aa-f561e5ab724e (seed local,
--   consultor@dpc.local, ya tiene fila en public.profiles).

do $$
begin
  if not exists (select 1 from public.domains) or not exists (select 1 from public.controls) then
    raise exception 'fixture: no hay domains/controls sembrados en la DB local — corre el seed del catálogo antes de este test';
  end if;
end $$;

-- Empresas A y B (con complexity_score interno distinto — para probar que la
-- vista lo oculta).
insert into public.companies (id, name, rut, phase, complexity_score, contact)
values
  ('11111111-1111-1111-1111-111111111111', 'Empresa A (test RLS)', 'RLS-TEST-A-99.999-9', 'diagnostico', 77, '{"email":"a@empresa-a.test"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'Empresa B (test RLS)', 'RLS-TEST-B-88.888-8', 'diagnostico', 42, '{"email":"b@empresa-b.test"}'::jsonb)
on conflict (id) do nothing;

-- Usuarios auth mínimos (uA, uB).
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
values
  ('33333333-3333-3333-3333-333333333333', 'cliente-a@rls-test.local', 'x', now(), now(), now(), 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'cliente-b@rls-test.local', 'x', now(), now(), now(), 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Membresías activas: uA -> A, uB -> B.
insert into public.company_members (user_id, company_id, status)
values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'active'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'active')
on conflict (user_id) do update set company_id = excluded.company_id, status = 'active';

-- Un assessment por empresa.
insert into public.assessments (id, company_id, cycle, status)
values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 1, 'open'),
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 1, 'open')
on conflict (id) do nothing;

-- assessment_controls por empresa (mismo control del catálogo, deterministico
-- por sort: sirve solo para probar el join a assessments, no el contenido).
insert into public.assessment_controls (assessment_id, control_id, status)
values
  ('55555555-5555-5555-5555-555555555555', (select id from public.controls order by sort limit 1), 'pending'),
  ('66666666-6666-6666-6666-666666666666', (select id from public.controls order by sort limit 1), 'pending')
on conflict (assessment_id, control_id) do nothing;

-- Certificado por empresa.
insert into public.certificates (id, company_id, code, status, valid_until, sha256_hash)
values
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'DPC-TEST-A-0001', 'active', current_date + 365, repeat('a', 64)),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'DPC-TEST-B-0001', 'active', current_date + 365, repeat('b', 64))
on conflict (id) do nothing;

-- Evidencia por empresa.
insert into public.evidences (id, company_id, control_id, name, status)
values
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', (select id from public.controls order by sort limit 1), 'Evidencia A', 'missing'),
  ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', (select id from public.controls order by sort limit 1), 'Evidencia B', 'missing')
on conflict (id) do nothing;

-- interview_session de B (para probar que uA no la ve).
insert into public.interview_sessions (id, company_id, assessment_id, mode, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'assisted', 'draft')
on conflict (id) do nothing;

-- audit_log: al menos una fila, para probar que el cliente no ve NADA de audit_log.
insert into public.audit_log (actor_id, action, entity, entity_id, detail)
values (null, 'test.seed', 'companies', '11111111-1111-1111-1111-111111111111', '{}'::jsonb);

-- ----------------------------------------------------------------------------
-- 1. Cliente uA (empresa A) — debe ver SOLO A, nunca B, nunca el score
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);

do $$
declare
  v_count int;
  v_id uuid;
begin
  -- company_client_view: exactamente 1 fila, y es la de A.
  select count(*) into v_count from public.company_client_view;
  assert v_count = 1, format('uA: company_client_view debería devolver 1 fila, devolvió %s', v_count);

  select id into v_id from public.company_client_view limit 1;
  assert v_id = '11111111-1111-1111-1111-111111111111', format('uA: company_client_view devolvió la empresa %s, esperada A', v_id);

  -- assessments: solo A.
  select count(*) into v_count from public.assessments;
  assert v_count = 1, format('uA: assessments visibles = %s, esperado 1 (solo A)', v_count);
  select count(*) into v_count from public.assessments where company_id = '22222222-2222-2222-2222-222222222222';
  assert v_count = 0, format('uA: assessments de B visibles = %s, esperado 0', v_count);

  -- assessment_controls: solo el de A.
  select count(*) into v_count from public.assessment_controls;
  assert v_count = 1, format('uA: assessment_controls visibles = %s, esperado 1 (solo A)', v_count);
  select count(*) into v_count from public.assessment_controls where assessment_id = '66666666-6666-6666-6666-666666666666';
  assert v_count = 0, format('uA: assessment_controls de B visibles = %s, esperado 0', v_count);

  -- certificates: solo A.
  select count(*) into v_count from public.certificates;
  assert v_count = 1, format('uA: certificates visibles = %s, esperado 1 (solo A)', v_count);
  select count(*) into v_count from public.certificates where company_id = '22222222-2222-2222-2222-222222222222';
  assert v_count = 0, format('uA: certificates de B visibles = %s, esperado 0', v_count);

  -- evidences: solo A.
  select count(*) into v_count from public.evidences;
  assert v_count = 1, format('uA: evidences visibles = %s, esperado 1 (solo A)', v_count);
  select count(*) into v_count from public.evidences where company_id = '22222222-2222-2222-2222-222222222222';
  assert v_count = 0, format('uA: evidences de B visibles = %s, esperado 0', v_count);

  -- companies (tabla base): 0 filas — el cliente NO tiene policy sobre companies base.
  select count(*) into v_count from public.companies;
  assert v_count = 0, format('uA: companies (base) visibles = %s, esperado 0 (sin policy de cliente)', v_count);

  -- audit_log: 0 filas.
  select count(*) into v_count from public.audit_log;
  assert v_count = 0, format('uA: audit_log visibles = %s, esperado 0', v_count);

  -- interview_sessions: 0 filas (ni siquiera las de su propia empresa: Fase 0 no da acceso).
  select count(*) into v_count from public.interview_sessions;
  assert v_count = 0, format('uA: interview_sessions visibles = %s, esperado 0', v_count);

  raise notice 'OK: aislamiento de uA (empresa A) verificado';
end $$;

-- ----------------------------------------------------------------------------
-- 2. company_client_view NO expone complexity_score/notes/factors
-- ----------------------------------------------------------------------------
reset role;
set local role postgres;

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'company_client_view'
    and column_name in ('complexity_score', 'notes', 'factors');
  assert v_count = 0, format('company_client_view expone %s columna(s) prohibida(s) (complexity_score/notes/factors)', v_count);

  raise notice 'OK: company_client_view no expone columnas internas';
end $$;

-- ----------------------------------------------------------------------------
-- 3. Cliente uB (empresa B) — chequeo recíproco: ve SOLO B, nunca A
-- ----------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '44444444-4444-4444-4444-444444444444', 'role', 'authenticated')::text, true);

do $$
declare
  v_count int;
  v_id uuid;
begin
  select count(*) into v_count from public.company_client_view;
  assert v_count = 1, format('uB: company_client_view debería devolver 1 fila, devolvió %s', v_count);

  select id into v_id from public.company_client_view limit 1;
  assert v_id = '22222222-2222-2222-2222-222222222222', format('uB: company_client_view devolvió la empresa %s, esperada B', v_id);

  select count(*) into v_count from public.assessments where company_id = '11111111-1111-1111-1111-111111111111';
  assert v_count = 0, format('uB: assessments de A visibles = %s, esperado 0', v_count);

  select count(*) into v_count from public.certificates where company_id = '11111111-1111-1111-1111-111111111111';
  assert v_count = 0, format('uB: certificates de A visibles = %s, esperado 0', v_count);

  select count(*) into v_count from public.evidences where company_id = '11111111-1111-1111-1111-111111111111';
  assert v_count = 0, format('uB: evidences de A visibles = %s, esperado 0', v_count);

  raise notice 'OK: aislamiento de uB (empresa B) verificado (recíproco)';
end $$;

-- ----------------------------------------------------------------------------
-- 4. Consultor (staff) — is_consultant() = true, ve TODAS las empresas
-- ----------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '65723b0c-448b-443f-b0aa-f561e5ab724e', 'role', 'authenticated')::text, true);

do $$
declare
  v_count int;
  v_is_consultant boolean;
begin
  select public.is_consultant() into v_is_consultant;
  assert v_is_consultant is true, 'consultor: is_consultant() debería ser true';

  select count(*) into v_count from public.companies
  where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
  assert v_count = 2, format('consultor: companies (A y B) visibles = %s, esperado 2 (no se rompió el acceso staff)', v_count);

  raise notice 'OK: consultor sigue viendo todas las empresas';
end $$;

-- ----------------------------------------------------------------------------
-- 5. Sin sesión (sin request.jwt.claims) — auth.uid() = null → 0 en todo
-- ----------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);

do $$
declare
  v_count int;
  v_is_client boolean;
  v_is_consultant boolean;
begin
  select public.is_client() into v_is_client;
  assert v_is_client is false, 'anónimo: is_client() debería ser false';

  select public.is_consultant() into v_is_consultant;
  assert v_is_consultant is false, 'anónimo: is_consultant() debería ser false';

  select count(*) into v_count from public.company_client_view;
  assert v_count = 0, format('anónimo: company_client_view devolvió %s filas, esperado 0', v_count);

  select count(*) into v_count from public.companies;
  assert v_count = 0, format('anónimo: companies (base) visibles = %s, esperado 0', v_count);

  raise notice 'OK: sin sesión, cero acceso';
end $$;

-- ----------------------------------------------------------------------------
-- No se persiste nada de este test.
-- ----------------------------------------------------------------------------
reset role;
rollback;
