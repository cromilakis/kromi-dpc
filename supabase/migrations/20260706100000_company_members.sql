-- ============================================================================
-- Migración: company_members — allowlist del cliente (paralela a profiles)
-- Contratos: docs/superpowers/plans/2026-07-05-company-accounts-phase0.md (Task 1)
-- Decisión de la épica: la identidad de "cliente" NO se modela con un valor
-- nuevo en el enum public.user_role (que sigue siendo solo staff). Un usuario
-- es cliente si y solo si tiene una fila activa en esta tabla. unique(user_id)
-- impone un-usuario-una-empresa en v1 (multi-empresa: fuera de alcance).
-- Depende de: 20260702100000_catalog.sql, 20260702100100_operations.sql,
--             20260702100200_rls.sql (public.is_consultant(), set_updated_at()).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla
-- ----------------------------------------------------------------------------
create table public.company_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  company_id  uuid not null references public.companies (id) on delete cascade,
  invited_by  uuid references auth.users (id),
  status      text not null default 'invited' check (status in ('invited', 'active')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

comment on table public.company_members is
  'Allowlist manual del cliente (paralela a profiles, que es la allowlist del staff). unique(user_id) impone un-usuario-una-empresa en v1.';

create trigger trg_company_members_updated_at
  before update on public.company_members
  for each row execute function public.set_updated_at();

-- Seguridad inmediata (sin ventana de exposición): RLS se habilita en la
-- misma migración que crea la tabla.
alter table public.company_members enable row level security;

-- anon: cero acceso directo (defensa en profundidad además de RLS).
revoke all on public.company_members from anon;

-- ----------------------------------------------------------------------------
-- 2. Helpers RLS (mismo patrón que is_consultant()/is_admin()):
--    SECURITY DEFINER + search_path fijado para evitar recursión de RLS
--    sobre company_members y el hijack por search_path mutable.
-- ----------------------------------------------------------------------------

-- Empresa del cliente autenticado (null si no es cliente activo de ninguna).
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cm.company_id
  from public.company_members cm
  where cm.user_id = auth.uid()
    and cm.status = 'active'
  limit 1;
$$;

-- ¿El usuario autenticado es cliente activo de alguna empresa?
create or replace function public.is_client()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.status = 'active'
  );
$$;

revoke all on function public.current_company_id() from public, anon;
grant execute on function public.current_company_id() to authenticated;
revoke all on function public.is_client() from public, anon;
grant execute on function public.is_client() to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Privilegios DML de la tabla (RLS abajo restringe filas)
-- ----------------------------------------------------------------------------
revoke all on public.company_members from anon, authenticated;
grant select, insert, update, delete on public.company_members to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Políticas RLS
-- ----------------------------------------------------------------------------
-- El staff (consultor) gestiona todas las membresías (invitar, activar, etc.).
create policy company_members_staff_select on public.company_members
  for select to authenticated using ((select public.is_consultant()));
create policy company_members_staff_insert on public.company_members
  for insert to authenticated with check ((select public.is_consultant()));
create policy company_members_staff_update on public.company_members
  for update to authenticated using ((select public.is_consultant())) with check ((select public.is_consultant()));
create policy company_members_staff_delete on public.company_members
  for delete to authenticated using ((select public.is_consultant()));

-- El cliente lee SU propia fila (necesario para el bootstrap de sesión / saber
-- su estado de invitación y su empresa).
create policy company_members_self_select on public.company_members
  for select to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- -- DOWN (rollback documentado)
-- ============================================================================
-- drop policy if exists company_members_self_select on public.company_members;
-- drop policy if exists company_members_staff_delete on public.company_members;
-- drop policy if exists company_members_staff_update on public.company_members;
-- drop policy if exists company_members_staff_insert on public.company_members;
-- drop policy if exists company_members_staff_select on public.company_members;
-- drop function if exists public.is_client();
-- drop function if exists public.current_company_id();
-- drop trigger if exists trg_company_members_updated_at on public.company_members;
-- drop table if exists public.company_members;
