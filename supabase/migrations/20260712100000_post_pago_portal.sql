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
-- 20260706101000_client_rls.sql). La columna "factors" NO existe en companies
-- (vive en self_assessments.risk_factors); la lista de columnas de abajo copia
-- EXACTAMENTE la definición vigente de esa migración y le añade las tres
-- columnas nuevas.
drop view if exists public.company_client_view;
create view public.company_client_view
with (security_invoker = true) as
  select
    id,
    name,
    rut,
    sector_id,
    size_tier,
    phase,
    contact,
    created_at,
    service_paid_at,
    client_ready_at,
    preliminary_panorama
  from public.companies
  where id = public.current_company_id();

comment on view public.company_client_view is
  'Lectura del cliente sobre SU empresa: columnas seguras únicamente (sin complexity_score ni notes). Filtrada por current_company_id().';

grant select on public.company_client_view to authenticated;
