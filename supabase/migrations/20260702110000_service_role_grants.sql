-- ============================================================================
-- Privilegios del service_role (spec auth — bootstrap del equipo consultor)
-- ============================================================================
-- Contexto: 20260702100200_rls.sql otorga DML explícito SOLO a authenticated
-- (el stack actual del CLI no auto-expone DML a los roles del API). Eso dejó
-- al service_role sin privilegio alguno sobre las tablas: aunque bypassa RLS
-- por atributo de rol, los privilegios de tabla se evalúan igual, así que
-- lib/supabase/admin.ts (insert de leads del autoevaluador) y
-- scripts/create-consultant.mjs (upsert en profiles) fallaban con 42501.
--
-- Se otorga DML explícito (misma filosofía que authenticated: nada de
-- TRUNCATE/REFERENCES/TRIGGER) y se preserva audit_log como append-only
-- también para el service_role.

grant select, insert, update, delete on
  public.sectors, public.domains, public.controls, public.risk_catalog,
  public.solution_catalog, public.profiles, public.companies,
  public.assessments, public.assessment_controls, public.evidences,
  public.company_risks, public.remediation_items, public.certificates,
  public.self_assessments
to service_role;

-- audit_log append-only real (sin update/delete; TRUNCATE no se otorga).
grant select, insert on public.audit_log to service_role;

-- Secuencias (ids seriales/futuras) para inserts vía service_role.
grant usage, select on all sequences in schema public to service_role;

-- Objetos futuros creados por migraciones (rol postgres): mismo DML acotado.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;

-- ============================================================================
-- -- DOWN (rollback documentado)
-- ============================================================================
-- alter default privileges in schema public revoke all on sequences from service_role;
-- alter default privileges in schema public revoke all on tables from service_role;
-- revoke all on all sequences in schema public from service_role;
-- revoke all on public.audit_log from service_role;
-- revoke all on public.sectors, public.domains, public.controls,
--   public.risk_catalog, public.solution_catalog, public.profiles,
--   public.companies, public.assessments, public.assessment_controls,
--   public.evidences, public.company_risks, public.remediation_items,
--   public.certificates, public.self_assessments from service_role;
