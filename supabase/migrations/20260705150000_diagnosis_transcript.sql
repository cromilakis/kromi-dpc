-- Autocompletado del diagnóstico desde transcripción: se guarda el texto
-- crudo de la reunión y la extracción validada del LLM en la sesión.
-- RLS existente (is_consultant()) ya cubre interview_sessions; el GRANT de
-- UPDATE a authenticated ya se otorgó en la migración de entrevista.
alter table public.interview_sessions
  add column if not exists transcript text,
  add column if not exists ai_extraction jsonb;

comment on column public.interview_sessions.transcript is
  'Transcripción cruda de la reunión pegada por el consultor (puede contener datos personales; RLS solo consultores).';
comment on column public.interview_sessions.ai_extraction is
  'Salida validada del LLM (ExtractionResult): rat[], compliance[], unassigned[]. Auditable; no es el expediente.';
