/**
 * Mapeo DETERMINISTA gap → acción de mitigación (sin LLM). Cada criterio de
 * verificación del catálogo (`controls.verification_criteria`, ver
 * `supabase/seed.sql`) describe un estado-objetivo; su remediación es la forma
 * imperativa de alcanzarlo. Este módulo redacta esa acción —y un ejemplo
 * concreto que la ilustra— una vez por criterio, y deriva
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
 * La acción es imperativa y anclada al criterio; el ejemplo la aterriza (sin
 * datos inventados de la empresa).
 */
const REMEDIATION_MAP: Record<string, readonly RemediationEntry[]> = {
  "DPC-LIC-001": [
    { action: "Identificar y documentar la base de licitud de cada finalidad de tratamiento del RAT.", example: "Ej.: 'Envío de boletas → obligación legal'; 'Newsletter → consentimiento'." },
    { action: "Rediseñar los formularios y flujos de captura para obtener el consentimiento de forma libre, informada, específica y explícita (sin casillas premarcadas).", example: "Ej.: casilla vacía por defecto que el usuario marca, con enlace a la política." },
    { action: "Implementar un mecanismo operativo y accesible para que el titular revoque su consentimiento.", example: "Ej.: link 'Cancelar suscripción' en cada correo y opción en el perfil." },
    { action: "Actualizar los avisos de privacidad y el banner de cookies para cumplir las exigencias de la Ley 19.496 (SERNAC).", example: "Ej.: banner que permite aceptar o rechazar antes de cargar rastreadores." },
  ],
  "DPC-FIN-001": [
    { action: "Declarar una finalidad determinada y explícita para cada tratamiento del RAT.", example: "Ej.: 'Postulaciones → evaluar candidatos', no un genérico 'varios'." },
    { action: "Informar la finalidad al titular al momento de recolectar y verificar su legitimidad.", example: "Ej.: bajo el formulario web: 'Usaremos tu correo para responder tu consulta'." },
    { action: "Establecer controles que impidan reutilizar datos con fines incompatibles sin nueva base o consentimiento.", example: "Ej.: no usar los correos de facturación para campañas de marketing sin nuevo consentimiento." },
    { action: "Documentar y comunicar al titular todo cambio de finalidad.", example: "Ej.: si empiezan a usar los datos para un fin nuevo, avisan por correo y lo registran." },
  ],
  "DPC-FIN-002": [
    { action: "Elaborar una matriz de plazos de retención por categoría de dato.", example: "Ej.: tabla 'Fichas clínicas: 15 años', 'CV no seleccionados: 6 meses'." },
    { action: "Fundamentar cada plazo de retención en una obligación legal o en la finalidad del tratamiento.", example: "Ej.: 'Documentos tributarios: 6 años (Código Tributario)'." },
    { action: "Implementar un procedimiento de borrado seguro y verificable que alcance también copias y respaldos.", example: "Ej.: al vencer el plazo se borra el registro y también de los respaldos, con constancia." },
    { action: "Programar y registrar depuraciones periódicas de datos vencidos.", example: "Ej.: cada trimestre se eliminan los CV vencidos y queda registrado." },
  ],
  "DPC-PRO-001": [
    { action: "Justificar cada campo recolectado frente a una finalidad concreta y eliminar los que no la tengan.", example: "Ej.: revisar el formulario y quitar 'RUT' si solo se necesita el correo." },
    { action: "Revisar formularios y sistemas para dejar de solicitar datos innecesarios o excesivos.", example: "Ej.: para un newsletter basta el correo; no pedir dirección ni teléfono." },
    { action: "Establecer una revisión periódica que depure atributos que ya no se utilizan.", example: "Ej.: eliminar la columna 'estado civil' que ningún proceso usa." },
    { action: "Adoptar seudonimización o agregación cuando sea suficiente para la finalidad.", example: "Ej.: para estadísticas usar totales por comuna, no el detalle por persona." },
  ],
  "DPC-CAL-001": [
    { action: "Definir procesos de actualización periódica de los datos.", example: "Ej.: campaña anual pidiendo a clientes confirmar sus datos de contacto." },
    { action: "Establecer un procedimiento de rectificación con un plazo definido de aplicación.", example: "Ej.: 'corregimos tus datos dentro de 5 días hábiles de solicitado'." },
    { action: "Implementar controles para detectar y corregir duplicados e inconsistencias.", example: "Ej.: cruce mensual que detecta y fusiona clientes repetidos." },
    { action: "Depurar periódicamente los registros vencidos o sin finalidad vigente.", example: "Ej.: dar de baja clientes sin actividad ni finalidad vigente." },
  ],
  "DPC-RES-001": [
    { action: "Emitir un acto formal (acta o resolución) que designe nominalmente al Delegado de Protección de Datos (DPD).", example: "Ej.: resolución interna 'Se designa a María González como DPD'." },
    { action: "Asegurar que el DPD reporte directamente a la alta dirección, sin conflictos de interés.", example: "Ej.: el DPD presenta un informe trimestral directo a gerencia general." },
    { action: "Elaborar el descriptor de cargo del DPD con funciones, atribuciones y líneas de escalamiento.", example: "Ej.: documento con qué decide, qué supervisa y a quién escala los temas." },
    { action: "Asignar presupuesto y tiempo dedicado para el ejercicio del rol de DPD.", example: "Ej.: 20% de la jornada asignada y presupuesto anual de capacitación." },
  ],
  "DPC-RES-002": [
    { action: "Redactar una política de gobierno de datos que cubra principios, roles, finalidades y reglas de tratamiento.", example: "Ej.: documento 'Política de Tratamiento de Datos Personales'." },
    { action: "Someter la política de tratamiento a aprobación formal del directorio o la máxima autoridad.", example: "Ej.: acta de directorio que aprueba la política." },
    { action: "Versionar la política y fijar un ciclo de revisión con fecha vigente.", example: "Ej.: 'v1.2 — revisada 03/2026', con próxima revisión agendada." },
    { action: "Comunicar y publicar la política para que sea accesible a todo el personal.", example: "Ej.: publicada en la intranet y enviada por correo a todo el personal." },
  ],
  "DPC-RES-003": [
    { action: "Centralizar las evidencias de cumplimiento en un repositorio único indexado por control.", example: "Ej.: carpeta o SharePoint con subcarpetas por control (LIC, SEG, …)." },
    { action: "Registrar versión, fecha y responsable en cada evidencia.", example: "Ej.: cada archivo nombrado 'Politica_v3_2026-03_JPerez'." },
    { action: "Garantizar la disponibilidad inmediata de la prueba ante requerimientos multi-agencia.", example: "Ej.: ante una fiscalización, exportar la evidencia en minutos, no días." },
    { action: "Implementar control de acceso y trazabilidad sobre el repositorio de evidencias.", example: "Ej.: solo el DPD y gerencia editan; queda registro de accesos." },
  ],
  "DPC-RES-004": [
    { action: "Formular un Modelo de Prevención de Infracciones (MPI) que cubra gobernanza, DPD, inventario, matriz de riesgos y gestión de terceros.", example: "Ej.: documento MPI con esos contenidos mínimos." },
    { action: "Obtener la aprobación formal del MPI por la alta dirección.", example: "Ej.: acta que aprueba el MPI." },
    { action: "Designar un responsable del MPI y un plan de mitigación con seguimiento.", example: "Ej.: responsable asignado y plan con hitos y fechas." },
    { action: "Volver operativo y auditable el MPI, más allá de lo declarativo.", example: "Ej.: evidencia de que el MPI se aplica y revisa, no solo un PDF guardado." },
  ],
  "DPC-SEG-001": [
    { action: "Implementar un modelo de accesos por rol bajo el principio de mínimo privilegio.", example: "Ej.: el cajero no accede a la base de RRHH; cada rol ve lo justo." },
    { action: "Registrar consultas, modificaciones y eliminaciones de datos personales.", example: "Ej.: log que guarda 'usuario X consultó ficha Y a las 10:32'." },
    { action: "Configurar bitácoras inalterables con un plazo de conservación definido.", example: "Ej.: logs en almacenamiento de solo-lectura conservados 1 año." },
    { action: "Establecer revisión periódica y revocación oportuna de accesos.", example: "Ej.: al desvincular a alguien, se le revocan los accesos ese día." },
  ],
  "DPC-SEG-002": [
    { action: "Cifrar los datos en tránsito (TLS) y en reposo con estándares vigentes.", example: "Ej.: sitio con HTTPS y base de datos cifrada en disco." },
    { action: "Activar autenticación multifactor (MFA) en los accesos críticos.", example: "Ej.: entrar al panel admin pide clave + código del celular." },
    { action: "Aplicar técnicamente una política de contraseñas robustas.", example: "Ej.: mínimo 12 caracteres y bloqueo tras varios intentos fallidos." },
    { action: "Establecer respaldos periódicos, aislados y probar su restauración.", example: "Ej.: respaldo diario offline y prueba de restauración trimestral." },
  ],
  "DPC-TRA-001": [
    { action: "Publicar la política de tratamiento y mantenerla accesible al público.", example: "Ej.: 'Política de Privacidad' enlazada en el pie de todas las páginas." },
    { action: "Incluir en la política la fecha, versión e individualización del responsable.", example: "Ej.: 'Responsable: Empresa X, RUT…, v2 — 01/2026'." },
    { action: "Redactar la información al titular de forma clara, precisa e inequívoca.", example: "Ej.: lenguaje simple, sin jerga legal, que se entienda al leerlo." },
    { action: "Actualizar la política cuando cambien los tratamientos o la normativa.", example: "Ej.: al sumar un nuevo tratamiento, se actualiza la política." },
  ],
  "DPC-CON-001": [
    { action: "Hacer que el personal con acceso a datos firme compromisos de confidencialidad.", example: "Ej.: cláusula de confidencialidad en el contrato de trabajo." },
    { action: "Incorporar cláusulas de secreto que subsistan tras el término de la relación.", example: "Ej.: la cláusula dice que la obligación sigue tras el fin del contrato." },
    { action: "Capacitar al personal sobre el deber de confidencialidad.", example: "Ej.: charla anual de protección de datos con registro de asistencia." },
    { action: "Extender las cláusulas de confidencialidad a encargados y terceros.", example: "Ej.: los contratos con proveedores incluyen cláusula de confidencialidad." },
  ],
  "DPC-INV-001": [
    { action: "Levantar el RAT cubriendo todos los procesos de negocio que tratan datos personales.", example: "Ej.: incluir Ventas, RRHH, Marketing, Postventa y Postulaciones." },
    { action: "Registrar en cada actividad la finalidad, categorías de datos, base de licitud y plazo de retención.", example: "Ej.: 'Nómina — pago de sueldos — datos bancarios — contrato — 6 años'." },
    { action: "Identificar sistemas, ubicaciones y responsables de cada base de datos.", example: "Ej.: 'Clientes → CRM en la nube → responsable: jefe comercial'." },
    { action: "Establecer la actualización del RAT ante nuevos tratamientos o cambios relevantes.", example: "Ej.: al contratar un software nuevo, se agrega su tratamiento al RAT." },
  ],
  "DPC-INV-002": [
    { action: "Elaborar un diagrama del ciclo de vida del dato de extremo a extremo.", example: "Ej.: esquema recolección → uso → almacenamiento → eliminación." },
    { action: "Identificar todas las transferencias hacia terceros y hacia el extranjero.", example: "Ej.: marcar que el CRM aloja los datos en Brasil." },
    { action: "Amparar cada transferencia internacional con un mecanismo de resguardo válido.", example: "Ej.: cláusulas contractuales de adecuación con el proveedor extranjero." },
    { action: "Documentar el punto y método de eliminación al final del ciclo de vida.", example: "Ej.: 'al cerrar la cuenta, los datos se borran a los 30 días'." },
  ],
  "DPC-DER-001": [
    { action: "Habilitar un canal formal, visible y exclusivo para solicitudes ARCOP.", example: "Ej.: formulario 'Ejerce tus derechos' en la web y un correo dedicado." },
    { action: "Definir un procedimiento de verificación de identidad del solicitante.", example: "Ej.: pedir cédula o validar por el correo registrado antes de responder." },
    { action: "Asegurar el cumplimiento de los plazos legales de respuesta con registro de cada gestión.", example: "Ej.: responder dentro del plazo legal y dejar constancia de cada solicitud." },
    { action: "Asignar responsables internos para tramitar cada tipo de derecho ARCOP.", example: "Ej.: acceso lo atiende soporte; supresión, el DPD." },
  ],
  "DPC-SEN-001": [
    { action: "Justificar y documentar el tratamiento biométrico en un anexo contractual.", example: "Ej.: anexo que explica por qué se usa la huella para marcar asistencia." },
    { action: "Almacenar las plantillas biométricas cifradas de forma irreversible (hash).", example: "Ej.: guardar el hash de la huella, no la imagen del dedo." },
    { action: "Ofrecer una alternativa de marcación para trabajadores que no consientan la biometría.", example: "Ej.: quien no quiera huella, marca con tarjeta o clave." },
    { action: "Definir un enrolamiento controlado y la eliminación al término de la relación laboral.", example: "Ej.: al renunciar el trabajador, se borra su plantilla biométrica." },
  ],
  "DPC-TER-001": [
    { action: "Levantar y mantener un inventario actualizado de encargados y sub-encargados.", example: "Ej.: lista 'AWS (hosting), Contador X, Software RRHH Y'." },
    { action: "Suscribir con cada encargado crítico un contrato con cláusulas de tratamiento de datos.", example: "Ej.: anexo de datos (DPA) firmado con cada proveedor." },
    { action: "Evaluar el nivel de seguridad del proveedor antes de contratarlo.", example: "Ej.: checklist de seguridad y certificaciones antes de contratar el CRM." },
    { action: "Regular en el contrato la confidencialidad, la gestión de brechas y la devolución/eliminación de datos.", example: "Ej.: el contrato obliga a avisar brechas y a devolver/borrar datos al terminar." },
  ],
  "DPC-TER-002": [
    { action: "Identificar todas las transferencias internacionales de datos.", example: "Ej.: detectar que Mailchimp guarda los correos en EE.UU." },
    { action: "Amparar cada transferencia con un mecanismo de resguardo válido conforme a la ley.", example: "Ej.: cláusulas contractuales tipo o un país con nivel adecuado." },
    { action: "Incluir garantías de adecuación en los contratos con destinatarios en el extranjero.", example: "Ej.: anexo de transferencia internacional firmado con el proveedor." },
    { action: "Documentar el país de destino y su nivel de protección.", example: "Ej.: registro 'Destino: EE.UU. — garantía: cláusulas contractuales'." },
  ],
  "DPC-INC-001": [
    { action: "Elaborar un manual de respuesta a brechas con fases de detección, contención y cierre.", example: "Ej.: documento con fases detectar → contener → notificar → cerrar." },
    { action: "Definir roles, responsables y vías de escalamiento ante incidentes.", example: "Ej.: 'detecta soporte → evalúa DPD → decide gerencia'." },
    { action: "Fijar criterios y plazos para notificar a la APDP y a los afectados.", example: "Ej.: 'si afecta datos sensibles, notificar a la Agencia sin dilación'." },
    { action: "Incorporar el registro y la evaluación posterior de cada incidente.", example: "Ej.: tras un incidente, informe de lecciones aprendidas." },
  ],
  "DPC-INC-002": [
    { action: "Implementar un registro histórico y centralizado de eventos e incidentes de seguridad.", example: "Ej.: bitácora única con fecha, tipo e impacto de cada incidente." },
    { action: "Difundir un protocolo de reporte conocido y accesible para el personal.", example: "Ej.: instructivo '¿Viste algo raro? Reporta a seguridad@…'." },
    { action: "Cubrir la doble notificación aplicable: APDP y ANCI/CSIRT.", example: "Ej.: procedimiento que cubre avisar a la Agencia y al CSIRT si aplica." },
    { action: "Ejecutar simulacros de brecha y conservar evidencia de los últimos 12 meses.", example: "Ej.: simulacro de filtración anual con acta de resultados." },
  ],
  "DPC-EIA-001": [
    { action: "Identificar los tratamientos de alto riesgo que requieren Evaluación de Impacto (EIPD).", example: "Ej.: marcar 'videovigilancia masiva' o 'scoring' como alto riesgo." },
    { action: "Ejecutar la EIPD antes de iniciar el tratamiento.", example: "Ej.: evaluar antes de lanzar el nuevo sistema de perfilamiento." },
    { action: "Documentar en la EIPD los riesgos, el impacto y las medidas de mitigación.", example: "Ej.: informe con riesgos identificados y medidas para reducirlos." },
    { action: "Revisar la EIPD periódicamente y ante cambios relevantes.", example: "Ej.: revisarla al cambiar el algoritmo o el alcance del tratamiento." },
  ],
  "DPC-EIA-002": [
    { action: "Inventariar los procesos con decisiones automatizadas o perfilamiento.", example: "Ej.: listar 'preselección automática de CV', 'scoring crediticio'." },
    { action: "Establecer supervisión humana significativa sobre la decisión automatizada.", example: "Ej.: una persona revisa y puede cambiar la decisión del sistema." },
    { action: "Informar al titular sobre la lógica y las consecuencias del tratamiento automatizado.", example: "Ej.: avisar 'tu solicitud se evalúa con un modelo automático'." },
    { action: "Habilitar un canal para revisar o impugnar la decisión automatizada.", example: "Ej.: opción 'Solicitar revisión humana' de la decisión." },
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
