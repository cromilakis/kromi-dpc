create extension if not exists pgcrypto;

create type interview_mode as enum ('assisted','self');
create type interview_status as enum ('draft','in_progress','submitted','reviewed');
create type share_kind as enum ('diagnosis','certificate','document');

create table public.processing_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  area text not null,
  name text not null,
  purpose text not null default '',
  legal_basis text not null default '',
  data_categories text[] not null default '{}',
  data_subjects text[] not null default '{}',
  source text not null default '',
  recipients text[] not null default '{}',
  processors text[] not null default '{}',
  intl_transfer boolean not null default false,
  intl_countries text[] not null default '{}',
  retention text not null default '',
  security_measures text[] not null default '{}',
  is_sensitive boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  mode interview_mode not null default 'assisted',
  status interview_status not null default 'draft',
  answers jsonb not null default '{}'::jsonb,
  respondent jsonb not null default '{}'::jsonb,
  progress int not null default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind share_kind not null,
  target_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now()
);

alter table public.processing_activities enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.share_links enable row level security;

-- Consultores/admin: acceso completo (patrón existente).
create policy pa_rw on public.processing_activities for all
  using (is_consultant()) with check (is_consultant());
create policy is_rw on public.interview_sessions for all
  using (is_consultant()) with check (is_consultant());
create policy sl_rw on public.share_links for all
  using (is_consultant()) with check (is_consultant());

create trigger set_pa_updated before update on public.processing_activities
  for each row execute function set_updated_at();
create trigger set_is_updated before update on public.interview_sessions
  for each row execute function set_updated_at();

-- Acceso self por token (anon): SECURITY DEFINER, expone SOLO la sesión objetivo.
create or replace function public.open_diagnosis(p_token text)
returns table (session_id uuid, company_name text, status interview_status, answers jsonb)
language sql security definer set search_path = public, extensions as $$
  select s.id, c.name, s.status, s.answers
  from public.share_links l
  join public.interview_sessions s on s.id = l.target_id
  join public.companies c on c.id = s.company_id
  where l.kind = 'diagnosis'
    and l.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and l.revoked_at is null
    and (l.expires_at is null or l.expires_at > now())
    and s.status in ('draft','in_progress')
  limit 1;
$$;

create or replace function public.save_diagnosis_answers(p_token text, p_answers jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_session uuid;
begin
  select s.id into v_session
  from public.share_links l join public.interview_sessions s on s.id = l.target_id
  where l.kind = 'diagnosis'
    and l.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and l.revoked_at is null and (l.expires_at is null or l.expires_at > now())
    and s.status in ('draft','in_progress');
  if v_session is null then raise exception 'invalid_or_expired_token'; end if;
  update public.interview_sessions
    set answers = p_answers, status = 'in_progress', updated_at = now()
    where id = v_session;
end; $$;

grant execute on function public.open_diagnosis(text) to anon, authenticated;
grant execute on function public.save_diagnosis_answers(text, jsonb) to anon, authenticated;
