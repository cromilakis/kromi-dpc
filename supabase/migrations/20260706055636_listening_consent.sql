-- Consentimiento de escucha activa (Fase 3): marca de tiempo en que el
-- consultor confirmó que informó y obtuvo consentimiento para grabar/transcribir
-- la reunión. Nullable: sesiones sin escucha por voz quedan en NULL.
alter table public.interview_sessions
  add column if not exists listening_consent_at timestamptz;

comment on column public.interview_sessions.listening_consent_at is
  'Cuándo se registró el consentimiento para escucha activa por voz (Fase 3).';
