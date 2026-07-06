-- ============================================================================
-- Seed canónico de la plataforma DPC — IDEMPOTENTE (on conflict do update/nothing)
-- Fuentes: RFC.md §6-§9 y design/prototype.dc.html (arrays DOMAINS, CONTROLS,
--          RUBROS, RISKS, SOLUTIONS; extraídos literal, con las correcciones
--          del análisis design/prototype-analysis.md §4.3):
--   - "ARSOP" del prototipo unificado a "ARCOP" (estándar del RFC v0.4).
--   - Códigos obsoletos de EVIDENCES (DPC-GOV/DAT/SEC/THD/RGT) mapeados al
--     esquema v0.4 (DPC-RES/INV/SEG/TER/DER).
-- La data demo (empresas, evaluaciones, certificados) vive en
-- ./seeds/seed-demo.sql y SOLO se aplica en local (ver config.toml [db.seed]).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. SECTORS — 7 rubros con multiplicador sectorial (prototipo RUBROS)
-- ----------------------------------------------------------------------------
insert into public.sectors (code, name, complexity_multiplier, laws, sort) values
  ('otro',    'Otro / General',        1.00, array['Ley 21.719'], 0),
  ('retail',  'Retail / e-commerce',   1.20, array['Ley 19.496 (SERNAC)', 'Ley 21.719'], 1),
  ('fintech', 'Fintech / Financiero',  1.80, array['Circulares CMF', 'Ley 21.663', 'Ley 21.719'], 2),
  ('salud',   'Salud',                 1.70, array['Ley 20.584', 'Ley 21.719', 'DPC-SEN reforzado'], 3),
  ('b2b',     'Servicios B2B',         1.30, array['Código del Trabajo', 'Ley 21.719'], 4),
  ('telco',   'Telecomunicaciones',    1.60, array['Normas SUBTEL', 'Ley 21.663', 'Ley 21.719'], 5),
  ('startup', 'Startup tecnológica',   1.10, array['Ley 21.719', 'Ley 21.459'], 6),
  ('estado',  'Proveedor del Estado',  1.50, array['Ley 21.663 (ANCI)', 'Ley 21.719'], 7)
on conflict (code) do update set
  name = excluded.name,
  complexity_multiplier = excluded.complexity_multiplier,
  laws = excluded.laws,
  sort = excluded.sort;

-- ----------------------------------------------------------------------------
-- 2. DOMAINS — los 14 dominios exactos (RFC §6 / prototipo DOMAINS)
-- ----------------------------------------------------------------------------
insert into public.domains (code, name, principle, description, kind, sort) values
  -- 8 dominios por principio (Art. 3, Ley 21.719)
  ('DPC-LIC', 'Licitud y Lealtad', 'Licitud y lealtad',
   'Toda operación se apoya en una base legal válida (consentimiento, contrato, obligación legal, interés legítimo) y se trata al titular de forma leal. Cruce con Ley 19.496 (SERNAC).',
   'principle', 1),
  ('DPC-FIN', 'Finalidad', 'Finalidad',
   'Los datos se recolectan para fines determinados, explícitos y legítimos, y no se reutilizan para fines incompatibles. Incluye conservación limitada y borrado al cumplirse la finalidad.',
   'principle', 2),
  ('DPC-PRO', 'Proporcionalidad', 'Proporcionalidad',
   'Solo se tratan los datos estrictamente necesarios para la finalidad declarada (minimización). Se evita la recolección preventiva o excesiva.',
   'principle', 3),
  ('DPC-CAL', 'Calidad', 'Calidad',
   'Los datos se mantienen exactos, completos y actualizados, con mecanismos de corrección y depuración a lo largo de su ciclo de vida.',
   'principle', 4),
  ('DPC-RES', 'Responsabilidad', 'Responsabilidad (accountability)',
   'La organización puede demostrar su cumplimiento: gobernanza, DPD, Modelo de Prevención de Infracciones (MPI) y evidencia trazable. Cruce con ISO 27001.',
   'principle', 5),
  ('DPC-SEG', 'Seguridad', 'Seguridad',
   'Medidas técnicas y organizativas adecuadas al riesgo: cifrado, control de accesos y bitácoras. Cruce con Ley 21.459 (Delitos Informáticos) y exigencias CMF.',
   'principle', 6),
  ('DPC-TRA', 'Transparencia e Información', 'Transparencia e información',
   'El deber de información del Art. 14 ter: política de tratamiento pública, con fecha y versión, e información clara al titular sobre el uso de sus datos.',
   'principle', 7),
  ('DPC-CON', 'Confidencialidad', 'Confidencialidad',
   'Deber de secreto de quienes acceden a los datos, que se mantiene incluso terminada la relación. Acuerdos de confidencialidad y capacitación.',
   'principle', 8),
  -- 6 dominios complementarios (obligaciones operativas)
  ('DPC-INV', 'Inventario y RAT', 'Registro de Actividades de Tratamiento',
   'Levantamiento del inventario de datos y del Registro de Actividades de Tratamiento (RAT): qué se trata, con qué finalidad y base, con quién se comparte y por cuánto tiempo. Mapeo de flujos.',
   'complementary', 9),
  ('DPC-DER', 'Derechos de los Titulares', 'Derechos ARCOP',
   'Canal y procedimiento para ejercer los derechos de acceso, rectificación, supresión, oposición y portabilidad, con plazos auditables (30 días).',
   'complementary', 10),
  ('DPC-SEN', 'Datos Sensibles y Grupos Especiales', 'Régimen reforzado',
   'Protección reforzada para datos sensibles y de NNA. Cruce estricto con Ley 20.584 (Salud), biometría laboral y datos económico-financieros.',
   'complementary', 11),
  ('DPC-TER', 'Encargados y Transferencias', 'Encargados y transferencias internacionales',
   'Evaluación de encargados del tratamiento, contratos de encargo (DPA) y transferencias internacionales con garantías de adecuación.',
   'complementary', 12),
  ('DPC-INC', 'Incidentes y Brechas', 'Notificación de brechas (72 h)',
   'Detección, contención y notificación de brechas a la Agencia dentro de 72 horas y a los titulares cuando corresponda. Alineación con la Ley 21.663 (ANCI).',
   'complementary', 13),
  ('DPC-EIA', 'Evaluación de Impacto y Decisiones Automatizadas', 'EIPD · perfilamiento e IA',
   'Evaluación de Impacto (EIPD) para tratamientos de alto riesgo, y salvaguardas para decisiones automatizadas y perfilamiento: supervisión humana y explicabilidad.',
   'complementary', 14)
on conflict (code) do update set
  name = excluded.name,
  principle = excluded.principle,
  description = excluded.description,
  kind = excluded.kind,
  sort = excluded.sort;

-- ----------------------------------------------------------------------------
-- 3. CONTROLS — las 23 fichas completas (prototipo CONTROLS, texto literal)
--    sector_scope = NULL en todas: el marco base es transversal; la columna
--    queda reservada para las verticales sectoriales (RFC §20).
-- ----------------------------------------------------------------------------
insert into public.controls
  (code, domain_id, name, objective, detail, verification_criteria,
   legal_primary, legal_connected, risk_mitigated, required_evidences, laws, sector_scope, sort)
values
  -- ===== DPC-LIC — Licitud y Lealtad =====
  ('DPC-LIC-001', (select id from public.domains where code = 'DPC-LIC'),
   'Validación de bases de licitud y consentimiento',
   'Revisar términos, condiciones y formularios: el consentimiento debe ser libre, informado, específico, explícito y revocable.',
   'Este control determina si cada tratamiento de datos tiene un fundamento legal que lo habilite. No todo requiere consentimiento — pero cuando se usa, debe cumplir estándares estrictos. Se revisan formularios, casillas, políticas de privacidad y flujos de captura para confirmar que el consentimiento sea genuino y que existan mecanismos reales para revocarlo. Se cruza además con las exigencias de SERNAC en materia de cookies y perfilamiento comercial.',
   array[
     'Cada finalidad de tratamiento tiene identificada su base de licitud.',
     'El consentimiento se obtiene de forma libre, informada, específica y explícita.',
     'Existe un mecanismo operativo para revocar el consentimiento.',
     'Los avisos de privacidad y cookies cumplen las exigencias de la Ley 19.496.'
   ],
   'Ley N° 21.719 — Bases de licitud.',
   'Ley N° 19.496 (SERNAC) — cookies y perfilamiento comercial.',
   'Tratamiento sin base legal válida; sanciones por consentimiento defectuoso.',
   array['Inventario de bases de licitud por finalidad', 'Formularios de consentimiento actualizados'],
   array['Ley 21.719', 'Ley 19.496'], null, 10),

  -- ===== DPC-FIN — Finalidad =====
  ('DPC-FIN-001', (select id from public.domains where code = 'DPC-FIN'),
   'Finalidades determinadas, explícitas y legítimas',
   'Declarar para cada tratamiento una finalidad específica y legítima, e impedir su reutilización para fines incompatibles.',
   'Este control verifica que cada dato recolectado tenga un "para qué" claro, declarado al titular, y que no se use después para algo distinto sin una nueva base legal. Es frecuente que datos captados para una finalidad (ej. facturación) terminen usándose para otra (ej. marketing) sin aviso: eso vulnera el principio de finalidad. Se evalúa que las finalidades estén documentadas y que existan controles para detectar usos incompatibles.',
   array[
     'Cada tratamiento del RAT tiene una finalidad determinada y explícita.',
     'Las finalidades son legítimas y se informan al titular al momento de recolectar.',
     'No se reutilizan datos para fines incompatibles sin nueva base o consentimiento.',
     'Los cambios de finalidad se documentan y se comunican al titular.'
   ],
   'Ley N° 21.719 — Principio de finalidad.',
   null,
   'Uso de datos para fines distintos a los informados; pérdida de licitud sobrevenida.',
   array['Catálogo de finalidades por tratamiento', 'Cláusulas informativas de finalidad'],
   array['Ley 21.719'], null, 20),

  ('DPC-FIN-002', (select id from public.domains where code = 'DPC-FIN'),
   'Política de retención y borrado seguro',
   'Definir plazos legales de almacenamiento (registros tributarios, fichas clínicas) y procedimientos de borrado seguro.',
   'Los datos no pueden conservarse indefinidamente: deben eliminarse cuando ya no exista una finalidad o una obligación legal que justifique su almacenamiento. Este control evalúa que la organización tenga definidos, por categoría de dato, los plazos de conservación (por ejemplo tributarios o fichas clínicas bajo la Ley 20.584) y procedimientos de borrado seguro y verificable al vencer esos plazos.',
   array[
     'Existe una matriz de plazos de retención por categoría de dato.',
     'Los plazos se fundamentan en obligaciones legales o en la finalidad.',
     'El borrado es seguro, verificable y alcanza también a copias y respaldos.',
     'Se ejecutan y registran depuraciones periódicas de datos vencidos.'
   ],
   'Ley N° 21.719 — Principio de conservación limitada.',
   'Ley N° 20.584 (Salud) — fichas clínicas.',
   'Conservación indefinida de datos sin base legal; borrado no verificable.',
   array['Matriz de plazos de retención por categoría'],
   array['Ley 21.719', 'Ley 20.584'], null, 21),

  -- ===== DPC-PRO — Proporcionalidad =====
  ('DPC-PRO-001', (select id from public.domains where code = 'DPC-PRO'),
   'Minimización de datos recolectados',
   'Recolectar y conservar únicamente los datos estrictamente necesarios para la finalidad declarada.',
   'Se evalúa si la organización recolecta solo lo indispensable o si pide datos "por si acaso". Formularios con campos innecesarios, copias completas de cédula cuando basta un número, o bases con atributos que nadie usa son señales de sobre-recolección. El principio de proporcionalidad exige justificar cada dato frente a su finalidad y eliminar los que sobran.',
   array[
     'Cada campo recolectado se justifica frente a una finalidad concreta.',
     'Los formularios y sistemas no piden datos innecesarios o excesivos.',
     'Se revisan y depuran atributos que ya no se utilizan.',
     'Se prefiere la seudonimización o la agregación cuando es suficiente.'
   ],
   'Ley N° 21.719 — Principio de proporcionalidad (minimización).',
   null,
   'Superficie de exposición innecesaria; mayor impacto ante una brecha.',
   array['Revisión de formularios y campos por finalidad'],
   array['Ley 21.719'], null, 30),

  -- ===== DPC-CAL — Calidad =====
  ('DPC-CAL-001', (select id from public.domains where code = 'DPC-CAL'),
   'Exactitud y actualización de los datos',
   'Mantener los datos exactos, completos y actualizados, con mecanismos de corrección y depuración.',
   'Este control comprueba que la organización tenga procesos para que los datos no queden obsoletos o erróneos: actualización periódica, corrección a solicitud del titular y depuración de registros vencidos. Datos inexactos pueden derivar en decisiones equivocadas (cobranzas, scoring, comunicaciones) que afectan al titular y a la organización.',
   array[
     'Existen procesos para actualizar datos de forma periódica.',
     'Las solicitudes de rectificación se aplican en un plazo definido.',
     'Se detectan y corrigen duplicados e inconsistencias.',
     'Se depuran registros vencidos o sin finalidad vigente.'
   ],
   'Ley N° 21.719 — Principio de calidad.',
   null,
   'Decisiones basadas en datos inexactos; perjuicio al titular.',
   array['Procedimiento de actualización y rectificación', 'Registro de depuraciones'],
   array['Ley 21.719'], null, 40),

  -- ===== DPC-RES — Responsabilidad =====
  ('DPC-RES-001', (select id from public.domains where code = 'DPC-RES'),
   'Designación formal del Delegado de Protección de Datos (DPD)',
   'Formalizar el rol del DPD mediante resolución o acta de directorio, asegurando autonomía y canales de reporte directos a la alta dirección.',
   'Este control verifica que la organización cuente con una figura responsable, formalmente designada y con autoridad real, para supervisar el cumplimiento en materia de datos personales. No basta con que alguien "se encargue" del tema: la Ley exige poder demostrar quién responde, con qué mandato y ante quién reporta. Se evalúa la existencia del acto formal de nombramiento, la independencia funcional del cargo y la asignación de recursos suficientes para ejercerlo.',
   array[
     'Existe un acto formal (acta o resolución) que designa nominalmente al DPD.',
     'El DPD reporta directamente a la alta dirección, sin conflictos de interés con áreas que tratan datos.',
     'El descriptor de cargo define funciones, atribuciones y líneas de escalamiento.',
     'Se asignó presupuesto y tiempo dedicado para ejercer el rol.'
   ],
   'Ley N° 21.719 — Principio de responsabilidad demostrable.',
   'Lineamientos de gobernanza APDP.',
   'Ausencia de responsable formal; imposibilidad de acreditar gobernanza ante fiscalización.',
   array['Acta de nombramiento del DPD firmada por directorio', 'Descriptor de cargo con líneas de reporte', 'Asignación presupuestaria explícita'],
   array['Ley 21.719'], null, 50),

  ('DPC-RES-002', (select id from public.domains where code = 'DPC-RES'),
   'Política corporativa de gobierno de datos aprobada por directorio',
   'Contar con una política marco de tratamiento de datos personales, revisada y aprobada al máximo nivel.',
   'Se evalúa que exista un documento rector, aprobado al máximo nivel de la organización, que fije los principios, roles y reglas para tratar datos personales. Esta política es el "paraguas" del que dependen todos los demás procedimientos: define qué se puede hacer con los datos, quién decide y bajo qué criterios. La revisión comprueba que sea vigente, versionada, difundida al personal y respaldada por una decisión formal del directorio.',
   array[
     'La política cubre principios, roles, finalidades y reglas de tratamiento.',
     'Está aprobada formalmente por el directorio o la máxima autoridad.',
     'Se encuentra versionada y con fecha de última revisión vigente.',
     'Fue comunicada y es accesible para todo el personal.'
   ],
   'Ley N° 21.719 — Deberes del responsable.',
   'ISO/IEC 27001 (Anexo A).',
   'Gestión informal sin respaldo documental de decisiones.',
   array['Política de tratamiento vigente y versionada', 'Acta de aprobación de directorio'],
   array['Ley 21.719', 'ISO 27001'], null, 51),

  ('DPC-RES-003', (select id from public.domains where code = 'DPC-RES'),
   'Centralización documental de evidencias multi-agencia',
   'Resguardar bitácoras y centralizar la prueba admisible ante auditorías o fiscalizaciones de múltiples agencias.',
   'El principio de responsabilidad demostrable exige no solo cumplir, sino poder probarlo. Este control evalúa que las evidencias de cumplimiento estén centralizadas, indexadas por control y versionadas, de modo que ante una fiscalización de la APDP —o de otra agencia como la ANCI o SERNAC— la prueba esté disponible de inmediato y sea admisible, sin depender de búsquedas dispersas en correos o carpetas personales.',
   array[
     'Las evidencias están centralizadas en un repositorio único indexado por control.',
     'Cada evidencia registra versión, fecha y responsable.',
     'La prueba está disponible de forma inmediata ante requerimientos multi-agencia.',
     'Existe control de acceso y trazabilidad sobre el propio repositorio.'
   ],
   'Ley N° 21.719 — Responsabilidad demostrable.',
   null,
   'Evidencia dispersa e indisponible ante inspección de la APDP.',
   array['Repositorio documental indexado', 'Bitácora de versiones y firmas'],
   array['Ley 21.719'], null, 52),

  ('DPC-RES-004', (select id from public.domains where code = 'DPC-RES'),
   'Modelo de Prevención de Infracciones (MPI)',
   'Adoptar un Modelo de Prevención de Infracciones con sus contenidos mínimos; su certificación opera como atenuante ante la Agencia.',
   'El MPI es el marco formal de prevención que la ley incentiva: reúne gobernanza y roles, designación del DPD, inventario y mapeo de flujos, matriz de riesgos y plan de mitigación, políticas y gestión de terceros. Contar con un MPI certificado es una circunstancia atenuante ante la Agencia. Se evalúa que el modelo exista, esté aprobado y sea operativo — no solo documental.',
   array[
     'El MPI cubre gobernanza, DPD, inventario, matriz de riesgos y gestión de terceros.',
     'Está formalmente aprobado por la alta dirección.',
     'Cuenta con un responsable y un plan de mitigación con seguimiento.',
     'Es operativo y auditable, no meramente declarativo.'
   ],
   'Ley N° 21.719 — Modelo de Prevención de Infracciones (atenuante).',
   'ISO/IEC 27001 — sistema de gestión.',
   'Pérdida del atenuante; gestión de riesgos informal y no acreditable.',
   array['Documento del MPI aprobado', 'Matriz de riesgos y plan de mitigación'],
   array['Ley 21.719'], null, 53),

  -- ===== DPC-SEG — Seguridad =====
  ('DPC-SEG-001', (select id from public.domains where code = 'DPC-SEG'),
   'Control de accesos y trazabilidad (logs inalterables)',
   'Implementar políticas de mínimo privilegio y bitácoras inalterables de consulta, modificación o eliminación de datos.',
   'Este control comprueba que solo las personas autorizadas accedan a los datos, con el mínimo privilegio necesario, y que toda acción quede registrada de forma inalterable. La trazabilidad permite reconstruir quién hizo qué ante un incidente o una fiscalización. Se evalúa la existencia de un modelo de roles (RBAC), la revisión periódica de accesos y la integridad de las bitácoras de auditoría.',
   array[
     'Los accesos se otorgan por rol bajo el principio de mínimo privilegio.',
     'Se registran consultas, modificaciones y eliminaciones de datos personales.',
     'Las bitácoras son inalterables y se conservan por un plazo definido.',
     'Existe revisión periódica y revocación oportuna de accesos.'
   ],
   'Ley N° 21.719 — Medidas de seguridad.',
   'Ley N° 21.459 — Delitos informáticos (acceso ilícito).',
   'Imposibilidad de acreditar quién accedió a los datos; pérdida de trazabilidad forense.',
   array['Política de control de accesos (RBAC)', 'Muestra de logs de auditoría inalterables'],
   array['Ley 21.459', 'Ley 21.719'], null, 60),

  ('DPC-SEG-002', (select id from public.domains where code = 'DPC-SEG'),
   'Cifrado en tránsito y reposo + MFA',
   'Desplegar cifrado de datos en tránsito y reposo, contraseñas robustas, MFA y respaldos periódicos aislados.',
   'Se evalúan las medidas técnicas de base que protegen los datos frente a intrusiones o pérdida de dispositivos. El cifrado en tránsito y en reposo asegura que, aun interceptados o robados, los datos sean ilegibles; la autenticación multifactor (MFA) reduce el riesgo de accesos indebidos; y los respaldos aislados garantizan la recuperación ante ransomware o fallas. Se comprueba su implementación efectiva, no solo su enunciado en una política.',
   array[
     'Los datos se cifran en tránsito (TLS) y en reposo con estándares vigentes.',
     'La autenticación multifactor está activa en accesos críticos.',
     'Existe política de contraseñas robustas aplicada técnicamente.',
     'Se realizan respaldos periódicos, aislados y probados en su restauración.'
   ],
   'Ley N° 21.719 — Seguridad de la información.',
   null,
   'Exposición de datos en caso de intrusión o pérdida de dispositivos.',
   array['Configuración TLS y cifrado en reposo', 'Política de MFA corporativa'],
   array['Ley 21.719'], null, 61),

  -- ===== DPC-TRA — Transparencia e Información =====
  ('DPC-TRA-001', (select id from public.domains where code = 'DPC-TRA'),
   'Deber de información y política pública de tratamiento (Art. 14 ter)',
   'Publicar y mantener disponible la política de tratamiento con su fecha y versión, e informar al titular de forma clara y accesible.',
   'La ley obliga a mantener permanentemente a disposición del público —en el sitio web o medio equivalente— la política de tratamiento adoptada, con su fecha y versión, la individualización del responsable y su representante. Este control verifica que esa información exista, esté actualizada y sea comprensible para el titular, no un texto legal ilegible enterrado en el pie de página.',
   array[
     'La política de tratamiento está publicada y accesible al público.',
     'Indica fecha, versión e individualización del responsable.',
     'La información al titular es clara, precisa e inequívoca.',
     'Se actualiza cuando cambian los tratamientos o la normativa.'
   ],
   'Ley N° 21.719 — Art. 14 ter, deber de información y transparencia.',
   null,
   'Falta de transparencia; infracción por no informar al titular.',
   array['Política de privacidad publicada con versión y fecha', 'Aviso de tratamiento en puntos de recolección'],
   array['Ley 21.719'], null, 70),

  -- ===== DPC-CON — Confidencialidad =====
  ('DPC-CON-001', (select id from public.domains where code = 'DPC-CON'),
   'Deber de secreto y acuerdos de confidencialidad',
   'Garantizar la confidencialidad de quienes acceden a datos personales, incluso terminada la relación, mediante compromisos formales y capacitación.',
   'Quienes tratan datos personales están obligados a guardar secreto, y esa obligación subsiste aun después de terminado el vínculo laboral o contractual. Este control verifica que existan cláusulas de confidencialidad firmadas, que el personal esté capacitado sobre el deber de secreto y que la obligación se extienda a terceros y ex-colaboradores.',
   array[
     'El personal que accede a datos firma compromisos de confidencialidad.',
     'La obligación de secreto subsiste tras el término de la relación.',
     'Se capacita al personal sobre el deber de confidencialidad.',
     'Las cláusulas se extienden a encargados y terceros.'
   ],
   'Ley N° 21.719 — Principio de confidencialidad.',
   null,
   'Divulgación indebida de datos por personal o ex-colaboradores.',
   array['Cláusulas de confidencialidad firmadas', 'Registro de capacitaciones'],
   array['Ley 21.719'], null, 80),

  -- ===== DPC-INV — Inventario y RAT =====
  ('DPC-INV-001', (select id from public.domains where code = 'DPC-INV'),
   'Registro de Actividades de Tratamiento (RAT)',
   'Levantar un inventario exhaustivo de bases de datos: qué se recolecta, finalidad, ubicación, accesos y plazos de retención.',
   'Este control confirma que la organización sabe exactamente qué datos personales trata, para qué, dónde residen y quién accede a ellos. El RAT es la base de todo el sistema de cumplimiento: sin él es imposible responder derechos, evaluar riesgos o notificar brechas. Se evalúa la cobertura del inventario (que no falten procesos), su nivel de detalle y su actualización periódica frente a cambios en el negocio.',
   array[
     'El RAT cubre todos los procesos de negocio que tratan datos personales.',
     'Cada actividad registra finalidad, categorías de datos, base de licitud y plazo de retención.',
     'Se identifican sistemas, ubicaciones y responsables de cada base.',
     'El registro se actualiza ante nuevos tratamientos o cambios relevantes.'
   ],
   'Ley N° 21.719 — Registro de actividades.',
   'Modelo de madurez APDP (Normativa interna).',
   'Falta de visibilidad sobre flujos y categorías de datos tratados internamente.',
   array['Matriz RAT por proceso de negocio', 'Diagrama de flujos de datos'],
   array['Ley 21.719'], null, 90),

  ('DPC-INV-002', (select id from public.domains where code = 'DPC-INV'),
   'Mapeo del ciclo de vida y flujos transfronterizos',
   'Documentar el ciclo de vida completo del dato desde su recolección hasta su eliminación, incluyendo transferencias.',
   'Se evalúa si la organización tiene trazado el recorrido completo de cada dato: cómo se recolecta, por qué sistemas pasa, con quién se comparte y cuándo se elimina — con especial foco en las salidas al extranjero. Muchas empresas transfieren datos a proveedores cloud o casas matrices sin advertirlo. El control verifica que esos flujos estén identificados y amparados por un mecanismo de transferencia válido.',
   array[
     'Existe un diagrama del ciclo de vida del dato de extremo a extremo.',
     'Se identifican todas las transferencias hacia terceros y hacia el extranjero.',
     'Cada transferencia internacional cuenta con un mecanismo de resguardo válido.',
     'Se documenta el punto y método de eliminación al final del ciclo.'
   ],
   'Ley N° 21.719 — Transferencia internacional.',
   null,
   'Transferencias no controladas hacia encargados en el extranjero.',
   array['Inventario de flujos transfronterizos'],
   array['Ley 21.719'], null, 91),

  -- ===== DPC-DER — Derechos de los Titulares =====
  -- Corrección del análisis §4.3.2: el prototipo decía "ARSOP"; el RFC v0.4
  -- fija "ARCOP". -- pendiente validación abogado: acrónimo ARCOP vs la lista
  -- literal (acceso, rectificación, supresión, oposición, portabilidad).
  ('DPC-DER-001', (select id from public.domains where code = 'DPC-DER'),
   'Canal habilitado para derechos ARCOP',
   'Habilitar un canal formal exclusivo para Acceso, Rectificación, Supresión, Oposición y Portabilidad.',
   'Se evalúa si los titulares de datos pueden ejercer efectivamente sus derechos y si la organización está preparada para responderlos dentro de plazo. No basta con un correo genérico: debe existir un canal identificable, un procedimiento de verificación de identidad y un flujo interno que garantice respuesta oportuna y trazable a cada solicitud.',
   array[
     'Existe un canal formal, visible y exclusivo para solicitudes ARCOP.',
     'Hay un procedimiento de verificación de identidad del solicitante.',
     'Se cumplen los plazos legales de respuesta con registro de cada gestión.',
     'El flujo interno asigna responsables para tramitar cada tipo de derecho.'
   ],
   'Ley N° 21.719 — Derechos del titular.',
   null,
   'Incumplimiento de plazos legales de respuesta a titulares.',
   array['Formulario web ARCOP publicado', 'Protocolo de verificación de identidad'],
   array['Ley 21.719'], null, 100),

  -- ===== DPC-SEN — Datos Sensibles y Grupos Especiales =====
  ('DPC-SEN-001', (select id from public.domains where code = 'DPC-SEN'),
   'Medidas reforzadas para datos biométricos laborales',
   'Aplicar protección especial a datos biométricos de control de asistencia conforme a los dictámenes de la Dirección del Trabajo.',
   'Los datos biométricos (huella, rostro) son datos sensibles y su uso para control de asistencia está especialmente regulado. Este control verifica que, cuando se emplea biometría laboral, existan resguardos reforzados: consentimiento o base habilitante adecuada, cifrado irreversible de las plantillas y alternativas para quien no desee entregar su biometría, conforme a los dictámenes de la Dirección del Trabajo.',
   array[
     'El tratamiento biométrico está justificado y documentado en anexo contractual.',
     'Las plantillas biométricas se almacenan cifradas de forma irreversible (hash).',
     'Existe una alternativa de marcación para trabajadores que no consientan.',
     'Se define enrolamiento controlado y eliminación al término de la relación laboral.'
   ],
   'Ley N° 21.719 — Datos sensibles.',
   'Código del Trabajo y dictámenes DT.',
   'Uso de biometría sin resguardo del dato sensible del trabajador.',
   array['Anexo de contrato sobre tratamiento biométrico', 'Evidencia de cifrado irreversible (hash) de templates'],
   array['Código del Trabajo', 'Ley 21.719'], null, 110),

  -- ===== DPC-TER — Encargados y Transferencias =====
  ('DPC-TER-001', (select id from public.domains where code = 'DPC-TER'),
   'Contratos con encargados del tratamiento',
   'Auditar terceros (hosting, CRM, marketing) e incorporar cláusulas estrictas de cumplimiento y penalizaciones.',
   'Cuando un tercero trata datos por cuenta de la organización (hosting, CRM, marketing, nómina), la responsabilidad no se traspasa: se comparte. Este control verifica que todos esos encargados estén identificados, evaluados en su nivel de seguridad y vinculados por un contrato que fije obligaciones de confidencialidad, seguridad, sub-encargo y devolución o eliminación de datos al término del servicio.',
   array[
     'Existe un inventario actualizado de encargados y sub-encargados.',
     'Cada encargado crítico cuenta con contrato con cláusulas de tratamiento.',
     'Se evalúa el nivel de seguridad del proveedor antes de contratarlo.',
     'El contrato regula confidencialidad, brechas y devolución/eliminación de datos.'
   ],
   'Ley N° 21.719 — Encargado de tratamiento.',
   null,
   'Responsabilidad solidaria por incumplimientos de proveedores.',
   array['Inventario de encargados críticos', 'Cláusulas de tratamiento en contratos vigentes'],
   array['Ley 21.719'], null, 120),

  ('DPC-TER-002', (select id from public.domains where code = 'DPC-TER'),
   'Transferencias internacionales con garantías de adecuación',
   'Asegurar que toda transferencia de datos al extranjero cuente con un mecanismo de resguardo válido conforme a la ley.',
   'Cuando los datos salen del país —hacia una casa matriz, un proveedor cloud o un subcontratista— la ley exige que exista una garantía de adecuación o una autorización. Este control identifica todas las transferencias internacionales y verifica que estén amparadas por cláusulas contractuales, normas de adecuación o el consentimiento del titular cuando corresponda.',
   array[
     'Se identifican todas las transferencias internacionales de datos.',
     'Cada transferencia cuenta con un mecanismo de resguardo válido.',
     'Los contratos con destinatarios en el extranjero incluyen garantías.',
     'Se documenta el país de destino y el nivel de protección.'
   ],
   'Ley N° 21.719 — Transferencia internacional de datos.',
   null,
   'Salida de datos sin garantías; transferencia ilícita.',
   array['Inventario de transferencias internacionales'],
   array['Ley 21.719'], null, 121),

  -- ===== DPC-INC — Incidentes y Brechas =====
  ('DPC-INC-001', (select id from public.domains where code = 'DPC-INC'),
   'Plan de respuesta ante brechas de seguridad',
   'Estructurar un protocolo de incidentes con responsables para contener filtraciones y notificar a la APDP y afectados.',
   'Este control evalúa si la organización sabe qué hacer cuando ocurre una brecha. Un plan de respuesta define cómo detectar, contener, evaluar y notificar un incidente, con roles claros y plazos acotados. La Ley obliga a notificar oportunamente a la Agencia y, en ciertos casos, a los afectados; sin un plan, esa notificación llega tarde o no llega, agravando la sanción y el daño.',
   array[
     'Existe un manual de respuesta con fases de detección, contención y cierre.',
     'Están definidos los roles, responsables y vías de escalamiento.',
     'Se fijan criterios y plazos para notificar a la APDP y a los afectados.',
     'El plan contempla registro y evaluación posterior de cada incidente.'
   ],
   'Ley N° 21.719 — Notificación de brechas.',
   'Ley N° 21.663 — Marco de Ciberseguridad (ANCI).',
   'Sanciones por notificación tardía; propagación no contenida del incidente.',
   array['Manual del plan de respuesta a incidentes', 'Matriz de roles y escalamiento'],
   array['Ley 21.719', 'Ley 21.663'], null, 130),

  ('DPC-INC-002', (select id from public.domains where code = 'DPC-INC'),
   'Protocolo de reporte e historial de incidentes de seguridad',
   'Garantizar la capacidad operativa de identificar, mitigar y notificar oportunamente brechas de seguridad que afecten datos personales corporativos.',
   'Complementa al plan de respuesta verificando la operación real: que exista un registro histórico centralizado de eventos de seguridad, un protocolo de reporte conocido por el personal y evidencia de que la organización ejercita su capacidad (simulacros). Se evalúa que la doble obligación de notificación —a la APDP por datos personales y a la ANCI/CSIRT por ciberseguridad en servicios esenciales— esté cubierta y sea trazable.',
   array[
     'Existe un registro histórico y centralizado de eventos e incidentes.',
     'El protocolo de reporte es conocido y accesible para el personal.',
     'Se cubre la doble notificación aplicable: APDP y ANCI/CSIRT.',
     'Se ejecutan simulacros de brecha con evidencia de los últimos 12 meses.'
   ],
   'Ley N° 21.719 — Obligación de notificación a la Agencia de Protección de Datos.',
   'Ley N° 21.663 — Marco de Ciberseguridad (notificación a la ANCI / CSIRT nacional para servicios esenciales).',
   'Sanciones por ocultamiento o retraso en reportes de brechas; pérdida de trazabilidad forense.',
   array['Manual del Plan de Respuesta ante Incidentes aprobado por la alta dirección', 'Registro o log histórico de eventos de seguridad centralizado', 'Evidencia de simulacro de brecha de datos ejecutado en los últimos 12 meses'],
   array['Ley 21.719', 'Ley 21.663'], null, 131),

  -- ===== DPC-EIA — Evaluación de Impacto y Decisiones Automatizadas =====
  ('DPC-EIA-001', (select id from public.domains where code = 'DPC-EIA'),
   'Evaluación de Impacto (EIPD) en tratamientos de alto riesgo',
   'Realizar una evaluación de impacto previa y documentada cuando el tratamiento conlleva alto riesgo para los titulares.',
   'La EIPD es obligatoria cuando el tratamiento entraña alto riesgo: tratamiento a gran escala de datos sensibles, perfilamiento automatizado, videovigilancia masiva en espacios públicos, o combinación de fuentes que amplíe el riesgo. Este control verifica que la organización identifique esos tratamientos y ejecute la evaluación antes de iniciarlos, documentando riesgos y medidas de mitigación.',
   array[
     'Se identifican los tratamientos de alto riesgo que requieren EIPD.',
     'La evaluación es previa al inicio del tratamiento.',
     'Documenta riesgos, impacto y medidas de mitigación.',
     'Se revisa periódicamente y ante cambios relevantes.'
   ],
   'Ley N° 21.719 — Evaluación de impacto en protección de datos.',
   null,
   'Tratamiento de alto riesgo sin análisis previo; daño a los titulares.',
   array['Metodología y plantilla de EIPD', 'EIPD ejecutadas por tratamiento de alto riesgo'],
   array['Ley 21.719'], null, 140),

  ('DPC-EIA-002', (select id from public.domains where code = 'DPC-EIA'),
   'Salvaguardas para decisiones automatizadas y perfilamiento',
   'Garantizar supervisión humana y explicabilidad cuando se toman decisiones automatizadas que afectan a las personas.',
   'Si la organización usa algoritmos para decisiones que afectan a personas —scoring crediticio, preselección de CVs, pricing personalizado— el titular tiene derecho a no quedar sujeto a una decisión basada únicamente en tratamiento automatizado. Este control verifica que exista intervención humana significativa, información sobre la lógica aplicada y un canal para impugnar la decisión.',
   array[
     'Se inventarían los procesos con decisiones automatizadas o perfilamiento.',
     'Existe supervisión humana significativa sobre la decisión.',
     'Se informa al titular sobre la lógica y consecuencias del tratamiento.',
     'Hay un canal para revisar o impugnar la decisión automatizada.'
   ],
   'Ley N° 21.719 — Derecho frente a decisiones automatizadas.',
   'ISO/IEC 42001 — gestión de IA responsable.',
   'Decisiones automatizadas sin control ni explicabilidad; discriminación algorítmica.',
   array['Inventario de sistemas de decisión automatizada', 'Procedimiento de revisión humana e impugnación'],
   array['Ley 21.719'], null, 141)
on conflict (code) do update set
  domain_id = excluded.domain_id,
  name = excluded.name,
  objective = excluded.objective,
  detail = excluded.detail,
  verification_criteria = excluded.verification_criteria,
  legal_primary = excluded.legal_primary,
  legal_connected = excluded.legal_connected,
  risk_mitigated = excluded.risk_mitigated,
  required_evidences = excluded.required_evidences,
  laws = excluded.laws,
  sector_scope = excluded.sector_scope,
  sort = excluded.sort;

-- Reglas de aplicabilidad por dominio/control (ver
-- supabase/migrations/20260705141000_control_applicability.sql). Se repiten
-- aquí para que un reset del catálogo (seed) las conserve. Ante duda se deja
-- null = siempre aplica.
update public.controls c set applies_when = '{"factors_any":["sensitive_data"]}'::jsonb
  from public.domains d where c.domain_id = d.id and d.code = 'DPC-SEN';

update public.controls c set applies_when = '{"factors_any":["automated_decisions"]}'::jsonb
  from public.domains d where c.domain_id = d.id and d.code = 'DPC-EIA';

-- DPC-TER mezcla transferencias internacionales y encargados del tratamiento:
--   DPC-TER-001 "Contratos con encargados del tratamiento" -> critical_providers
--   DPC-TER-002 "Transferencias internacionales con garantías de adecuación" -> international_transfers
update public.controls c set applies_when = '{"factors_any":["critical_providers"]}'::jsonb
  where c.code = 'DPC-TER-001';

update public.controls c set applies_when = '{"factors_any":["international_transfers"]}'::jsonb
  where c.code = 'DPC-TER-002';

-- Guion de entrevista: preguntas conversacionales por control (ver
-- supabase/migrations/20260706130000_control_interview_questions.sql). Se
-- repiten aquí para que un reset del catálogo (seed) las conserve.
-- Contenido = DRAFT nuestro, pendiente de revisión de consultor/abogado.
update public.controls set interview_questions = array[
  '¿Con qué autorización tratan cada tipo de dato: consentimiento del cliente, un contrato, la ley, u otra razón?',
  '¿Cómo pide el consentimiento (por ejemplo, en formularios o cookies) y qué tan fácil es para la persona decir que no o arrepentirse después?'
] where code = 'DPC-LIC-001';

update public.controls set interview_questions = array[
  '¿Para qué usan cada dato que le piden al cliente o trabajador, y se lo explican al momento de pedirlo?',
  '¿Alguna vez han usado datos que recolectaron para un fin distinto al original (por ejemplo, para hacer marketing con datos de una venta)? ¿Avisaron a la persona?'
] where code = 'DPC-FIN-001';

update public.controls set interview_questions = array[
  '¿Por cuánto tiempo guardan los distintos tipos de datos (boletas, fichas, currículums) y quién decidió esos plazos?',
  'Cuando ya no necesitan un dato, ¿cómo lo eliminan, y eso incluye también los respaldos o copias de seguridad?'
] where code = 'DPC-FIN-002';

update public.controls set interview_questions = array[
  '¿Piden en sus formularios o sistemas algún dato que en realidad no usan para nada? ¿Cada campo tiene un motivo claro?'
] where code = 'DPC-PRO-001';

update public.controls set interview_questions = array[
  '¿Cómo mantienen actualizados los datos de sus clientes o trabajadores, y qué hacen si alguien les pide corregir un dato erróneo?',
  '¿Revisan de vez en cuando si tienen datos duplicados, viejos o que ya no corresponden?'
] where code = 'DPC-CAL-001';

update public.controls set interview_questions = array[
  '¿Tienen a alguien designado formalmente (con un documento, no solo de palabra) como responsable de la protección de datos? ¿A quién le reporta y tiene tiempo o presupuesto asignado para esa labor?'
] where code = 'DPC-RES-001';

update public.controls set interview_questions = array[
  '¿Existe un documento aprobado formalmente por la dueña/dueño o directorio que explique cómo tratan los datos personales en la empresa, y todo el personal lo conoce?'
] where code = 'DPC-RES-002';

update public.controls set interview_questions = array[
  'Si un organismo fiscalizador les pidiera mañana pruebas de que cumplen con protección de datos, ¿dónde están guardadas esas pruebas y qué tan rápido las podrían mostrar?'
] where code = 'DPC-RES-003';

update public.controls set interview_questions = array[
  '¿Tienen algún plan formal (aprobado por la dirección, con un responsable a cargo) que junte cómo gestionan los riesgos de datos personales en la empresa, o cada cosa se maneja por separado?'
] where code = 'DPC-RES-004';

update public.controls set interview_questions = array[
  '¿Quién puede ver o modificar los datos de clientes y trabajadores, y eso se decide según lo que cada persona realmente necesita para su trabajo?',
  '¿Queda algún registro de quién entró, modificó o borró esos datos, y revisan o quitan accesos cuando alguien deja de necesitarlos (por ejemplo, al dejar la empresa)?'
] where code = 'DPC-SEG-001';

update public.controls set interview_questions = array[
  '¿Los sistemas que usan (correo, planillas, software) piden algo más que una contraseña para entrar, como un código al celular?',
  '¿Hacen respaldos periódicos de la información y los guardan en un lugar distinto al de los datos originales, por si pasa algo?'
] where code = 'DPC-SEG-002';

update public.controls set interview_questions = array[
  '¿Tienen publicada en algún lugar visible (web, local, contrato) una política que explique de forma clara cómo tratan los datos, con fecha de cuándo se actualizó?'
] where code = 'DPC-TRA-001';

update public.controls set interview_questions = array[
  '¿El personal que ve datos de clientes o trabajadores firma algún compromiso de confidencialidad, y esa obligación sigue vigente aunque la persona deje de trabajar con ustedes?',
  '¿Sus proveedores externos (contador, informática, etc.) también están obligados por contrato a mantener esa confidencialidad?'
] where code = 'DPC-CON-001';

update public.controls set interview_questions = array[
  '¿Tienen un listado completo de todos los procesos donde manejan datos personales (ventas, RRHH, marketing, etc.), detallando qué dato es, para qué es y por cuánto tiempo se guarda?',
  '¿Ese listado se actualiza cuando parte un proceso o sistema nuevo que usa datos personales?'
] where code = 'DPC-INV-001';

update public.controls set interview_questions = array[
  '¿Podrían explicar el recorrido completo de un dato desde que lo reciben hasta que lo eliminan, incluyendo si en algún punto sale de Chile (por ejemplo, a un proveedor en el extranjero)?'
] where code = 'DPC-INV-002';

update public.controls set interview_questions = array[
  '¿Tienen un canal claro (correo, formulario) donde una persona pueda pedir ver, corregir, eliminar u oponerse al uso de sus datos, y cómo verifican que quien pide es realmente esa persona?',
  '¿En cuánto tiempo suelen responder esas solicitudes y queda algún registro de cómo se resolvieron?'
] where code = 'DPC-DER-001';

update public.controls set interview_questions = array[
  'Si usan huella o reconocimiento facial para marcar asistencia, ¿esa información se guarda de forma protegida (no como una foto o huella "en crudo"), y qué pasa si un trabajador no quiere usar ese sistema?',
  '¿Qué hacen con los datos biométricos de una persona cuando deja de trabajar con ustedes?'
] where code = 'DPC-SEN-001';

update public.controls set interview_questions = array[
  '¿Tienen identificados todos los proveedores externos que manejan datos por ustedes (hosting, CRM, marketing, contabilidad)?',
  'Con esos proveedores, ¿firmaron algún contrato que diga cómo deben cuidar los datos, qué pasa si hay una filtración, y que devuelvan o eliminen la información al terminar el servicio?'
] where code = 'DPC-TER-001';

update public.controls set interview_questions = array[
  '¿Guardan o comparten datos con algún proveedor o servidor fuera de Chile? ¿En qué país está y qué garantías de protección tienen firmadas con ellos?'
] where code = 'DPC-TER-002';

update public.controls set interview_questions = array[
  'Si hoy se filtraran o perdieran datos de clientes o trabajadores, ¿tienen definido qué hacer, quién actúa primero y a quién avisar (autoridad y afectados) y en qué plazo?'
] where code = 'DPC-INC-001';

update public.controls set interview_questions = array[
  '¿Han tenido incidentes de seguridad (pérdida, filtración, acceso indebido) en el último tiempo? ¿Queda un registro histórico de esos casos y el personal sabe cómo reportar uno si ocurre?',
  '¿Alguna vez han hecho un simulacro o prueba de qué pasaría ante una filtración de datos, en el último año?'
] where code = 'DPC-INC-002';

update public.controls set interview_questions = array[
  '¿Tienen algún tratamiento de datos que consideren especialmente delicado o riesgoso (por volumen, por el tipo de dato, por vigilancia)? Si es así, ¿evaluaron los riesgos antes de implementarlo y por escrito?'
] where code = 'DPC-EIA-001';

update public.controls set interview_questions = array[
  '¿Usan algún sistema que tome decisiones automáticas sobre personas sin intervención humana (por ejemplo, aprobar o rechazar un crédito, un postulante, un descuento)?',
  'Si es así, ¿la persona afectada sabe que la decisión fue automática y tiene cómo pedir que un humano la revise?'
] where code = 'DPC-EIA-002';

-- ----------------------------------------------------------------------------
-- 4. RISK_CATALOG — riesgos del RFC §8 / prototipo RISKS
--    La numeración tiene huecos intencionales: R-003 y R-006 no existen.
--    Mapeo de escalas del prototipo a 1-5: Bajo=2, Medio=3, Alto=4, Crítico=5;
--    Baja=2, Media=3, Alta=4.
--    Clasificación: 'Laboral' y 'Salud / Fintech' del prototipo se modelan como
--    sectorial + sector_tags. -- pendiente validación abogado: si "Laboral"
--    debe tratarse como transversal (todo empleador) en vez de sectorial.
-- ----------------------------------------------------------------------------
insert into public.risk_catalog
  (code, description, classification, sector_tags, domain_id, default_impact, default_probability)
values
  ('R-001', 'Uso de canales informales (WhatsApp) para envío de documentación con datos personales.',
   'transversal', '{}', (select id from public.domains where code = 'DPC-SEG'), 3, 4),
  ('R-002', 'Ausencia de Registro de Actividades de Tratamiento (RAT) actualizado.',
   'transversal', '{}', (select id from public.domains where code = 'DPC-INV'), 3, 4),
  ('R-004', 'Planillas Excel con datos sensibles o financieros sin control de acceso ni cifrado.',
   'transversal', array['fintech'], (select id from public.domains where code = 'DPC-SEG'), 5, 3),
  ('R-005', 'Políticas de privacidad desactualizadas frente a las exigencias de la Ley 21.719.',
   'transversal', '{}', (select id from public.domains where code = 'DPC-LIC'), 2, 3),
  ('R-007', 'Control de asistencia biométrico sin cumplir las exigencias de la Dirección del Trabajo.',
   'sectorial', array['laboral'], (select id from public.domains where code = 'DPC-SEN'), 5, 3),
  ('R-008', 'Cuentas genéricas compartidas para acceder a historial clínico o datos transaccionales.',
   'sectorial', array['salud', 'fintech'], (select id from public.domains where code = 'DPC-SEG'), 5, 4),
  -- R-009: el tag 'seguridad' conserva la etiqueta "Seguridad" del prototipo
  -- (taxonomía del catálogo); no es un rubro, por eso la clasificación sigue
  -- siendo transversal.
  ('R-009', 'Inexistencia de un plan de respuesta y notificación ante brechas de seguridad.',
   'transversal', array['seguridad'], (select id from public.domains where code = 'DPC-INC'), 5, 4)
on conflict (code) do update set
  description = excluded.description,
  classification = excluded.classification,
  sector_tags = excluded.sector_tags,
  domain_id = excluded.domain_id,
  default_impact = excluded.default_impact,
  default_probability = excluded.default_probability;

-- ----------------------------------------------------------------------------
-- 5. SOLUTION_CATALOG — remedios parametrizados (RFC §9 / prototipo SOLUTIONS)
--    Cada fila = una alternativa de mitigación; description = problema que
--    resuelve; tags = {riesgo, dominio}. UUIDs fijos para idempotencia.
-- ----------------------------------------------------------------------------
insert into public.solution_catalog (id, title, description, control_id, tags) values
  -- Problema: control biométrico de asistencia sin resguardo del dato sensible (R-007)
  ('10000000-0000-4000-8000-000000000001',
   'Reemplazo por un sistema de marcas autorizado explícitamente por la Dirección del Trabajo.',
   'Problema identificado: control biométrico de asistencia sin resguardo del dato sensible del trabajador.',
   (select id from public.controls where code = 'DPC-SEN-001'), array['R-007', 'DPC-SEN']),
  ('10000000-0000-4000-8000-000000000002',
   'Cifrado irreversible (hash) de los templates biométricos, impidiendo reconstruir huella o rostro fuera del dispositivo.',
   'Problema identificado: control biométrico de asistencia sin resguardo del dato sensible del trabajador.',
   (select id from public.controls where code = 'DPC-SEN-001'), array['R-007', 'DPC-SEN']),
  ('10000000-0000-4000-8000-000000000003',
   'Anexo de contrato de trabajo específico sobre tratamiento de datos biométricos.',
   'Problema identificado: control biométrico de asistencia sin resguardo del dato sensible del trabajador.',
   (select id from public.controls where code = 'DPC-SEN-001'), array['R-007', 'DPC-SEN']),
  ('10000000-0000-4000-8000-000000000004',
   'Procedimiento estricto de enrolamiento y eliminación definitiva al término de la relación laboral.',
   'Problema identificado: control biométrico de asistencia sin resguardo del dato sensible del trabajador.',
   (select id from public.controls where code = 'DPC-SEN-001'), array['R-007', 'DPC-SEN']),
  -- Problema: planillas Excel con datos sensibles sin control de acceso ni cifrado (R-004)
  ('10000000-0000-4000-8000-000000000011',
   'Migración a repositorio corporativo con control de acceso por rol (RBAC).',
   'Problema identificado: planillas Excel con datos sensibles sin control de acceso ni cifrado.',
   (select id from public.controls where code = 'DPC-SEG-001'), array['R-004', 'DPC-SEG']),
  ('10000000-0000-4000-8000-000000000012',
   'Cifrado de archivos en reposo y etiquetado de sensibilidad (DLP).',
   'Problema identificado: planillas Excel con datos sensibles sin control de acceso ni cifrado.',
   (select id from public.controls where code = 'DPC-SEG-002'), array['R-004', 'DPC-SEG']),
  ('10000000-0000-4000-8000-000000000013',
   'Bitácora de acceso y descarga de archivos con datos personales.',
   'Problema identificado: planillas Excel con datos sensibles sin control de acceso ni cifrado.',
   (select id from public.controls where code = 'DPC-SEG-001'), array['R-004', 'DPC-SEG']),
  -- Problema: canales informales de comunicación con datos personales (R-001)
  ('10000000-0000-4000-8000-000000000021',
   'Habilitación de canal corporativo seguro para intercambio de documentación.',
   'Problema identificado: canales informales de comunicación con datos personales.',
   (select id from public.controls where code = 'DPC-SEG-001'), array['R-001', 'DPC-SEG']),
  ('10000000-0000-4000-8000-000000000022',
   'Política de uso aceptable y capacitación al personal.',
   'Problema identificado: canales informales de comunicación con datos personales.',
   (select id from public.controls where code = 'DPC-SEG-001'), array['R-001', 'DPC-SEG']),
  ('10000000-0000-4000-8000-000000000023',
   'Bloqueo de reenvío externo para categorías sensibles.',
   'Problema identificado: canales informales de comunicación con datos personales.',
   (select id from public.controls where code = 'DPC-SEG-001'), array['R-001', 'DPC-SEG'])
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  control_id = excluded.control_id,
  tags = excluded.tags;

-- ----------------------------------------------------------------------------
-- Bootstrap del primer admin (allowlist manual, sin trigger de auto-creación):
-- crear el usuario en Supabase Auth (dashboard o service role) y luego:
--
--   insert into public.profiles (user_id, full_name, role)
--   values ('<uuid-de-auth.users>', 'Nombre Apellido', 'admin')
--   on conflict (user_id) do update set role = 'admin';
-- ----------------------------------------------------------------------------

commit;
