-- Guion de entrevista: preguntas conversacionales curadas por control.
--
-- Contenido = DRAFT nuestro, pendiente de revisión de consultor/abogado
-- (mismo criterio que el resto del catálogo). No reemplaza asesoría legal.

alter table public.controls
  add column if not exists interview_questions text[] not null default '{}';

comment on column public.controls.interview_questions is
  'Preguntas conversacionales (español, tono consultor a PyME, sin jerga técnica) '
  'para el guion de entrevista del diagnóstico. 1-2 por control, redactadas para '
  'cubrir verification_criteria. DRAFT: pendiente de revisión de consultor/abogado.';

-- DPC-LIC-001 — Validación de bases de licitud y consentimiento
update public.controls set interview_questions = array[
  '¿Con qué autorización tratan cada tipo de dato: consentimiento del cliente, un contrato, la ley, u otra razón?',
  '¿Cómo pide el consentimiento (por ejemplo, en formularios o cookies) y qué tan fácil es para la persona decir que no o arrepentirse después?'
] where code = 'DPC-LIC-001';

-- DPC-FIN-001 — Finalidades determinadas, explícitas y legítimas
update public.controls set interview_questions = array[
  '¿Para qué usan cada dato que le piden al cliente o trabajador, y se lo explican al momento de pedirlo?',
  '¿Alguna vez han usado datos que recolectaron para un fin distinto al original (por ejemplo, para hacer marketing con datos de una venta)? ¿Avisaron a la persona?'
] where code = 'DPC-FIN-001';

-- DPC-FIN-002 — Política de retención y borrado seguro
update public.controls set interview_questions = array[
  '¿Por cuánto tiempo guardan los distintos tipos de datos (boletas, fichas, currículums) y quién decidió esos plazos?',
  'Cuando ya no necesitan un dato, ¿cómo lo eliminan, y eso incluye también los respaldos o copias de seguridad?'
] where code = 'DPC-FIN-002';

-- DPC-PRO-001 — Minimización de datos recolectados
update public.controls set interview_questions = array[
  '¿Piden en sus formularios o sistemas algún dato que en realidad no usan para nada? ¿Cada campo tiene un motivo claro?'
] where code = 'DPC-PRO-001';

-- DPC-CAL-001 — Exactitud y actualización de los datos
update public.controls set interview_questions = array[
  '¿Cómo mantienen actualizados los datos de sus clientes o trabajadores, y qué hacen si alguien les pide corregir un dato erróneo?',
  '¿Revisan de vez en cuando si tienen datos duplicados, viejos o que ya no corresponden?'
] where code = 'DPC-CAL-001';

-- DPC-RES-001 — Designación formal del Delegado de Protección de Datos (DPD)
update public.controls set interview_questions = array[
  '¿Tienen a alguien designado formalmente (con un documento, no solo de palabra) como responsable de la protección de datos? ¿A quién le reporta y tiene tiempo o presupuesto asignado para esa labor?'
] where code = 'DPC-RES-001';

-- DPC-RES-002 — Política corporativa de gobierno de datos aprobada por directorio
update public.controls set interview_questions = array[
  '¿Existe un documento aprobado formalmente por la dueña/dueño o directorio que explique cómo tratan los datos personales en la empresa, y todo el personal lo conoce?'
] where code = 'DPC-RES-002';

-- DPC-RES-003 — Centralización documental de evidencias multi-agencia
update public.controls set interview_questions = array[
  'Si un organismo fiscalizador les pidiera mañana pruebas de que cumplen con protección de datos, ¿dónde están guardadas esas pruebas y qué tan rápido las podrían mostrar?'
] where code = 'DPC-RES-003';

-- DPC-RES-004 — Modelo de Prevención de Infracciones (MPI)
update public.controls set interview_questions = array[
  '¿Tienen algún plan formal (aprobado por la dirección, con un responsable a cargo) que junte cómo gestionan los riesgos de datos personales en la empresa, o cada cosa se maneja por separado?'
] where code = 'DPC-RES-004';

-- DPC-SEG-001 — Control de accesos y trazabilidad (logs inalterables)
update public.controls set interview_questions = array[
  '¿Quién puede ver o modificar los datos de clientes y trabajadores, y eso se decide según lo que cada persona realmente necesita para su trabajo?',
  '¿Queda algún registro de quién entró, modificó o borró esos datos, y revisan o quitan accesos cuando alguien deja de necesitarlos (por ejemplo, al dejar la empresa)?'
] where code = 'DPC-SEG-001';

-- DPC-SEG-002 — Cifrado en tránsito y reposo + MFA
update public.controls set interview_questions = array[
  '¿Los sistemas que usan (correo, planillas, software) piden algo más que una contraseña para entrar, como un código al celular?',
  '¿Hacen respaldos periódicos de la información y los guardan en un lugar distinto al de los datos originales, por si pasa algo?'
] where code = 'DPC-SEG-002';

-- DPC-TRA-001 — Deber de información y política pública de tratamiento (Art. 14 ter)
update public.controls set interview_questions = array[
  '¿Tienen publicada en algún lugar visible (web, local, contrato) una política que explique de forma clara cómo tratan los datos, con fecha de cuándo se actualizó?'
] where code = 'DPC-TRA-001';

-- DPC-CON-001 — Deber de secreto y acuerdos de confidencialidad
update public.controls set interview_questions = array[
  '¿El personal que ve datos de clientes o trabajadores firma algún compromiso de confidencialidad, y esa obligación sigue vigente aunque la persona deje de trabajar con ustedes?',
  '¿Sus proveedores externos (contador, informática, etc.) también están obligados por contrato a mantener esa confidencialidad?'
] where code = 'DPC-CON-001';

-- DPC-INV-001 — Registro de Actividades de Tratamiento (RAT)
update public.controls set interview_questions = array[
  '¿Tienen un listado completo de todos los procesos donde manejan datos personales (ventas, RRHH, marketing, etc.), detallando qué dato es, para qué es y por cuánto tiempo se guarda?',
  '¿Ese listado se actualiza cuando parte un proceso o sistema nuevo que usa datos personales?'
] where code = 'DPC-INV-001';

-- DPC-INV-002 — Mapeo del ciclo de vida y flujos transfronterizos
update public.controls set interview_questions = array[
  '¿Podrían explicar el recorrido completo de un dato desde que lo reciben hasta que lo eliminan, incluyendo si en algún punto sale de Chile (por ejemplo, a un proveedor en el extranjero)?'
] where code = 'DPC-INV-002';

-- DPC-DER-001 — Canal habilitado para derechos ARCOP
update public.controls set interview_questions = array[
  '¿Tienen un canal claro (correo, formulario) donde una persona pueda pedir ver, corregir, eliminar u oponerse al uso de sus datos, y cómo verifican que quien pide es realmente esa persona?',
  '¿En cuánto tiempo suelen responder esas solicitudes y queda algún registro de cómo se resolvieron?'
] where code = 'DPC-DER-001';

-- DPC-SEN-001 — Medidas reforzadas para datos biométricos laborales
update public.controls set interview_questions = array[
  'Si usan huella o reconocimiento facial para marcar asistencia, ¿esa información se guarda de forma protegida (no como una foto o huella "en crudo"), y qué pasa si un trabajador no quiere usar ese sistema?',
  '¿Qué hacen con los datos biométricos de una persona cuando deja de trabajar con ustedes?'
] where code = 'DPC-SEN-001';

-- DPC-TER-001 — Contratos con encargados del tratamiento
update public.controls set interview_questions = array[
  '¿Tienen identificados todos los proveedores externos que manejan datos por ustedes (hosting, CRM, marketing, contabilidad)?',
  'Con esos proveedores, ¿firmaron algún contrato que diga cómo deben cuidar los datos, qué pasa si hay una filtración, y que devuelvan o eliminen la información al terminar el servicio?'
] where code = 'DPC-TER-001';

-- DPC-TER-002 — Transferencias internacionales con garantías de adecuación
update public.controls set interview_questions = array[
  '¿Guardan o comparten datos con algún proveedor o servidor fuera de Chile? ¿En qué país está y qué garantías de protección tienen firmadas con ellos?'
] where code = 'DPC-TER-002';

-- DPC-INC-001 — Plan de respuesta ante brechas de seguridad
update public.controls set interview_questions = array[
  'Si hoy se filtraran o perdieran datos de clientes o trabajadores, ¿tienen definido qué hacer, quién actúa primero y a quién avisar (autoridad y afectados) y en qué plazo?'
] where code = 'DPC-INC-001';

-- DPC-INC-002 — Protocolo de reporte e historial de incidentes de seguridad
update public.controls set interview_questions = array[
  '¿Han tenido incidentes de seguridad (pérdida, filtración, acceso indebido) en el último tiempo? ¿Queda un registro histórico de esos casos y el personal sabe cómo reportar uno si ocurre?',
  '¿Alguna vez han hecho un simulacro o prueba de qué pasaría ante una filtración de datos, en el último año?'
] where code = 'DPC-INC-002';

-- DPC-EIA-001 — Evaluación de Impacto (EIPD) en tratamientos de alto riesgo
update public.controls set interview_questions = array[
  '¿Tienen algún tratamiento de datos que consideren especialmente delicado o riesgoso (por volumen, por el tipo de dato, por vigilancia)? Si es así, ¿evaluaron los riesgos antes de implementarlo y por escrito?'
] where code = 'DPC-EIA-001';

-- DPC-EIA-002 — Salvaguardas para decisiones automatizadas y perfilamiento
update public.controls set interview_questions = array[
  '¿Usan algún sistema que tome decisiones automáticas sobre personas sin intervención humana (por ejemplo, aprobar o rechazar un crédito, un postulante, un descuento)?',
  'Si es así, ¿la persona afectada sabe que la decisión fue automática y tiene cómo pedir que un humano la revise?'
] where code = 'DPC-EIA-002';
