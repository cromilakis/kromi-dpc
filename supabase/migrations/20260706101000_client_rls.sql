-- ============================================================================
-- Migración: RLS del cliente (solo lectura) + vista company_client_view
-- Contratos: docs/superpowers/plans/2026-07-05-company-accounts-phase0.md (Task 2)
-- Decisión de la épica: el cliente NUNCA tiene policy sobre public.companies
-- base (evita exponer complexity_score/notes); lee su empresa exclusivamente
-- por la vista public.company_client_view, que solo expone columnas seguras
-- y está filtrada por public.current_company_id().
-- Las policies del staff (is_consultant()/is_admin()) creadas en
-- 20260702100200_rls.sql NO se tocan; las del cliente usan nombres distintos
-- ("<tabla>_client_select") para no chocar.
-- Depende de: 20260702100100_operations.sql, 20260702100200_rls.sql,
--             20260706100000_company_members.sql (current_company_id()/is_client()).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Vista company_client_view — SOLO columnas seguras de companies
-- ----------------------------------------------------------------------------
-- Excluye a propósito: complexity_score (interno, dimensiona precio/esfuerzo)
-- y notes (bitácora interna del consultor). No existe columna "factors" en
-- companies (ese campo vive en self_assessments.risk_factors, tabla distinta
-- y sin policy de cliente).
-- La vista se ejecuta con los privilegios del invocador (sin security barrier
-- especial): el filtro where id = current_company_id() ya acota a 0 o 1 fila
-- por el propio current_company_id() (SECURITY DEFINER); no depende de RLS
-- de companies porque no hay policy de cliente sobre la tabla base.
create view public.company_client_view as
  select
    id,
    name,
    rut,
    sector_id,
    size_tier,
    phase,
    contact,
    created_at
  from public.companies
  where id = public.current_company_id();

comment on view public.company_client_view is
  'Lectura del cliente sobre SU empresa: columnas seguras únicamente (sin complexity_score ni notes). Filtrada por current_company_id().';

grant select on public.company_client_view to authenticated;

-- ----------------------------------------------------------------------------
-- 2. assessments — SELECT del cliente (tiene company_id directo)
-- ----------------------------------------------------------------------------
create policy assessments_client_select on public.assessments
  for select to authenticated
  using (company_id = (select public.current_company_id()));

-- ----------------------------------------------------------------------------
-- 3. assessment_controls — SELECT del cliente
-- ----------------------------------------------------------------------------
-- assessment_controls NO tiene company_id directo (ver 20260702100100_operations.sql):
-- solo assessment_id → assessments.company_id. El scope se resuelve uniendo con
-- assessments y comparando su company_id con la empresa del cliente.
create policy assessment_controls_client_select on public.assessment_controls
  for select to authenticated
  using (
    exists (
      select 1
      from public.assessments a
      where a.id = assessment_controls.assessment_id
        and a.company_id = (select public.current_company_id())
    )
  );

-- ----------------------------------------------------------------------------
-- 4. certificates — SELECT del cliente (tiene company_id directo)
-- ----------------------------------------------------------------------------
create policy certificates_client_select on public.certificates
  for select to authenticated
  using (company_id = (select public.current_company_id()));

-- ----------------------------------------------------------------------------
-- 5. evidences — SELECT del cliente (tiene company_id directo)
-- ----------------------------------------------------------------------------
-- Solo lectura: el insert/upload del cliente es Fase 3, no se agrega acá.
create policy evidences_client_select on public.evidences
  for select to authenticated
  using (company_id = (select public.current_company_id()));

-- ----------------------------------------------------------------------------
-- 6. controls, domains — catálogo
-- ----------------------------------------------------------------------------
-- Estado actual (20260702100200_rls.sql): controls_select y domains_select
-- están RESTRINGIDOS a is_consultant() (staff). El cliente necesita leer el
-- nombre/descripción de los controles y dominios para entender su propio
-- diagnóstico (assessment_controls referencia control_id). El catálogo no es
-- dato sensible por empresa (es metodología compartida, no un dato del
-- cliente), así que se agrega una policy adicional de solo lectura para
-- clientes activos (is_client()), sin tocar la policy del staff.
create policy controls_client_select on public.controls
  for select to authenticated
  using ((select public.is_client()));

create policy domains_client_select on public.domains
  for select to authenticated
  using ((select public.is_client()));

-- ----------------------------------------------------------------------------
-- NOTA: sin políticas de cliente para companies (base), audit_log,
-- interview_sessions, share_links, processing_activities, sectors,
-- remediations/remediation_items ni cualquier otra tabla no listada arriba.
-- Sin policy = sin acceso (RLS habilitada, deny-all para el rol authenticated
-- salvo lo explícitamente permitido).
-- ----------------------------------------------------------------------------

-- ============================================================================
-- -- DOWN (rollback documentado)
-- ============================================================================
-- drop policy if exists domains_client_select on public.domains;
-- drop policy if exists controls_client_select on public.controls;
-- drop policy if exists evidences_client_select on public.evidences;
-- drop policy if exists certificates_client_select on public.certificates;
-- drop policy if exists assessment_controls_client_select on public.assessment_controls;
-- drop policy if exists assessments_client_select on public.assessments;
-- drop view if exists public.company_client_view;
