-- Sub-proyecto #8: remoción de la maquinaria del modelo anterior.
-- El cumplimiento vive en el diagnóstico persistido (company_diagnoses +
-- diagnosis_breaches, sub-proyecto #1); el proceso por controles
-- (assessments/assessment_controls), la entrevista (interview_sessions),
-- los enlaces públicos (share_links) y el borrador de RAT de la entrevista
-- (processing_activities) quedan sin lectores ni escritores en el código.
--
-- Se conservan: controls/domains (catálogo de referencia del marco, usado por
-- plantillas y trazabilidad), evidences (re-basada a brechas en #7),
-- certificates (re-basado a la elegibilidad del modelo nuevo en #7),
-- company_risks, remediation_items, solution_catalog.

-- 1. RLS de consultor para el modelo nuevo: el equipo lee diagnósticos y
--    brechas directamente (antes solo el cliente tenía SELECT y el servidor
--    usaba service-role). Necesario para los listados/paneles re-cableados.
create policy company_diagnoses_staff_select on public.company_diagnoses
  for select using (public.is_consultant());

create policy diagnosis_breaches_staff_select on public.diagnosis_breaches
  for select using (public.is_consultant());

-- 2. Remoción del modelo anterior (orden por dependencias FK).
drop table if exists public.processing_activities;
drop table if exists public.share_links;
drop table if exists public.interview_sessions;
drop table if exists public.assessment_controls;
drop table if exists public.assessments;

-- 3. Enums que solo usaba el modelo anterior.
drop type if exists public.control_result;
drop type if exists public.assessment_status;
