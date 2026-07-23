/**
 * Mapa brecha → plan de mitigación (detalle premium 2026-07-21): por cada
 * brecha del catálogo, un plan CONCRETO y trazable — objetivo de cierre,
 * acciones específicas (qué hacer, cómo, y qué evidencia lo respalda),
 * metadatos de gestión (prioridad, esfuerzo, plazo), los documentos tipo que
 * la ejecutan y el control KPC al que queda trazada.
 *
 * Reemplaza el modelo de "pasos" planos: el cliente pagó por un plan de
 * consultoría, no por una lista genérica. La propuesta de mitigación en
 * profundidad (larga, descargable en PDF) vive en content/mitigations/<code>.md
 * y se sirve aparte; acá va el plan operativo que se muestra en pantalla.
 *
 * ⚠️ BORRADOR PENDIENTE DE REVISIÓN LEGAL/CONSULTOR (mismo gate que
 * breach-content.ts). El test de consistencia verifica que toda brecha del
 * catálogo tenga plan y que todo templateId exista.
 */

export type MitigationPriority = "alta" | "media" | "baja";
export type MitigationEffort = "bajo" | "medio" | "alto";

export interface MitigationAction {
  /** Acción concreta, en imperativo. */
  title: string;
  /** Cómo ejecutarla, específico al contexto de una pyme chilena. */
  detail: string;
  /** Qué queda como prueba de que se hizo (lo que se sube a Evidencias). */
  evidence: string;
}

export interface BreachMitigation {
  /** Qué significa, en concreto, que esta brecha quede resuelta. */
  objective: string;
  priority: MitigationPriority;
  effort: MitigationEffort;
  /** Plazo estimado de cierre en semanas (referencial). */
  estimatedWeeks: number;
  /** Acciones del plan, en orden sugerido de ejecución. */
  actions: readonly MitigationAction[];
  /** Documentos tipo que ejecutan la mitigación. */
  templateIds: readonly string[];
  /** Control del marco KPC al que queda trazada. */
  controlCode: string;
}

export const BREACH_MITIGATION: Record<string, BreachMitigation> = {
  "B-GOB-001": {
    objective:
      "Que exista una política de tratamiento de datos publicada y vigente que informe a clientes, trabajadores y proveedores cómo se tratan sus datos, con los 12 contenidos que exige el Art. 14 ter.",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Completar la política de tratamiento con la operación real",
        detail:
          "Partir del documento tipo y reemplazar cada campo genérico por la realidad de la empresa: qué categorías de datos trata, con qué finalidad, con qué base de licitud, quién accede y por cuánto tiempo se conservan.",
        evidence: "Política de tratamiento en su versión final (PDF o documento), con fecha y número de versión.",
      },
      {
        title: "Publicarla y dejarla accesible",
        detail:
          "Publicar la política en el sitio web (enlace en el pie de página) y, si se atiende presencialmente, dejar una copia disponible en el local. Debe poder consultarse sin pedirla.",
        evidence: "URL donde está publicada, o foto del documento disponible en el local.",
      },
      {
        title: "Enlazarla en cada punto de recolección",
        detail:
          "Referenciar la política donde se piden datos: formularios web, fichas de cliente, contratos y documentos de ingreso de personal, para cumplir el deber de informar al recolectar (Art. 14 bis).",
        evidence: "Captura del formulario o documento donde aparece el enlace o la mención a la política.",
      },
    ],
    templateIds: ["politica-privacidad"],
    controlCode: "KPC-TRA-001",
  },
  "B-GOB-002": {
    objective:
      "Que haya una persona formalmente designada como responsable de protección de datos, con funciones y canal de contacto conocidos dentro y fuera de la organización.",
    priority: "media",
    effort: "bajo",
    estimatedWeeks: 2,
    actions: [
      {
        title: "Designar formalmente al responsable",
        detail:
          "Elegir a quien asumirá el rol (puede ser un cargo existente) y formalizarlo con el acta de designación, dejando por escrito sus funciones: mantener la política y el RAT, canalizar los derechos ARCOP, coordinar la respuesta a incidentes y reportar a la administración.",
        evidence: "Acta de designación firmada por el representante legal y la persona designada.",
      },
      {
        title: "Comunicar la designación al equipo",
        detail:
          "Informar al personal quién es el responsable y por qué canal se le contacta para dudas de datos personales (correo dedicado o interno).",
        evidence: "Correo o comunicación interna de difusión, con fecha.",
      },
      {
        title: "Publicar su contacto en la política",
        detail:
          "Incluir el nombre del rol y el canal de contacto en la política de tratamiento, como exige el Art. 14 ter letra b.",
        evidence: "Sección de la política que individualiza al responsable.",
      },
    ],
    templateIds: ["acta-designacion-responsable"],
    controlCode: "KPC-RES-001",
  },
  "B-INV-001": {
    objective:
      "Que exista un Registro de Actividades de Tratamiento (RAT) escrito y actualizado que dé cuenta de qué datos personales trata la empresa, dónde están, para qué y por cuánto tiempo.",
    priority: "alta",
    effort: "alto",
    estimatedWeeks: 4,
    actions: [
      {
        title: "Recorrer cada área y levantar sus tratamientos",
        detail:
          "Entrevistar a ventas, administración, RRHH y marketing para listar cada actividad que usa datos personales (venta y facturación, remuneraciones, campañas, postulaciones) y registrarla en el RAT tipo.",
        evidence: "RAT con al menos una fila por actividad de tratamiento identificada.",
      },
      {
        title: "Completar base de licitud, destinatarios y plazos",
        detail:
          "Para cada actividad, dejar registrada la base de licitud (contrato, consentimiento, obligación legal…), a quién se comunican los datos (incluidos proveedores) y el plazo de conservación.",
        evidence: "RAT con las columnas de base de licitud, destinatarios y conservación completas.",
      },
      {
        title: "Asignar responsable y ciclo de revisión",
        detail:
          "Designar quién mantiene el RAT y fijar una revisión al menos anual, o cada vez que se agregue un sistema o una nueva actividad de tratamiento.",
        evidence: "Registro de la fecha de última revisión y del responsable en el propio RAT.",
      },
    ],
    templateIds: ["rat-registro-tratamientos"],
    controlCode: "KPC-INV-001",
  },
  "B-LEG-001": {
    objective:
      "Que todas las comunicaciones comerciales se envíen solo a quienes dieron un consentimiento libre, informado y específico, y que ese consentimiento pueda acreditarse.",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Depurar la base de marketing",
        detail:
          "Separar los contactos con consentimiento acreditable de los que no lo tienen; dejar de enviar comunicaciones comerciales a estos últimos hasta recabar su autorización.",
        evidence: "Base de marketing con la marca de origen del consentimiento por contacto.",
      },
      {
        title: "Implementar la captación de consentimiento",
        detail:
          "Usar el consentimiento tipo: casilla NO pre-marcada en formularios web y texto de autorización en puntos presenciales, con los canales que el titular elige (correo, WhatsApp, SMS). Registrar fecha y canal.",
        evidence: "Formulario o texto de consentimiento en producción + muestra del registro de un consentimiento.",
      },
      {
        title: "Habilitar la baja en cada envío",
        detail:
          "Incluir en cada correo/SMS un mecanismo simple de desuscripción y procesar las bajas de inmediato (derecho de oposición, Art. 8° letra b y Art. 28 B Ley 19.496).",
        evidence: "Captura de un envío mostrando la opción de baja.",
      },
    ],
    templateIds: ["consentimiento-marketing"],
    controlCode: "KPC-LIC-001",
  },
  "B-LEG-002": {
    objective:
      "Que todo tratamiento de datos sensibles cuente con consentimiento expreso y por escrito del titular, o con otra habilitación legal, y que se pueda demostrar.",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Identificar los datos sensibles que se tratan",
        detail:
          "Listar qué datos sensibles maneja la empresa (salud, biométricos, financieros, de menores) y con qué finalidad, apoyándose en el RAT.",
        evidence: "Listado de tratamientos de datos sensibles con su finalidad.",
      },
      {
        title: "Recabar el consentimiento expreso",
        detail:
          "Obtener de cada titular el consentimiento expreso con el formulario tipo de datos sensibles, que detalla la categoría, la finalidad específica y el plazo de conservación (Arts. 16 y 16 bis).",
        evidence: "Consentimientos firmados, resguardados de forma que puedan acreditarse ante la Agencia.",
      },
      {
        title: "Reforzar el resguardo de estos datos",
        detail:
          "Aplicar acceso restringido y las medidas de seguridad reforzadas a los datos sensibles, separándolos de los datos de contacto ordinarios.",
        evidence: "Descripción del control de acceso aplicado a los datos sensibles.",
      },
    ],
    templateIds: ["consentimiento-datos-sensibles"],
    controlCode: "KPC-LIC-001",
  },
  "B-LEG-003": {
    objective:
      "Que cada dato se use solo para la finalidad que se informó al recolectarlo, sin reutilizar bases operativas para marketing sin una base de licitud propia.",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 2,
    actions: [
      {
        title: "Separar las bases por finalidad",
        detail:
          "Distinguir la base operativa (boletas, despacho, soporte) de la base de marketing; no mezclar los teléfonos y correos recolectados para operar con los envíos comerciales.",
        evidence: "Evidencia de la separación (dos bases o una marca de finalidad por registro).",
      },
      {
        title: "Usar en marketing solo lo consentido",
        detail:
          "Enviar comunicaciones comerciales únicamente a contactos con consentimiento específico para ese fin (ver mitigación de marketing).",
        evidence: "Cruce entre la base de marketing y los consentimientos.",
      },
      {
        title: "Declarar cada finalidad",
        detail:
          "Dejar explícitas las finalidades en la política de tratamiento y en el punto de recolección, para que el titular sepa a qué se destinan sus datos (principio de finalidad, Art. 3° letra b).",
        evidence: "Sección de finalidades de la política y del formulario.",
      },
    ],
    templateIds: ["consentimiento-marketing", "politica-privacidad"],
    controlCode: "KPC-FIN-001",
  },
  "B-SEG-001": {
    objective:
      "Que los datos personales dejen de vivir en planillas y equipos sin control, y pasen a un entorno con acceso restringido, respaldo y trazabilidad proporcional al riesgo (Art. 14 quinquies).",
    priority: "alta",
    effort: "alto",
    estimatedWeeks: 5,
    actions: [
      {
        title: "Consolidar los datos en un repositorio con acceso controlado",
        detail:
          "Migrar las planillas Excel y documentos sueltos a una unidad corporativa con permisos por rol (Google Workspace o Microsoft 365 Business) o al módulo de un ERP/CRM de gestión (Defontana, Nubox, Bsale, o un CRM como HubSpot/Zoho); retirar las copias sueltas una vez migradas.",
        evidence: "Captura del repositorio con la estructura de carpetas y la configuración de permisos.",
      },
      {
        title: "Crear cuentas individuales con mínimo privilegio",
        detail:
          "Reemplazar los usuarios compartidos por una cuenta por persona, con acceso solo a lo que su función requiere; activar verificación en dos pasos (Google/Microsoft Authenticator o Authy) donde el sistema lo permita.",
        evidence: "Listado de usuarios y sus niveles de acceso; captura de la verificación en dos pasos activa.",
      },
      {
        title: "Habilitar respaldo y bitácora",
        detail:
          "Aprovechar el respaldo e historial de versiones de la nube corporativa (o un servicio como Backblaze), cifrar los equipos con BitLocker/FileVault y, donde el sistema lo permita, activar el registro de quién accede o modifica los datos.",
        evidence: "Configuración del respaldo (frecuencia) y muestra de la bitácora de accesos.",
      },
      {
        title: "Adoptar la política de seguridad y capacitar",
        detail:
          "Formalizar las reglas mínimas con la política de seguridad tipo (contraseñas, prohibición de nube personal, escritorio limpio) y capacitar al equipo en su aplicación.",
        evidence: "Política de seguridad firmada + registro de la capacitación.",
      },
    ],
    templateIds: ["politica-seguridad-accesos"],
    controlCode: "KPC-SEG-001",
  },
  "B-SEG-002": {
    objective:
      "Que ningún dato personal de la empresa se almacene en cuentas personales de nube (Gmail/Hotmail), sino en cuentas empresariales con control de administración.",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Migrar a cuentas empresariales",
        detail:
          "Mover los datos desde cuentas personales a una cuenta empresarial (Google Workspace o Microsoft 365 Business), que permite administrar accesos, revocar usuarios y aplicar políticas centrales.",
        evidence: "Confirmación de la cuenta empresarial activa y de la migración de los archivos.",
      },
      {
        title: "Endurecer el acceso",
        detail:
          "Activar verificación en dos pasos (Google/Microsoft Authenticator o Authy) para todas las cuentas y cifrado en los dispositivos que acceden (BitLocker en Windows, FileVault en Mac).",
        evidence: "Captura de la verificación en dos pasos y del cifrado del dispositivo.",
      },
      {
        title: "Prohibir la nube personal por política",
        detail:
          "Dejar por escrito en la política de seguridad la prohibición de usar cuentas personales para datos de la empresa, y retirar los archivos que aún queden en ellas.",
        evidence: "Cláusula de la política + confirmación de retiro de las cuentas personales.",
      },
    ],
    templateIds: ["politica-seguridad-accesos"],
    controlCode: "KPC-SEG-002",
  },
  "B-SEG-003": {
    objective:
      "Que la empresa tenga un plan escrito para responder ante una filtración o pérdida de datos, conocido por el equipo, incluyendo a quién y cuándo notificar.",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 2,
    actions: [
      {
        title: "Adoptar el plan de respuesta a incidentes",
        detail:
          "Completar el plan tipo con los roles y contactos reales de la empresa y las fases de detección, contención, evaluación de riesgo y notificación (a la Agencia sin dilaciones indebidas y a los titulares cuando corresponda, Art. 14 sexies).",
        evidence: "Plan de respuesta a incidentes con roles y contactos completos.",
      },
      {
        title: "Difundirlo al equipo",
        detail:
          "Asegurar que todo el personal sepa a quién avisar apenas detecte un incidente; dejar el contacto visible.",
        evidence: "Comunicación interna del plan y del canal de reporte.",
      },
      {
        title: "Ensayar el plan",
        detail:
          "Hacer un simulacro simple al menos una vez al año para verificar que el flujo funciona y ajustar lo que falle.",
        evidence: "Acta o registro breve del simulacro realizado.",
      },
    ],
    templateIds: ["plan-respuesta-incidentes"],
    controlCode: "KPC-INC-001",
  },
  "B-INC-001": {
    objective:
      "Que exista un registro interno de incidentes de seguridad y que los incidentes pasados que lo requerían hayan sido regularizados.",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 2,
    actions: [
      {
        title: "Abrir el registro de incidentes",
        detail:
          "Habilitar el registro tipo y documentar los incidentes conocidos de los últimos años (qué pasó, qué datos y titulares se afectaron, qué se hizo).",
        evidence: "Registro de incidentes con los casos históricos documentados.",
      },
      {
        title: "Regularizar incidentes pendientes",
        detail:
          "Evaluar, con apoyo del consultor, si algún incidente pasado exigía notificar a la Agencia o a los titulares y, de ser así, dejar constancia de la regularización.",
        evidence: "Registro de la evaluación y, si aplica, de la notificación tardía.",
      },
      {
        title: "Instaurar el registro continuo",
        detail:
          "Registrar todo incidente futuro apenas se detecte, aunque parezca menor, como parte de la gestión de vulneraciones.",
        evidence: "Procedimiento que instruye registrar cada incidente.",
      },
    ],
    templateIds: ["plan-respuesta-incidentes"],
    controlCode: "KPC-INC-002",
  },
  "B-TER-001": {
    objective:
      "Que todo proveedor que accede a datos personales de la empresa (contador, software, hosting) esté regulado por un contrato de encargo con obligaciones de confidencialidad y seguridad (Art. 15 bis).",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Inventariar los encargados",
        detail:
          "Listar todos los proveedores que tratan datos por cuenta de la empresa: contabilidad, software de gestión, hosting, correo, marketing, mensajería.",
        evidence: "Listado de proveedores con acceso a datos personales.",
      },
      {
        title: "Firmar la cláusula de encargo con cada uno",
        detail:
          "Anexar la cláusula de encargo tipo a los contratos vigentes o firmarla por separado, fijando finalidad, medidas de seguridad, régimen de subcontratación y destino de los datos al término.",
        evidence: "Cláusulas de encargo firmadas por cada proveedor.",
      },
      {
        title: "Exigir notificación de brechas",
        detail:
          "Verificar que la cláusula obligue al proveedor a avisar a la empresa ante cualquier incidente en un plazo breve, para poder cumplir el deber de notificación propio.",
        evidence: "Cláusula que contiene la obligación de notificación del encargado.",
      },
    ],
    templateIds: ["clausula-encargo"],
    controlCode: "KPC-TER-001",
  },
  "B-CON-002": {
    objective:
      "Que el estudio contable u otro proveedor que procesa datos de trabajadores lo haga bajo contrato de encargo con confidencialidad expresa sobre remuneraciones y antecedentes laborales.",
    priority: "alta",
    effort: "bajo",
    estimatedWeeks: 2,
    actions: [
      {
        title: "Firmar la cláusula de encargo con el proveedor de datos laborales",
        detail:
          "Regular con el estudio contable (o quien liquide remuneraciones) el tratamiento de los datos de trabajadores mediante la cláusula de encargo tipo.",
        evidence: "Cláusula de encargo firmada con el proveedor contable.",
      },
      {
        title: "Pactar confidencialidad reforzada",
        detail:
          "Dejar expresa la obligación de reserva sobre remuneraciones, contratos y antecedentes del personal (Art. 154 bis del Código del Trabajo).",
        evidence: "Cláusula de confidencialidad específica sobre datos laborales.",
      },
    ],
    templateIds: ["clausula-encargo"],
    controlCode: "KPC-TER-001",
  },
  "B-ENC-001": {
    objective:
      "Que cuando la empresa trata datos de los clientes de sus propios clientes (como encargada), exista un contrato de encargo que la habilite y regule la subcontratación y la devolución de los datos.",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Formalizar el encargo con cada cliente",
        detail:
          "Firmar con cada cliente cuyos datos se tratan un contrato de encargo que defina objeto, finalidad, medidas de seguridad y duración (Art. 15 bis, visto desde el prestador del servicio).",
        evidence: "Contratos de encargo firmados con los clientes.",
      },
      {
        title: "Regular la subcontratación",
        detail:
          "Establecer que cualquier tercero que la empresa incorpore (freelancers, otra herramienta) requiere autorización previa y por escrito del cliente.",
        evidence: "Cláusula de subcontratación en el contrato de encargo.",
      },
      {
        title: "Definir el destino de los datos al término",
        detail:
          "Acordar por escrito qué ocurre con los datos cuando termina el servicio: devolución o eliminación verificable.",
        evidence: "Cláusula de devolución/eliminación al término del servicio.",
      },
    ],
    templateIds: ["clausula-encargo"],
    controlCode: "KPC-TER-001",
  },
  "B-TER-002": {
    objective:
      "Que las transferencias de datos a servidores fuera de Chile cuenten con garantías contractuales y que los titulares estén informados del destino de sus datos (Art. 14 ter letra h, Art. 15).",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Mapear los datos que salen del país",
        detail:
          "Identificar qué servicios (nube, casa matriz, software) almacenan o procesan datos fuera de Chile y en qué país; apoyarse en el RAT.",
        evidence: "Inventario de servicios con datos en el extranjero y su país de destino.",
      },
      {
        title: "Anexar cláusulas de transferencia internacional",
        detail:
          "Agregar a los contratos con esos proveedores las cláusulas de transferencia tipo, que garantizan un nivel de protección adecuado y la colaboración con los derechos del titular.",
        evidence: "Cláusulas de transferencia firmadas o incorporadas al contrato.",
      },
      {
        title: "Informar la transferencia",
        detail:
          "Declarar en la política de tratamiento que hay datos alojados en el extranjero, el país y las garantías adoptadas.",
        evidence: "Sección de transferencias internacionales de la política.",
      },
    ],
    templateIds: ["clausulas-transferencia-internacional", "politica-privacidad"],
    controlCode: "KPC-TER-002",
  },
  "B-CES-001": {
    objective:
      "Que el intercambio de datos con otras empresas (grupo, franquicias, partners) tenga base legal — consentimiento del titular u otra causa — y conste en un acuerdo escrito de cesión (Art. 15).",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Suspender el intercambio sin base legal",
        detail:
          "Detener el traspaso de bases de datos a otras empresas mientras no exista consentimiento del titular o un acuerdo que lo habilite.",
        evidence: "Constancia de la suspensión del intercambio.",
      },
      {
        title: "Firmar el acuerdo de cesión",
        detail:
          "Con cada empresa receptora, firmar el acuerdo de cesión tipo que fija la finalidad específica del cesionario y sus obligaciones (usar solo para lo pactado, no re-ceder, seguridad).",
        evidence: "Acuerdos de cesión firmados con cada receptor.",
      },
      {
        title: "Informar y recabar consentimiento",
        detail:
          "Informar a los titulares que sus datos se comparten y recabar su consentimiento cuando esa sea la base de licitud aplicable.",
        evidence: "Texto informativo y registro de consentimientos de cesión.",
      },
    ],
    templateIds: ["acuerdo-cesion-datos"],
    controlCode: "KPC-LIC-001",
  },
  "B-DER-001": {
    objective:
      "Que las personas puedan ejercer sus derechos (acceso, rectificación, supresión, oposición, portabilidad, bloqueo) por un canal definido y recibir respuesta dentro de 30 días corridos.",
    priority: "alta",
    effort: "bajo",
    estimatedWeeks: 2,
    actions: [
      {
        title: "Definir y publicar el canal de derechos",
        detail:
          "Habilitar un canal único —un correo dedicado (p. ej. privacidad@tuempresa.cl) o un formulario (Google Forms, Microsoft Forms, Typeform)— para recibir solicitudes de derechos y publicarlo en la política de tratamiento y en el sitio.",
        evidence: "Canal publicado (URL o correo) y mención en la política.",
      },
      {
        title: "Adoptar el formulario y el flujo",
        detail:
          "Usar el formulario ARCOP tipo, verificar la identidad del solicitante y registrar cada solicitud con su fecha de ingreso para controlar el plazo legal.",
        evidence: "Formulario ARCOP en uso + registro de solicitudes.",
      },
      {
        title: "Responder dentro de plazo",
        detail:
          "Resolver cada solicitud dentro de 30 días corridos (Arts. 4° a 11) y dejar constancia de la respuesta entregada.",
        evidence: "Constancia de una respuesta con su fecha, dentro de plazo.",
      },
    ],
    templateIds: ["formulario-arco", "politica-privacidad"],
    controlCode: "KPC-DER-001",
  },
  "B-SAL-001": {
    objective:
      "Que las fichas y datos de salud se traten con acceso restringido al equipo tratante, con registro de accesos y conservados por el plazo legal (Ley 20.584 y Dto. 41 MINSAL).",
    priority: "alta",
    effort: "alto",
    estimatedWeeks: 6,
    actions: [
      {
        title: "Restringir el acceso a la ficha clínica",
        detail:
          "Limitar el acceso a las fichas solo al personal que atiende directamente al paciente; retirar accesos generales o cuentas compartidas.",
        evidence: "Matriz de accesos a fichas por rol.",
      },
      {
        title: "Migrar a un sistema con perfiles y trazabilidad",
        detail:
          "Llevar los registros clínicos a un sistema de ficha clínica electrónica que controle el acceso por perfil y registre quién consulta cada ficha (por ejemplo Rayen, Medilink, Nubimed o Agendapro), en vez de Excel o Drive (Art. 12-15 Ley 20.584).",
        evidence: "Captura del sistema con control por perfil y registro de accesos.",
      },
      {
        title: "Asegurar conservación y consentimiento",
        detail:
          "Conservar las fichas por el plazo legal (15 años desde la última atención, Dto. 41/2013) y recabar el consentimiento expreso donde corresponda al tratamiento de datos de salud.",
        evidence: "Política de conservación de fichas + consentimientos de datos de salud.",
      },
    ],
    templateIds: ["politica-seguridad-accesos", "consentimiento-datos-sensibles"],
    controlCode: "KPC-SEN-001",
  },
  "B-MEN-001": {
    objective:
      "Que el tratamiento de datos de menores de 14 años cuente con la autorización de su padre, madre o representante legal y protección reforzada (Art. 16 quáter).",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Identificar los datos de menores",
        detail:
          "Determinar qué datos de menores de 14 años trata la empresa y con qué finalidad.",
        evidence: "Listado de tratamientos que involucran datos de menores.",
      },
      {
        title: "Obtener la autorización del representante",
        detail:
          "Recabar la autorización del padre, madre o representante legal con el formulario tipo, atendiendo al interés superior del niño.",
        evidence: "Autorizaciones firmadas por los representantes legales.",
      },
      {
        title: "Aplicar protección reforzada",
        detail:
          "Restringir el acceso a estos datos y minimizar su retención al mínimo necesario para la finalidad.",
        evidence: "Descripción del control de acceso y del plazo de retención aplicado.",
      },
    ],
    templateIds: ["consentimiento-datos-sensibles"],
    controlCode: "KPC-SEN-001",
  },
  "B-BIO-001": {
    objective:
      "Que el uso de datos biométricos esté informado por escrito, con alternativa no biométrica disponible, y los datos se almacenen cifrados y se eliminen al término de la relación (Art. 16 ter).",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Informar el tratamiento biométrico",
        detail:
          "Entregar a cada trabajador el anexo tipo que detalla el sistema usado, la finalidad, cómo se almacena el dato (plantilla cifrada, no la imagen) y por cuánto tiempo.",
        evidence: "Anexos de tratamiento biométrico firmados por los trabajadores.",
      },
      {
        title: "Ofrecer alternativa no biométrica",
        detail:
          "Habilitar una opción sin biometría (tarjeta o PIN) para quien no consienta, sin consecuencias; muchos sistemas de control horario chilenos la permiten (Geovictoria, Talana, BUK). El consentimiento en contexto laboral debe ser libre (dictámenes DT).",
        evidence: "Constancia de la alternativa disponible y de quiénes la usan.",
      },
      {
        title: "Cifrar y eliminar al término",
        detail:
          "Almacenar solo plantillas cifradas (hash irreversible) y eliminarlas cuando la persona deja la empresa.",
        evidence: "Descripción del cifrado y del procedimiento de eliminación al egreso.",
      },
    ],
    templateIds: ["anexo-biometria"],
    controlCode: "KPC-SEN-001",
  },
  "B-CCT-001": {
    objective:
      "Que la videovigilancia esté señalizada, no invada espacios privados y conserve las grabaciones por un plazo acotado con acceso restringido (DFL 3/2025; Art. 161-A Código Penal).",
    priority: "media",
    effort: "bajo",
    estimatedWeeks: 2,
    actions: [
      {
        title: "Señalizar las zonas con cámaras",
        detail:
          "Instalar el cartel de aviso tipo en accesos y en cada zona vigilada, informando la existencia de cámaras, la finalidad y el responsable.",
        evidence: "Fotos de los carteles instalados en las zonas con cámaras.",
      },
      {
        title: "Retirar cámaras de zonas privadas",
        detail:
          "Reorientar o retirar toda cámara que apunte a baños, vestidores, comedores u oficinas de descanso.",
        evidence: "Plano o inventario de cámaras confirmando que ninguna enfoca zonas privadas.",
      },
      {
        title: "Acotar retención y accesos",
        detail:
          "Fijar la conservación de las grabaciones en un máximo definido (30 días como referencia) y restringir quién puede visualizarlas.",
        evidence: "Configuración de retención + lista de personas con acceso a las grabaciones.",
      },
    ],
    templateIds: ["aviso-videovigilancia"],
    controlCode: "KPC-SEG-001",
  },
  "B-CON-001": {
    objective:
      "Que exista una política de retención que fije por cuánto tiempo se conserva cada tipo de dato y un procedimiento de eliminación segura al cumplirse ese plazo (Art. 3° letra c, Art. 14 letra d).",
    priority: "media",
    effort: "bajo",
    estimatedWeeks: 2,
    actions: [
      {
        title: "Definir plazos por categoría",
        detail:
          "Completar la política de retención tipo con los plazos por tipo de dato (tributarios, laborales, fichas clínicas, marketing, postulantes), atendiendo a la ley aplicable.",
        evidence: "Política de retención con la tabla de plazos completa.",
      },
      {
        title: "Eliminar lo que cumplió su plazo",
        detail:
          "Depurar los datos que ya cumplieron su finalidad o plazo legal, con borrado seguro (incluidos respaldos y papel).",
        evidence: "Constancia de la primera depuración realizada.",
      },
      {
        title: "Programar la revisión periódica",
        detail:
          "Fijar una limpieza al menos anual con un responsable asignado.",
        evidence: "Calendario de revisión y responsable designado.",
      },
    ],
    templateIds: ["politica-retencion-borrado"],
    controlCode: "KPC-FIN-002",
  },
  "B-WEB-001": {
    objective:
      "Que el sitio web informe el tratamiento en el punto de recolección, tenga política de privacidad accesible y gestione las cookies con consentimiento (Art. 14, Art. 14 ter).",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 2,
    actions: [
      {
        title: "Publicar y enlazar la política",
        detail:
          "Publicar la política de tratamiento en el sitio y enlazarla en el pie de página y junto a cada formulario que pide datos.",
        evidence: "URL de la política y captura del enlace junto a un formulario.",
      },
      {
        title: "Informar en el punto de recolección",
        detail:
          "Agregar un aviso breve de finalidad justo antes de enviar cada formulario, cumpliendo el deber de informar al recolectar.",
        evidence: "Captura del formulario con el aviso de finalidad.",
      },
      {
        title: "Gestionar cookies con consentimiento",
        detail:
          "Implementar un banner de cookies que permita aceptar o rechazar las de terceros antes de instalarlas (Cookiebot, Complianz o CookieYes; si el sitio es WordPress, hay plugins directos).",
        evidence: "Captura del banner de cookies con opción de rechazo.",
      },
    ],
    templateIds: ["politica-privacidad"],
    controlCode: "KPC-TRA-001",
  },
  "B-CAP-001": {
    objective:
      "Que el personal que trata datos personales esté capacitado y haya asumido por escrito el deber de confidencialidad, como medida organizativa de responsabilidad (Art. 3° letra e).",
    priority: "media",
    effort: "bajo",
    estimatedWeeks: 2,
    actions: [
      {
        title: "Capacitar al equipo",
        detail:
          "Realizar una capacitación básica de protección de datos a todo el personal que maneja datos: qué es un dato personal y sensible, reglas de seguridad, cómo derivar solicitudes ARCOP y qué hacer ante un incidente.",
        evidence: "Registro de la capacitación con contenidos, fecha y asistentes.",
      },
      {
        title: "Firmar el compromiso de confidencialidad",
        detail:
          "Que cada trabajador firme el acta de capacitación y compromiso de confidencialidad, cuyo deber de secreto subsiste terminada la relación.",
        evidence: "Actas de confidencialidad firmadas por el personal.",
      },
      {
        title: "Incorporar a la inducción",
        detail:
          "Agregar el módulo de protección de datos a la inducción de cada nuevo ingreso.",
        evidence: "Procedimiento de inducción que incluye el módulo.",
      },
    ],
    templateIds: ["acta-confidencialidad-capacitacion"],
    controlCode: "KPC-CON-001",
  },
  "B-LAB-001": {
    objective:
      "Que en la selección de personal solo se pidan datos necesarios para evaluar la idoneidad del cargo, sin campos que puedan derivar en discriminación (Art. 2 Código del Trabajo, minimización).",
    priority: "alta",
    effort: "bajo",
    estimatedWeeks: 2,
    actions: [
      {
        title: "Depurar los formularios de postulación",
        detail:
          "Revisar los formularios y fichas de postulación y eliminar los campos ajenos al cargo (estado civil, hijos, salud, situación socioeconómica).",
        evidence: "Formulario de postulación depurado.",
      },
      {
        title: "Adoptar la política de datos laborales",
        detail:
          "Formalizar las reglas de selección y tratamiento de datos de postulantes con la política tipo.",
        evidence: "Política de datos laborales adoptada.",
      },
      {
        title: "Eliminar datos de no seleccionados",
        detail:
          "Eliminar los antecedentes de postulantes no seleccionados dentro del plazo definido (referencia: 6 meses).",
        evidence: "Constancia de la depuración de postulaciones antiguas.",
      },
    ],
    templateIds: ["politica-datos-laborales"],
    controlCode: "KPC-PRO-001",
  },
  "B-LAB-002": {
    objective:
      "Que los datos de los trabajadores se traten con reserva, acceso restringido y con cualquier monitoreo regulado e informado previamente (Art. 154 bis Código del Trabajo, dictámenes DT).",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Informar el tratamiento al trabajador",
        detail:
          "Comunicar a los trabajadores qué datos suyos se manejan (carpeta, remuneraciones, evaluaciones) y quién accede, con la política de datos laborales.",
        evidence: "Constancia de comunicación de la política a los trabajadores.",
      },
      {
        title: "Restringir el acceso a datos laborales",
        detail:
          "Limitar el acceso a carpetas personales y remuneraciones solo a quienes lo necesitan por su función; una plataforma de RRHH (Talana, BUK, Rex) permite el control por rol en vez de carpetas compartidas.",
        evidence: "Matriz de accesos a datos de personal.",
      },
      {
        title: "Regular el monitoreo",
        detail:
          "Si se monitorea correo, equipos o ubicación, dejarlo por escrito en una política general (no dirigida a una persona), proporcional e informada antes de aplicarla (dictámenes DT).",
        evidence: "Política de monitoreo comunicada + constancia de conocimiento del personal.",
      },
    ],
    templateIds: ["politica-datos-laborales"],
    controlCode: "KPC-CON-001",
  },
  "B-EIA-001": {
    objective:
      "Que las personas afectadas por decisiones automatizadas sepan que existe tal decisión, su lógica general, y puedan pedir revisión humana (Art. 8° bis).",
    priority: "alta",
    effort: "medio",
    estimatedWeeks: 3,
    actions: [
      {
        title: "Informar la decisión automatizada",
        detail:
          "Comunicar al titular, en el punto de la decisión y en la política, que existe un tratamiento automatizado y en qué se basa a grandes rasgos.",
        evidence: "Texto de aviso de decisión automatizada en producción.",
      },
      {
        title: "Habilitar la revisión humana",
        detail:
          "Definir una vía simple y publicada para que la persona solicite que un humano revise la decisión, exprese su punto de vista y reciba una explicación.",
        evidence: "Procedimiento de revisión humana y canal para solicitarla.",
      },
      {
        title: "Documentarlo en la política",
        detail:
          "Dejar la sección de decisiones automatizadas en la política de tratamiento.",
        evidence: "Sección de decisiones automatizadas de la política.",
      },
    ],
    templateIds: ["pauta-eipd", "politica-privacidad"],
    controlCode: "KPC-EIA-002",
  },
  "B-EIA-002": {
    objective:
      "Que los tratamientos de alto riesgo cuenten con una Evaluación de Impacto (EIPD) previa y documentada, con las medidas de mitigación identificadas aplicadas (Art. 15 ter).",
    priority: "alta",
    effort: "alto",
    estimatedWeeks: 4,
    actions: [
      {
        title: "Realizar la EIPD con la pauta tipo",
        detail:
          "Antes de seguir operando el sistema de alto riesgo, completar la pauta de EIPD: describir el tratamiento, evaluar necesidad y proporcionalidad, identificar riesgos para las personas.",
        evidence: "EIPD completa y firmada por el responsable.",
      },
      {
        title: "Aplicar las medidas de mitigación",
        detail:
          "Implementar las medidas que la evaluación identifique para reducir los riesgos detectados, con responsable y plazo.",
        evidence: "Registro de las medidas aplicadas con su responsable.",
      },
      {
        title: "Revisar ante cambios",
        detail:
          "Repetir o actualizar la EIPD cuando cambie el sistema, la finalidad o los datos tratados.",
        evidence: "Criterio de revisión documentado en la EIPD.",
      },
    ],
    templateIds: ["pauta-eipd"],
    controlCode: "KPC-EIA-001",
  },
};

export function getBreachMitigation(breachCode: string): BreachMitigation | null {
  return BREACH_MITIGATION[breachCode] ?? null;
}
