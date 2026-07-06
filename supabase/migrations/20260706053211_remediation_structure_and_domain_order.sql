-- Estructura de propuestas de resolución (Fase 2) en el plan de adecuación.
-- Columnas nullable: no rompen las tareas manuales existentes (origin='manual').
alter table public.remediation_items
  add column if not exists priority text
    check (priority in ('alta', 'media', 'baja')),
  add column if not exists effort_estimate text
    check (effort_estimate in ('bajo', 'medio', 'alto')),
  add column if not exists origin text not null default 'manual'
    check (origin in ('manual', 'diagnosis')),
  add column if not exists control_code text,
  add column if not exists criterion_index int;

comment on column public.remediation_items.origin is
  'manual (creada por consultor) | diagnosis (propuesta IA aceptada)';

-- Orden conversacional del guion/cola (abierta -> específica). Pendiente de
-- validación consultor/abogado (mismo estatus que interview_questions).
update public.domains set sort = v.sort from (values
  ('DPC-FIN', 1), ('DPC-INV', 2), ('DPC-LIC', 3), ('DPC-PRO', 4),
  ('DPC-CAL', 5), ('DPC-TRA', 6), ('DPC-DER', 7), ('DPC-SEG', 8),
  ('DPC-CON', 9), ('DPC-RES', 10), ('DPC-TER', 11), ('DPC-SEN', 12),
  ('DPC-INC', 13), ('DPC-EIA', 14)
) as v(code, sort) where public.domains.code = v.code;
