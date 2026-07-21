-- ============================================================================
-- Seed DEMO — SOLO local/desarrollo. NUNCA aplicar en producción.
-- Se ejecuta después del seed canónico vía config.toml [db.seed].sql_paths.
-- Las 6 empresas demo del prototipo, con un ciclo de evaluación cada una.
--
-- TODOS los RUTs de este archivo son FICTICIOS, sin excepción. Incluido el de
-- Clínica Andes Salud: 76.421.905-K tiene dígito verificador inválido a
-- propósito (el DV módulo 11 correcto de 76.421.905 sería 8), de modo que no
-- pueda coincidir con un RUT real.
--
-- Convención UI (mapeo asumido): una evidencia requerida por la ficha
-- (controls.required_evidences) que NO tiene fila en public.evidences se
-- muestra como 'faltante'. evidences.status solo describe el estado de las
-- evidencias efectivamente aportadas (validated/partial/missing/rejected).
-- ============================================================================
begin;

-- Empresas demo (UUIDs fijos para idempotencia)
insert into public.companies
  (id, name, rut, sector_id, size_tier, employees_count, phase, complexity_score, contact, notes, created_at)
values
  ('20000000-0000-4000-8000-000000000001', 'Clínica Andes Salud', '76.421.905-K',
   (select id from public.sectors where code = 'salud'), 'enterprise', 480, 'certificacion', 88,
   '{"dpo": "M. Fuentes", "branches": 6}'::jsonb, 'Razón social: Clínica Andes Salud SpA. 6 sucursales.', '2026-05-02'),
  ('20000000-0000-4000-8000-000000000002', 'Aurora Pay', '77.102.334-6',
   (select id from public.sectors where code = 'fintech'), 'enterprise', 120, 'propuesta', 94,
   '{"dpo": "R. Cáceres"}'::jsonb, null, '2026-05-20'),
  ('20000000-0000-4000-8000-000000000003', 'Tienda Norte Retail', '76.884.221-0',
   (select id from public.sectors where code = 'retail'), 'small', 35, 'diagnostico', 62,
   '{}'::jsonb, 'Sin DPO designado.', '2026-06-19'),
  ('20000000-0000-4000-8000-000000000004', 'Nexo Servicios B2B', '76.550.912-3',
   (select id from public.sectors where code = 'b2b'), 'enterprise', 210, 'revalidacion', 68,
   '{"dpo": "C. Álvarez"}'::jsonb, null, '2026-03-26'),
  ('20000000-0000-4000-8000-000000000005', 'Kappa Labs', '77.410.087-5',
   (select id from public.sectors where code = 'startup'), 'micro', 9, 'diagnostico', 57,
   '{}'::jsonb, 'Sin DPO designado.', '2026-06-23'),
  ('20000000-0000-4000-8000-000000000006', 'RedFibra Telecom', '76.930.144-8',
   (select id from public.sectors where code = 'telco'), 'enterprise', 320, 'propuesta', 83,
   '{"dpo": "P. Rojas"}'::jsonb, null, '2026-05-29')
on conflict (id) do update set
  name = excluded.name,
  rut = excluded.rut,
  sector_id = excluded.sector_id,
  size_tier = excluded.size_tier,
  employees_count = excluded.employees_count,
  phase = excluded.phase,
  complexity_score = excluded.complexity_score,
  contact = excluded.contact,
  notes = excluded.notes;

-- ----------------------------------------------------------------------------
-- Diagnósticos del MODELO NUEVO (sub-proyecto #8: reemplaza a los seeds de
-- assessments/assessment_controls). Coherencia narrativa:
--   * Clínica Andes tiene certificado 'active': diagnóstico con todas sus
--     brechas resueltas (elegible bajo la regla "cero brechas abiertas").
--   * Aurora Pay está en 'propuesta': diagnóstico con brechas abiertas.
--   * Nexo (certificado revalidado): diagnóstico limpio de 2 brechas resueltas.
--   * Tienda Norte: recién diagnosticada, brechas abiertas.
-- ----------------------------------------------------------------------------

insert into public.company_diagnoses (id, company_id, source, answers, risk_level, total_breaches, status, created_at) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'consultant_assisted', '{}'::jsonb, 'alto',    4, 'active', '2026-05-02'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'self_service',        '{}'::jsonb, 'critico', 5, 'active', '2026-05-20'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', 'consultant_assisted', '{}'::jsonb, 'medio',   2, 'active', '2026-03-26'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'self_service',        '{}'::jsonb, 'alto',    3, 'active', '2026-06-19')
on conflict (id) do update set
  risk_level = excluded.risk_level,
  total_breaches = excluded.total_breaches,
  status = excluded.status;

insert into public.diagnosis_breaches
  (id, diagnosis_id, breach_code, area, area_label, severity, articles, fine_min_utm, fine_max_utm, description, dimension, resolution_status, resolved_at) values
  -- Clínica Andes: 4 brechas, todas resueltas (certificada)
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'B-SAL-001', 'SAL', 'Datos de salud',                 'critico', array['Ley 20.584 Arts. 12-15','Dto. 41/2013 MINSAL'], 10000, 20000, 'Fichas clínicas sin control de acceso por perfiles.', 9, 'resolved', '2026-06-20'),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'B-BIO-001', 'BIO', 'Datos biométricos',              'alto',    array['Art. 16 ter'],                                   2000, 10000, 'Control de asistencia biométrico sin información ni alternativa.', 9, 'resolved', '2026-06-22'),
  ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'B-SEG-003', 'SEG', 'Seguridad de la información',    'alto',    array['Art. 14 sexies'],                                2000, 10000, 'Sin protocolo de respuesta ante vulneraciones.', 6, 'resolved', '2026-06-24'),
  ('31000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'B-CON-001', 'CON', 'Conservación y eliminación de datos', 'medio', array['Art. 3° letra c)'],                          500,  5000,  'Datos conservados sin plazos de retención definidos.', 2, 'resolved', '2026-06-25'),
  -- Aurora Pay: 5 brechas abiertas (fintech en propuesta)
  ('31000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000002', 'B-LEG-002', 'LEG', 'Consentimiento y base de licitud', 'critico', array['Art. 16','Art. 16 bis'],                       5000, 20000, 'Datos financieros sensibles sin consentimiento expreso documentado.', 3, 'open', null),
  ('31000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000002', 'B-SEG-001', 'SEG', 'Seguridad de la información',    'critico', array['Art. 14 quinquies'],                             5000, 20000, 'Planillas con datos de deudores sin cifrado ni control de acceso.', 6, 'open', null),
  ('31000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000002', 'B-TER-002', 'TER', 'Proveedores y encargados',       'alto',    array['Art. 14 ter letra h)','Art. 15'],                2000, 10000, 'Datos en servidores extranjeros sin garantías contractuales.', 7, 'open', null),
  ('31000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000002', 'B-EIA-001', 'EIA', 'Decisiones automatizadas y evaluación de impacto', 'alto', array['Art. 8° bis'],                     2000, 10000, 'Scoring crediticio automatizado sin información ni revisión humana.', 8, 'open', null),
  ('31000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000002', 'B-INC-001', 'INC', 'Incidentes de seguridad',        'alto',    array['Art. 14 sexies'],                                2000, 10000, 'Incidentes pasados sin registro ni notificación.', 6, 'open', null),
  -- Nexo Servicios B2B: 2 brechas resueltas (revalidada)
  ('31000000-0000-4000-8000-000000000041', '30000000-0000-4000-8000-000000000004', 'B-CAP-001', 'CAP', 'Capacitación del personal',      'medio',   array['Art. 3° letra e)'],                              500,  5000,  'Personal sin capacitación en protección de datos.', 10, 'resolved', '2026-06-10'),
  ('31000000-0000-4000-8000-000000000042', '30000000-0000-4000-8000-000000000004', 'B-CON-002', 'TER', 'Proveedores y encargados',       'critico', array['Art. 15 bis','Art. 154 bis Código del Trabajo'], 5000, 20000, 'Estudio contable trata datos de trabajadores sin contrato de encargo.', 7, 'resolved', '2026-06-12'),
  -- Tienda Norte: 3 brechas abiertas (recién diagnosticada)
  ('31000000-0000-4000-8000-000000000031', '30000000-0000-4000-8000-000000000003', 'B-GOB-001', 'GOB', 'Gobernanza y transparencia',     'alto',    array['Art. 14 ter (12 literales)'],                    2000, 10000, 'Sin política de privacidad publicada.', 4, 'open', null),
  ('31000000-0000-4000-8000-000000000032', '30000000-0000-4000-8000-000000000003', 'B-LEG-001', 'LEG', 'Consentimiento y base de licitud', 'alto',  array['Art. 12','Art. 8° letra b)'],                    2000, 10000, 'Marketing por WhatsApp sin consentimiento previo.', 3, 'open', null),
  ('31000000-0000-4000-8000-000000000033', '30000000-0000-4000-8000-000000000003', 'B-CCT-001', 'CCT', 'Videovigilancia',                'medio',   array['DFL 3/2025'],                                    500,  5000,  'Cámaras sin aviso visible ni plazo de retención definido.', 9, 'open', null)
on conflict (id) do update set
  resolution_status = excluded.resolution_status,
  resolved_at = excluded.resolved_at;

-- ----------------------------------------------------------------------------
-- Riesgos identificados por empresa (subconjuntos del catálogo, reproduciendo
-- los conteos del prototipo: Clínica 3, Aurora 7, Tienda Norte 5, Nexo 1,
-- Kappa 6, RedFibra 4).
-- ----------------------------------------------------------------------------

-- Clínica Andes: 3 (biometría, cuentas clínicas, plan de brechas)
insert into public.company_risks (company_id, risk_id, impact, probability)
select '20000000-0000-4000-8000-000000000001', r.id, r.default_impact, r.default_probability
from public.risk_catalog r
where r.code in ('R-007', 'R-008', 'R-009')
on conflict (company_id, risk_id) do update set
  impact = excluded.impact,
  probability = excluded.probability;

-- Aurora Pay: los 7 del catálogo (fintech, perfil de mayor exposición)
insert into public.company_risks (company_id, risk_id, impact, probability)
select '20000000-0000-4000-8000-000000000002', r.id, r.default_impact, r.default_probability
from public.risk_catalog r
on conflict (company_id, risk_id) do update set
  impact = excluded.impact,
  probability = excluded.probability;

-- Tienda Norte Retail: 5 (transversales + Excel; sin R-007 biometría ni
-- R-008 cuentas clínicas/transaccionales, que no aplican a su operación)
insert into public.company_risks (company_id, risk_id, impact, probability)
select '20000000-0000-4000-8000-000000000003', r.id, r.default_impact, r.default_probability
from public.risk_catalog r
where r.code in ('R-001', 'R-002', 'R-004', 'R-005', 'R-009')
on conflict (company_id, risk_id) do update set
  impact = excluded.impact,
  probability = excluded.probability;

-- Nexo Servicios B2B: 1 riesgo residual en observación (empresa certificada
-- y revalidada: el resto se cerró en ciclos anteriores)
insert into public.company_risks (company_id, risk_id, impact, probability)
select '20000000-0000-4000-8000-000000000004', r.id, r.default_impact, r.default_probability
from public.risk_catalog r
where r.code in ('R-005')
on conflict (company_id, risk_id) do update set
  impact = excluded.impact,
  probability = excluded.probability;

-- Kappa Labs: 6 (startup micro sin procesos formales; todos menos R-008)
insert into public.company_risks (company_id, risk_id, impact, probability)
select '20000000-0000-4000-8000-000000000005', r.id, r.default_impact, r.default_probability
from public.risk_catalog r
where r.code in ('R-001', 'R-002', 'R-004', 'R-005', 'R-007', 'R-009')
on conflict (company_id, risk_id) do update set
  impact = excluded.impact,
  probability = excluded.probability;

-- RedFibra Telecom: 4 (transversales; en telco el foco es canal informal,
-- RAT desactualizado, políticas y plan de brechas)
insert into public.company_risks (company_id, risk_id, impact, probability)
select '20000000-0000-4000-8000-000000000006', r.id, r.default_impact, r.default_probability
from public.risk_catalog r
where r.code in ('R-001', 'R-002', 'R-005', 'R-009')
on conflict (company_id, risk_id) do update set
  impact = excluded.impact,
  probability = excluded.probability;

-- Plan de adecuación de Clínica Andes (prototipo PLAN; "En revisión" → in_progress)
insert into public.remediation_items
  (id, company_id, title, solution_id, responsible, due_date, status)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   'Redactar anexo de contrato para tratamiento biométrico',
   '10000000-0000-4000-8000-000000000003', 'Legal · A. Soto', '2026-07-15', 'in_progress'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
   'Implementar cifrado hash de templates biométricos',
   '10000000-0000-4000-8000-000000000002', 'TI · Infra', '2026-07-30', 'pending'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001',
   'Aprobar manual del plan de respuesta a incidentes',
   null, 'Dirección', '2026-07-10', 'in_progress'),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001',
   'Ejecutar simulacro de brecha de datos',
   null, 'TI · SecOps', '2026-08-20', 'pending'),
  ('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001',
   'Completar Registro de Actividades de Tratamiento',
   null, 'DPO', '2026-07-25', 'in_progress'),
  ('40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001',
   'Actualizar cláusulas con encargados de hosting',
   null, 'Legal', '2026-07-02', 'done'),
  ('40000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001',
   'Definir matriz de plazos de retención',
   null, 'DPO', '2026-08-12', 'pending')
on conflict (id) do update set
  title = excluded.title,
  solution_id = excluded.solution_id,
  responsible = excluded.responsible,
  due_date = excluded.due_date,
  status = excluded.status;

-- Repositorio documental de Clínica Andes (prototipo EVIDENCES).
-- Códigos obsoletos mapeados (analysis §4.3.1): GOV-002→RES-002, GOV-001→RES-001,
-- DAT-001→INV-001, SEC-001→SEG-001, THD-001→TER-001, SEC-002→SEG-002,
-- RGT-001→DER-001. 'Pendiente' del prototipo → 'partial' (en revisión).
-- Formulario_ARSOP_web.png renombrado a ARCOP. -- pendiente validación abogado
-- Recordatorio del mapeo UI: las evidencias requeridas que no aparecen acá
-- (p.ej. las de DPC-EIA-001) se muestran como 'faltante' — no llevan fila.
insert into public.evidences
  (id, company_id, control_id, name, storage_path, version, status, created_at)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   (select id from public.controls where code = 'DPC-RES-002'),
   'Politica_Tratamiento_v3.pdf',
   'evidences/20000000-0000-4000-8000-000000000001/Politica_Tratamiento_v3.pdf',
   3, 'validated', '2026-06-12'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
   (select id from public.controls where code = 'DPC-RES-001'),
   'Acta_Nombramiento_DPD.pdf',
   'evidences/20000000-0000-4000-8000-000000000001/Acta_Nombramiento_DPD.pdf',
   1, 'validated', '2026-06-10'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001',
   (select id from public.controls where code = 'DPC-INV-001'),
   'Matriz_RAT_procesos.xlsx',
   'evidences/20000000-0000-4000-8000-000000000001/Matriz_RAT_procesos.xlsx',
   1, 'partial', '2026-06-18'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001',
   (select id from public.controls where code = 'DPC-SEG-001'),
   'Logs_auditoria_Q2.csv',
   'evidences/20000000-0000-4000-8000-000000000001/Logs_auditoria_Q2.csv',
   1, 'partial', '2026-06-20'),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001',
   (select id from public.controls where code = 'DPC-TER-001'),
   'Contrato_Encargado_Hosting.pdf',
   'evidences/20000000-0000-4000-8000-000000000001/Contrato_Encargado_Hosting.pdf',
   1, 'rejected', '2026-06-05'),
  -- v2 del contrato de hosting: la v1 fue rechazada y el ítem del plan
  -- "Actualizar cláusulas con encargados de hosting" está 'done'; sin esta
  -- fila, DPC-TER-001 'compliant' no tendría evidencia válida que lo sustente.
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000001',
   (select id from public.controls where code = 'DPC-TER-001'),
   'Contrato_Encargado_Hosting_v2.pdf',
   'evidences/20000000-0000-4000-8000-000000000001/Contrato_Encargado_Hosting_v2.pdf',
   2, 'validated', '2026-06-26'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001',
   (select id from public.controls where code = 'DPC-SEG-002'),
   'Config_MFA_corporativa.pdf',
   'evidences/20000000-0000-4000-8000-000000000001/Config_MFA_corporativa.pdf',
   1, 'validated', '2026-06-14'),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001',
   (select id from public.controls where code = 'DPC-DER-001'),
   'Formulario_ARCOP_web.png',
   'evidences/20000000-0000-4000-8000-000000000001/Formulario_ARCOP_web.png',
   1, 'validated', '2026-06-09')
on conflict (id) do update set
  control_id = excluded.control_id,
  name = excluded.name,
  storage_path = excluded.storage_path,
  version = excluded.version,
  status = excluded.status;

-- Certificados demo (hashes ficticios).
-- Los códigos llevan sufijo ALEATORIO no adivinable (nada de correlativos
-- 1001, 1002…): la ruta pública de verificación no debe permitir enumerar
-- certificados. La generación real en la app (Fase C) debe usar un componente
-- aleatorio criptográfico (p.ej. 6+ caracteres base32) y rate limit en la
-- ruta pública de verificación.
insert into public.certificates
  (company_id, code, status, issued_at, valid_until, revalidated_at, sha256_hash)
values
  ('20000000-0000-4000-8000-000000000001', 'DPC-CA-2026-X7K4QZ', 'active',
   '2026-06-28', '2027-06-28', null,
   'a3f9c72e1d84b6a3f9c72e1d84b6a3f9c72e1d84b6a3f9c72e1d84b6a3f9c72e'),
  ('20000000-0000-4000-8000-000000000004', 'DPC-NX-2026-M3P8VW', 'active',
   '2025-06-15', '2027-06-20', '2026-06-20',
   '1d84b6a3f9c72e1d84b6a3f9c72e1d84b6a3f9c72e1d84b6a3f9c72e1d84b6a3')
on conflict (code) do update set
  company_id = excluded.company_id,
  status = excluded.status,
  issued_at = excluded.issued_at,
  valid_until = excluded.valid_until,
  revalidated_at = excluded.revalidated_at,
  sha256_hash = excluded.sha256_hash;

commit;
-- ============================================================================
-- FIN DEMO DATA
-- ============================================================================
