/**
 * Mapeo DETERMINISTA gap → acción de mitigación (sin LLM). Cada criterio de
 * verificación del catálogo (`controls.verification_criteria`, ver
 * `supabase/seed.sql`) describe un estado-objetivo; su remediación es la forma
 * imperativa de alcanzarlo. Este módulo redacta esa acción —y un ejemplo
 * concreto y desarrollado que la ilustra— una vez por criterio, y deriva
 * prioridad/esfuerzo/plazo por regla, reemplazando la antigua llamada a DeepSeek.
 *
 * BORRADOR v1 — PENDIENTE validación consultor/abogado: los textos de acción y
 * ejemplo son una primera propuesta trazable 1:1 al criterio incumplido (cero
 * asunciones: no inventan hechos de la empresa). El consultor edita cada tarjeta
 * antes de aceptarla al Plan de adecuación; el ejemplo es solo guía visual (no se
 * persiste).
 *
 * Config versionada en código (misma doctrina que el guion `rat-script.ts`): sin
 * migración; la trazabilidad al plan (control_code + criterion_index) ya vive en
 * `remediation_items`. Las claves y el orden calzan con `verification_criteria`
 * por índice — al editar el catálogo, mantener ambos alineados.
 */

export type GapType = "no" | "partial" | "flagged";
export type Priority = "alta" | "media" | "baja";
export type Effort = "bajo" | "medio" | "alto";

/** Criterio incumplido del diagnóstico (lo arma `buildGaps`). */
export interface RemediationGap {
  controlCode: string;
  controlName: string;
  criterionIndex: number;
  criterion: string;
  gapType: GapType;
}

/** Acción de mitigación propuesta para un gap (misma forma que consumía la UI). */
export interface ProposalItem {
  controlCode: string;
  criterionIndex: number;
  gapType: GapType;
  action: string;
  /** Ejemplo concreto que ilustra la acción (guía visual, no se persiste). */
  example: string;
  priority: Priority;
  effort: Effort;
  suggestedDueWeeks: number;
  rationale: string;
}

type RemediationEntry = { action: string; example: string };

/**
 * Acción + ejemplo por control, alineados por índice con `verification_criteria`.
 * La acción es imperativa y anclada al criterio; el ejemplo la aterriza con un
 * caso concreto (sin datos inventados de la empresa) para que el consultor y el
 * cliente entiendan de inmediato qué se espera.
 */
const REMEDIATION_MAP: Record<string, readonly RemediationEntry[]> = {
  "DPC-LIC-001": [
    { action: "Identificar y documentar la base de licitud de cada finalidad de tratamiento del RAT.", example: "Ej.: arma una tabla que asigne a cada uso su fundamento legal — 'Envío de boletas → obligación legal (SII)', 'Datos de trabajadores → ejecución del contrato', 'Newsletter → consentimiento'. Así queda claro que no todo requiere consentimiento, pero cada tratamiento tiene su porqué legal." },
    { action: "Rediseñar los formularios y flujos de captura para obtener el consentimiento de forma libre, informada, específica y explícita (sin casillas premarcadas).", example: "Ej.: en el registro web la casilla de aceptación va vacía (el usuario la marca), con un enlace visible a la política y un texto específico ('Acepto recibir novedades por correo'). Nada de casillas premarcadas ni de aceptar 'todo en bloque'." },
    { action: "Implementar un mecanismo operativo y accesible para que el titular revoque su consentimiento.", example: "Ej.: cada correo de marketing incluye un link 'Cancelar suscripción' que funciona en un clic, y en el perfil del usuario hay una opción para retirar permisos. Revocar debe ser tan fácil como fue aceptar." },
    { action: "Actualizar los avisos de privacidad y el banner de cookies para cumplir las exigencias de la Ley 19.496 (SERNAC).", example: "Ej.: al entrar al sitio aparece un banner que permite 'Aceptar' o 'Rechazar' antes de cargar cookies de analítica o publicidad, con un panel para elegir por categoría. No se instalan rastreadores hasta que la persona decide." },
  ],
  "DPC-FIN-001": [
    { action: "Declarar una finalidad determinada y explícita para cada tratamiento del RAT.", example: "Ej.: en el RAT cada actividad indica su finalidad concreta — 'Postulaciones → evaluar candidatos', 'Postventa → gestionar garantías' — en vez de un genérico 'gestión de datos' o 'varios'." },
    { action: "Informar la finalidad al titular al momento de recolectar y verificar su legitimidad.", example: "Ej.: bajo el formulario de contacto se lee 'Usaremos tu correo solo para responder tu consulta'; en la ficha de cliente, 'Tus datos se usan para procesar tu compra y despacho'. La finalidad se avisa en el mismo momento de pedir el dato." },
    { action: "Establecer controles que impidan reutilizar datos con fines incompatibles sin nueva base o consentimiento.", example: "Ej.: los correos que se piden para emitir la boleta no se vuelcan a una campaña de marketing; si se quiere ese nuevo uso, se pide un consentimiento aparte. Evita el 'ya que los tengo, los uso para todo'." },
    { action: "Documentar y comunicar al titular todo cambio de finalidad.", example: "Ej.: si mañana deciden usar los datos de clientes para un programa de fidelización, actualizan la política, avisan por correo el nuevo uso y dejan registro de cuándo se comunicó." },
  ],
  "DPC-FIN-002": [
    { action: "Elaborar una matriz de plazos de retención por categoría de dato.", example: "Ej.: una planilla con una fila por categoría — 'Fichas clínicas → 15 años', 'Documentos tributarios → 6 años', 'CV no seleccionados → 6 meses', 'Grabaciones de cámaras → 30 días'." },
    { action: "Fundamentar cada plazo de retención en una obligación legal o en la finalidad del tratamiento.", example: "Ej.: cada plazo cita su porqué — '6 años (Código Tributario)', '15 años (Ley 20.584)'; los que no tienen ley se justifican por la finalidad ('CV: 6 meses tras cerrar el cargo')." },
    { action: "Implementar un procedimiento de borrado seguro y verificable que alcance también copias y respaldos.", example: "Ej.: al vencer el plazo, el registro se elimina del sistema y también de los respaldos y planillas exportadas, y queda un comprobante de la depuración. Borrar 'solo de la vista' no cuenta." },
    { action: "Programar y registrar depuraciones periódicas de datos vencidos.", example: "Ej.: cada trimestre corre una rutina (manual o automática) que elimina los datos vencidos —p. ej. postulaciones de hace más de 6 meses— y se registra qué y cuándo se borró." },
  ],
  "DPC-PRO-001": [
    { action: "Justificar cada campo recolectado frente a una finalidad concreta y eliminar los que no la tengan.", example: "Ej.: revisan el formulario de contacto y quitan 'RUT' y 'fecha de nacimiento' porque para responder una consulta basta el nombre y el correo. Cada campo que queda tiene un motivo." },
    { action: "Revisar formularios y sistemas para dejar de solicitar datos innecesarios o excesivos.", example: "Ej.: para suscribirse al newsletter piden solo el correo; para un sorteo, nombre y correo. No piden dirección, teléfono ni RUT 'por si acaso'." },
    { action: "Establecer una revisión periódica que depure atributos que ya no se utilizan.", example: "Ej.: en una revisión detectan que la base de clientes tiene una columna 'estado civil' que ningún proceso usa y la eliminan." },
    { action: "Adoptar seudonimización o agregación cuando sea suficiente para la finalidad.", example: "Ej.: para un reporte de ventas por comuna usan totales agregados, no el detalle por persona; y en pruebas de sistema usan datos seudonimizados en vez de datos reales." },
  ],
  "DPC-CAL-001": [
    { action: "Definir procesos de actualización periódica de los datos.", example: "Ej.: una vez al año envían a los clientes un correo 'Confirma o actualiza tus datos', y RRHH revisa anualmente los datos de contacto del personal." },
    { action: "Establecer un procedimiento de rectificación con un plazo definido de aplicación.", example: "Ej.: si un cliente pide corregir su dirección, el procedimiento dice que se actualiza dentro de 5 días hábiles y queda registro de quién lo hizo." },
    { action: "Implementar controles para detectar y corregir duplicados e inconsistencias.", example: "Ej.: un cruce mensual detecta clientes duplicados (el mismo RUT cargado dos veces) y los fusiona, evitando enviar la misma comunicación dos veces." },
    { action: "Depurar periódicamente los registros vencidos o sin finalidad vigente.", example: "Ej.: se dan de baja los registros de clientes sin actividad ni finalidad vigente hace años, en vez de arrastrarlos indefinidamente." },
  ],
  "DPC-RES-001": [
    { action: "Emitir un acto formal (acta o resolución) que designe nominalmente al Delegado de Protección de Datos (DPD).", example: "Ej.: una resolución o acta firmada por gerencia que dice 'Se designa a María González como Delegada de Protección de Datos', con fecha y sus funciones." },
    { action: "Asegurar que el DPD reporte directamente a la alta dirección, sin conflictos de interés.", example: "Ej.: la DPD presenta un informe trimestral directo a gerencia general y no depende del área comercial ni de TI (que son las que más tratan datos), para evitar conflictos de interés." },
    { action: "Elaborar el descriptor de cargo del DPD con funciones, atribuciones y líneas de escalamiento.", example: "Ej.: un descriptor que detalla qué supervisa (RAT, brechas, derechos), qué puede decidir y a quién escala cuando detecta un incumplimiento." },
    { action: "Asignar presupuesto y tiempo dedicado para el ejercicio del rol de DPD.", example: "Ej.: se le asigna, por ejemplo, un 20% de la jornada al rol y un presupuesto anual para capacitación y herramientas; no es un cargo 'de nombre'." },
  ],
  "DPC-RES-002": [
    { action: "Redactar una política de gobierno de datos que cubra principios, roles, finalidades y reglas de tratamiento.", example: "Ej.: un documento 'Política de Tratamiento de Datos Personales' que fija principios, roles (quién decide qué), finalidades permitidas y reglas básicas de uso." },
    { action: "Someter la política de tratamiento a aprobación formal del directorio o la máxima autoridad.", example: "Ej.: la política se lleva a directorio y queda un acta que la aprueba; no es un borrador que circula sin respaldo formal." },
    { action: "Versionar la política y fijar un ciclo de revisión con fecha vigente.", example: "Ej.: el documento indica 'v1.2 — revisada 03/2026' y tiene agendada su próxima revisión, para que no quede desactualizado." },
    { action: "Comunicar y publicar la política para que sea accesible a todo el personal.", example: "Ej.: se publica en la intranet y se envía por correo a todo el personal, con constancia de que se comunicó." },
  ],
  "DPC-RES-003": [
    { action: "Centralizar las evidencias de cumplimiento en un repositorio único indexado por control.", example: "Ej.: una carpeta única (SharePoint/Drive) con subcarpetas por control —LIC, SEG, TER…— donde vive toda la evidencia, en vez de estar dispersa en correos y equipos personales." },
    { action: "Registrar versión, fecha y responsable en cada evidencia.", example: "Ej.: cada archivo se nombra con versión, fecha y responsable ('Politica_v3_2026-03_JPerez.pdf'), para saber cuál es la vigente y quién la subió." },
    { action: "Garantizar la disponibilidad inmediata de la prueba ante requerimientos multi-agencia.", example: "Ej.: ante una fiscalización de la Agencia (u otra como SERNAC o la ANCI), se puede exportar la evidencia de un control en minutos, no salir a buscarla por días." },
    { action: "Implementar control de acceso y trazabilidad sobre el repositorio de evidencias.", example: "Ej.: solo el DPD y gerencia pueden editar el repositorio, y queda registro de quién accedió o modificó cada archivo." },
  ],
  "DPC-RES-004": [
    { action: "Formular un Modelo de Prevención de Infracciones (MPI) que cubra gobernanza, DPD, inventario, matriz de riesgos y gestión de terceros.", example: "Ej.: un documento MPI que reúne gobernanza y roles, la designación del DPD, el inventario/RAT, la matriz de riesgos con su plan de mitigación y la gestión de terceros." },
    { action: "Obtener la aprobación formal del MPI por la alta dirección.", example: "Ej.: el MPI se aprueba formalmente por gerencia/directorio y queda el acta; su certificación puede operar como atenuante ante la Agencia." },
    { action: "Designar un responsable del MPI y un plan de mitigación con seguimiento.", example: "Ej.: hay un responsable del MPI y un plan de mitigación con hitos y fechas al que se le hace seguimiento, no un PDF que se archiva y se olvida." },
    { action: "Volver operativo y auditable el MPI, más allá de lo declarativo.", example: "Ej.: se puede mostrar evidencia de que el MPI se aplica —revisiones, registros, avances del plan— y no es solo un documento declarativo." },
  ],
  "DPC-SEG-001": [
    { action: "Implementar un modelo de accesos por rol bajo el principio de mínimo privilegio.", example: "Ej.: el cajero accede al punto de venta pero no a la base de RRHH; cada rol (ventas, contabilidad, TI) ve solo los datos que su función necesita." },
    { action: "Registrar consultas, modificaciones y eliminaciones de datos personales.", example: "Ej.: el sistema guarda un log de 'quién consultó/modificó/eliminó qué y cuándo' — 'usuario jperez consultó la ficha del cliente 1234 a las 10:32'." },
    { action: "Configurar bitácoras inalterables con un plazo de conservación definido.", example: "Ej.: esos logs se guardan en almacenamiento de solo-lectura por un plazo definido (p. ej. 1 año) para que nadie pueda alterarlos ni borrarlos." },
    { action: "Establecer revisión periódica y revocación oportuna de accesos.", example: "Ej.: cada trimestre se revisa quién tiene acceso a qué, y cuando alguien se desvincula se le revocan los accesos ese mismo día." },
  ],
  "DPC-SEG-002": [
    { action: "Cifrar los datos en tránsito (TLS) y en reposo con estándares vigentes.", example: "Ej.: el sitio y los sistemas usan HTTPS (candado), y las bases de datos y notebooks están cifrados en disco, de modo que un equipo robado no expone los datos." },
    { action: "Activar autenticación multifactor (MFA) en los accesos críticos.", example: "Ej.: entrar al panel de administración o al correo corporativo pide clave + un código del celular (MFA), no solo la contraseña." },
    { action: "Aplicar técnicamente una política de contraseñas robustas.", example: "Ej.: el sistema exige contraseñas de al menos 12 caracteres, bloquea la cuenta tras varios intentos fallidos y no permite reutilizar las últimas." },
    { action: "Establecer respaldos periódicos, aislados y probar su restauración.", example: "Ej.: hay respaldos diarios guardados aislados (offline o en otra cuenta) y cada trimestre se prueba restaurar uno para confirmar que sirve ante un ransomware." },
  ],
  "DPC-TRA-001": [
    { action: "Publicar la política de tratamiento y mantenerla accesible al público.", example: "Ej.: la 'Política de Privacidad' está enlazada en el pie de todas las páginas y accesible sin tener que pedirla." },
    { action: "Incluir en la política la fecha, versión e individualización del responsable.", example: "Ej.: la política indica 'Responsable: Empresa X, RUT 76.xxx, contacto dpo@empresa.cl, v2 — 01/2026', para que el titular sepa quién trata sus datos y desde cuándo rige." },
    { action: "Redactar la información al titular de forma clara, precisa e inequívoca.", example: "Ej.: está escrita en lenguaje simple ('usamos tu correo para enviarte la boleta'), sin párrafos legales ilegibles enterrados en letra chica." },
    { action: "Actualizar la política cuando cambien los tratamientos o la normativa.", example: "Ej.: cuando suman un nuevo tratamiento (p. ej. un chatbot que guarda conversaciones), actualizan la política y su versión." },
  ],
  "DPC-CON-001": [
    { action: "Hacer que el personal con acceso a datos firme compromisos de confidencialidad.", example: "Ej.: al ingresar, cada trabajador con acceso a datos firma una cláusula de confidencialidad (en el contrato o un anexo)." },
    { action: "Incorporar cláusulas de secreto que subsistan tras el término de la relación.", example: "Ej.: la cláusula dice explícitamente que el deber de secreto sigue vigente aunque la persona renuncie o termine el contrato." },
    { action: "Capacitar al personal sobre el deber de confidencialidad.", example: "Ej.: una charla anual de protección de datos explica el deber de secreto y qué no se puede divulgar, con registro de asistencia." },
    { action: "Extender las cláusulas de confidencialidad a encargados y terceros.", example: "Ej.: los contratos con proveedores (contador, soporte TI, marketing) incluyen la misma cláusula de confidencialidad." },
  ],
  "DPC-INV-001": [
    { action: "Levantar el RAT cubriendo todos los procesos de negocio que tratan datos personales.", example: "Ej.: el RAT incluye una ficha por proceso —Ventas, RRHH, Marketing, Postventa, Postulaciones— y no deja fuera áreas que también manejan datos." },
    { action: "Registrar en cada actividad la finalidad, categorías de datos, base de licitud y plazo de retención.", example: "Ej.: cada ficha registra 'Nómina → pago de sueldos → datos bancarios y de contrato → base: contrato → retención 6 años'." },
    { action: "Identificar sistemas, ubicaciones y responsables de cada base de datos.", example: "Ej.: se indica en qué sistema y dónde vive cada base ('Clientes → CRM en la nube (Brasil) → responsable: jefe comercial')." },
    { action: "Establecer la actualización del RAT ante nuevos tratamientos o cambios relevantes.", example: "Ej.: cuando contratan un software nuevo o lanzan un servicio, agregan su tratamiento al RAT en vez de dejarlo sin registrar." },
  ],
  "DPC-INV-002": [
    { action: "Elaborar un diagrama del ciclo de vida del dato de extremo a extremo.", example: "Ej.: un diagrama que muestra el recorrido: se recolecta en la web → se guarda en el CRM → se comparte con despacho → se elimina a los 2 años." },
    { action: "Identificar todas las transferencias hacia terceros y hacia el extranjero.", example: "Ej.: se marca cada salida a terceros y al extranjero ('el CRM aloja los datos en Brasil', 'Mailchimp en EE.UU.'), no solo el uso interno." },
    { action: "Amparar cada transferencia internacional con un mecanismo de resguardo válido.", example: "Ej.: cada transferencia internacional queda cubierta por cláusulas contractuales de adecuación firmadas con el proveedor." },
    { action: "Documentar el punto y método de eliminación al final del ciclo de vida.", example: "Ej.: se documenta cómo y cuándo se elimina el dato al final ('al cerrar la cuenta, se borra a los 30 días, incluidos respaldos')." },
  ],
  "DPC-DER-001": [
    { action: "Habilitar un canal formal, visible y exclusivo para solicitudes ARCOP.", example: "Ej.: en la web hay un formulario 'Ejerce tus derechos' y un correo dedicado (datos@empresa.cl), visibles, no un contacto genérico perdido." },
    { action: "Definir un procedimiento de verificación de identidad del solicitante.", example: "Ej.: antes de entregar o borrar datos se verifica la identidad del solicitante (cédula o validación por el correo registrado), para no dárselos a un tercero." },
    { action: "Asegurar el cumplimiento de los plazos legales de respuesta con registro de cada gestión.", example: "Ej.: se responde dentro del plazo legal y queda registro de cada solicitud (quién pidió qué y cuándo se respondió)." },
    { action: "Asignar responsables internos para tramitar cada tipo de derecho ARCOP.", example: "Ej.: el flujo interno asigna responsables: el acceso lo atiende soporte y la supresión la valida el DPD." },
  ],
  "DPC-SEN-001": [
    { action: "Justificar y documentar el tratamiento biométrico en un anexo contractual.", example: "Ej.: un anexo contractual explica por qué se usa la huella para marcar asistencia y en qué se basa, conforme a los dictámenes de la Dirección del Trabajo." },
    { action: "Almacenar las plantillas biométricas cifradas de forma irreversible (hash).", example: "Ej.: se guarda solo el hash irreversible de la huella (no la imagen del dedo), de modo que no se pueda reconstruir el dato biométrico." },
    { action: "Ofrecer una alternativa de marcación para trabajadores que no consientan la biometría.", example: "Ej.: quien no quiera dar su huella puede marcar con tarjeta o clave, sin quedar obligado a entregar un dato sensible." },
    { action: "Definir un enrolamiento controlado y la eliminación al término de la relación laboral.", example: "Ej.: el enrolamiento es controlado y, al terminar la relación laboral, se elimina la plantilla biométrica del trabajador." },
  ],
  "DPC-TER-001": [
    { action: "Levantar y mantener un inventario actualizado de encargados y sub-encargados.", example: "Ej.: una lista actualizada — 'AWS (hosting), contador externo, software de RRHH, agencia de marketing' — indicando qué datos toca cada uno." },
    { action: "Suscribir con cada encargado crítico un contrato con cláusulas de tratamiento de datos.", example: "Ej.: con cada encargado crítico se firma un contrato o anexo de tratamiento de datos (DPA) que fija sus obligaciones." },
    { action: "Evaluar el nivel de seguridad del proveedor antes de contratarlo.", example: "Ej.: antes de contratar el CRM se revisa su nivel de seguridad (certificaciones, dónde aloja los datos) con un checklist." },
    { action: "Regular en el contrato la confidencialidad, la gestión de brechas y la devolución/eliminación de datos.", example: "Ej.: el contrato obliga al proveedor a mantener confidencialidad, avisar las brechas y devolver o borrar los datos al terminar el servicio." },
  ],
  "DPC-TER-002": [
    { action: "Identificar todas las transferencias internacionales de datos.", example: "Ej.: se detecta que Mailchimp guarda los correos en EE.UU. y que el CRM aloja datos en Brasil — todas las salidas al extranjero quedan identificadas." },
    { action: "Amparar cada transferencia con un mecanismo de resguardo válido conforme a la ley.", example: "Ej.: cada transferencia se ampara en un mecanismo válido: cláusulas contractuales tipo, un país con nivel de protección adecuado o el consentimiento del titular." },
    { action: "Incluir garantías de adecuación en los contratos con destinatarios en el extranjero.", example: "Ej.: el contrato con el proveedor extranjero incluye un anexo de transferencia internacional con garantías de protección." },
    { action: "Documentar el país de destino y su nivel de protección.", example: "Ej.: se registra el país de destino y su nivel de protección ('Destino: EE.UU. — garantía: cláusulas contractuales')." },
  ],
  "DPC-INC-001": [
    { action: "Elaborar un manual de respuesta a brechas con fases de detección, contención y cierre.", example: "Ej.: un manual con fases claras — detectar → contener → evaluar → notificar → cerrar — para no improvisar el día que ocurra una filtración." },
    { action: "Definir roles, responsables y vías de escalamiento ante incidentes.", example: "Ej.: define roles y escalamiento — 'soporte detecta y contiene → el DPD evalúa el impacto → gerencia decide la notificación'." },
    { action: "Fijar criterios y plazos para notificar a la APDP y a los afectados.", example: "Ej.: fija cuándo y en qué plazo notificar a la Agencia y a los afectados (p. ej. si se filtran datos sensibles, notificar sin dilación)." },
    { action: "Incorporar el registro y la evaluación posterior de cada incidente.", example: "Ej.: tras cada incidente se registra qué pasó y se hace una evaluación posterior con lecciones aprendidas para mejorar." },
  ],
  "DPC-INC-002": [
    { action: "Implementar un registro histórico y centralizado de eventos e incidentes de seguridad.", example: "Ej.: una bitácora central donde se anota cada evento de seguridad con fecha, tipo e impacto, aunque sea menor." },
    { action: "Difundir un protocolo de reporte conocido y accesible para el personal.", example: "Ej.: el personal conoce un protocolo simple — '¿Viste algo raro? Avisa a seguridad@empresa.cl' — y sabe a quién acudir." },
    { action: "Cubrir la doble notificación aplicable: APDP y ANCI/CSIRT.", example: "Ej.: el procedimiento cubre la doble notificación cuando aplica: a la Agencia por datos personales y al CSIRT/ANCI por ciberseguridad en servicios esenciales." },
    { action: "Ejecutar simulacros de brecha y conservar evidencia de los últimos 12 meses.", example: "Ej.: al menos una vez al año se hace un simulacro de filtración y queda un acta con los resultados y las mejoras." },
  ],
  "DPC-EIA-001": [
    { action: "Identificar los tratamientos de alto riesgo que requieren Evaluación de Impacto (EIPD).", example: "Ej.: se marcan como alto riesgo tratamientos como videovigilancia masiva, scoring crediticio o el cruce de muchas fuentes de datos sensibles." },
    { action: "Ejecutar la EIPD antes de iniciar el tratamiento.", example: "Ej.: antes de lanzar un nuevo sistema de perfilamiento se hace la evaluación de impacto, no después de que ya está funcionando." },
    { action: "Documentar en la EIPD los riesgos, el impacto y las medidas de mitigación.", example: "Ej.: la EIPD documenta los riesgos para las personas, su probabilidad e impacto, y las medidas para reducirlos." },
    { action: "Revisar la EIPD periódicamente y ante cambios relevantes.", example: "Ej.: la EIPD se vuelve a revisar cuando cambia el algoritmo, la finalidad o el alcance del tratamiento." },
  ],
  "DPC-EIA-002": [
    { action: "Inventariar los procesos con decisiones automatizadas o perfilamiento.", example: "Ej.: se listan los procesos con decisiones automáticas — preselección de CV por software, scoring crediticio, pricing personalizado." },
    { action: "Establecer supervisión humana significativa sobre la decisión automatizada.", example: "Ej.: una persona revisa la decisión del sistema y puede modificarla; el algoritmo no decide solo sobre alguien sin control humano." },
    { action: "Informar al titular sobre la lógica y las consecuencias del tratamiento automatizado.", example: "Ej.: se informa 'tu solicitud se evalúa parcialmente con un modelo automático', explicando la lógica general y sus consecuencias." },
    { action: "Habilitar un canal para revisar o impugnar la decisión automatizada.", example: "Ej.: hay una opción 'Solicitar revisión humana' para que la persona pueda impugnar la decisión automatizada." },
  ],
};

/** Prioridad por regla: "no" incumple del todo → alta; "partial"/"flagged" → media. */
function priorityForGap(gapType: GapType): Priority {
  return gapType === "no" ? "alta" : "media";
}

/** Plazo sugerido (semanas) por prioridad. */
function dueWeeksForPriority(priority: Priority): number {
  if (priority === "alta") return 2;
  if (priority === "media") return 4;
  return 8;
}

/**
 * Construye la propuesta de resolución de forma determinista a partir de los
 * gaps del diagnóstico. Sin llamadas de red. Un gap sin acción mapeada se omite
 * (el consultor puede agregarlo a mano en el Plan). El esfuerzo queda en "medio"
 * como default editable — no se asume el esfuerzo real de cada empresa.
 */
export function buildRemediationProposal(gaps: RemediationGap[]): ProposalItem[] {
  const out: ProposalItem[] = [];
  for (const gap of gaps) {
    const entry = REMEDIATION_MAP[gap.controlCode]?.[gap.criterionIndex];
    if (!entry) continue;
    const priority = priorityForGap(gap.gapType);
    out.push({
      controlCode: gap.controlCode,
      criterionIndex: gap.criterionIndex,
      gapType: gap.gapType,
      action: entry.action,
      example: entry.example,
      priority,
      effort: "medio",
      suggestedDueWeeks: dueWeeksForPriority(priority),
      rationale: `Cierra el criterio pendiente: "${gap.criterion}".`,
    });
  }
  return out;
}
