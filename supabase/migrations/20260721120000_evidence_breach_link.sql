-- Sub-proyecto #7: puente evidencia ↔ brecha del diagnóstico.
-- Una evidencia puede respaldar la mitigación de una brecha concreta
-- (diagnosis_breaches). `control_id` se mantiene para el modelo anterior
-- hasta su remoción en el sub-proyecto #8; ambas columnas son opcionales y
-- excluyentes en la práctica (la subida del portal fija una u otra).

alter table public.evidences
  add column breach_id uuid references public.diagnosis_breaches(id) on delete set null;

comment on column public.evidences.breach_id is
  'Brecha del diagnóstico que esta evidencia respalda (sub-proyecto #7). Null en evidencias del modelo por controles.';

create index evidences_breach_id_idx
  on public.evidences (breach_id)
  where breach_id is not null;
