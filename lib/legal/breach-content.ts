/**
 * Contenido explicativo por brecha para el portal del cliente (sub-proyecto #3):
 * "por qué es un riesgo para tu empresa" y "qué dice la ley" (en detalle),
 * complementando lo persistido (description corta, artículos, severidad, multa).
 *
 * ⚠️ BORRADOR PENDIENTE DE REVISIÓN LEGAL. Redactado para acelerar; debe pasar
 * revisión del equipo legal ANTES de producción (gate pre-deploy). Las cifras y
 * artículos concretos se muestran desde el snapshot persistido; acá va la
 * narrativa. Basado en la Ley 21.719 (protección de datos personales, Chile).
 */
export interface BreachContent {
  /** Por qué esta brecha es un riesgo concreto para la empresa. */
  whyRisk: string;
  /** Qué exige la ley al respecto, en lenguaje llano. */
  lawDetail: string;
}

export const BREACH_CONTENT: Record<string, BreachContent> = {
  "B-GOB-001": {
    whyRisk:
      "Sin una gobernanza de datos definida (responsable, políticas, registro de actividades de tratamiento), la empresa no puede demostrar cumplimiento ante la Agencia de Protección de Datos ni responder con orden frente a un requerimiento o una fiscalización. La responsabilidad recae directamente en la organización.",
    lawDetail:
      "La ley consagra el principio de responsabilidad (accountability): no basta con cumplir, hay que poder demostrarlo con evidencia y gobernanza documentada. Esto incluye designar quién responde por el tratamiento y mantener un registro de las actividades de tratamiento de datos personales.",
  },
  "B-LEG-001": {
    whyRisk:
      "Tratar datos personales sin una base de licitud válida (consentimiento u otra causa legal) expone a la empresa a sanciones y a que las personas exijan el cese del tratamiento. Es una de las infracciones más frecuentes y de las primeras que revisa un fiscalizador.",
    lawDetail:
      "Toda operación con datos personales debe apoyarse en una base de licitud: consentimiento libre, informado y específico, o alguna de las causales que la ley reconoce (contrato, obligación legal, interés legítimo, etc.). Sin base válida, el tratamiento es ilícito.",
  },
  "B-LEG-002": {
    whyRisk:
      "Si el consentimiento no fue libre, informado y específico —o no queda registro de él—, la empresa no puede acreditar que estaba autorizada a tratar los datos, lo que invalida el tratamiento y agrava la exposición ante un reclamo.",
    lawDetail:
      "Cuando la base es el consentimiento, debe ser inequívoco y otorgado para finalidades determinadas, y la empresa debe poder demostrarlo. Un consentimiento genérico, tácito o sin registro no cumple el estándar de la ley.",
  },
  "B-LEG-003": {
    whyRisk:
      "Usar los datos para fines distintos de los informados (por ejemplo, marketing sin haberlo declarado) rompe el principio de finalidad y la confianza del titular, y es sancionable aunque los datos se hayan obtenido lícitamente.",
    lawDetail:
      "Los datos se recolectan para fines determinados, explícitos y legítimos, y no pueden reutilizarse para fines incompatibles con los informados al titular. Un cambio de finalidad requiere una nueva base de licitud.",
  },
  "B-SEG-001": {
    whyRisk:
      "Sin medidas de seguridad adecuadas, un incidente (filtración, acceso indebido, pérdida) es más probable y más grave; además la ley obliga a proteger los datos según el riesgo, por lo que su ausencia es en sí una infracción, no solo un problema técnico.",
    lawDetail:
      "El principio de seguridad exige medidas técnicas y organizativas apropiadas al riesgo del tratamiento (control de accesos, cifrado, respaldos, bitácoras). El nivel exigido es mayor mientras más sensibles o voluminosos sean los datos.",
  },
  "B-SEG-002": {
    whyRisk:
      "La falta de control de acceso (usuarios compartidos, permisos amplios) impide saber quién vio o modificó qué, dificulta contener un incidente y deja a la empresa sin trazabilidad para demostrar diligencia.",
    lawDetail:
      "Entre las medidas de seguridad razonables, la ley espera control de accesos individualizado y trazabilidad: cada persona con su credencial y registros que permitan auditar el acceso a los datos personales.",
  },
  "B-SEG-003": {
    whyRisk:
      "Sin registros de auditoría ni respaldos, ante un incidente la empresa no puede reconstruir qué pasó ni recuperar la información, y queda sin evidencia de que actuó con la diligencia que la ley exige.",
    lawDetail:
      "La seguridad del tratamiento incluye poder detectar y reconstruir accesos y cambios (auditoría) y asegurar la disponibilidad de los datos (respaldos). Su ausencia debilita tanto la prevención como la respuesta a incidentes.",
  },
  "B-TER-001": {
    whyRisk:
      "Cuando un proveedor externo trata datos por la empresa sin un contrato que fije obligaciones de protección, la empresa sigue siendo responsable de lo que ese tercero haga mal, sin herramientas para exigirle cumplimiento.",
    lawDetail:
      "Al encargar el tratamiento a un tercero (hosting, software, contador, etc.), debe existir un contrato que regule finalidad, confidencialidad y medidas de seguridad. El responsable no se libera de su responsabilidad por delegar la operación.",
  },
  "B-TER-002": {
    whyRisk:
      "Transferir datos al extranjero sin garantías adecuadas (por ejemplo, alojarlos en servicios fuera de Chile sin resguardos) expone a la empresa si el país de destino no ofrece protección equivalente y no se tomaron medidas.",
    lawDetail:
      "Las transferencias internacionales de datos requieren que el destino ofrezca un nivel de protección adecuado o que se adopten garantías apropiadas (cláusulas contractuales u otros mecanismos que la ley reconozca).",
  },
  "B-CON-001": {
    whyRisk:
      "Conservar datos más allá de lo necesario aumenta la superficie de riesgo (más datos que proteger y que pueden filtrarse) e infringe el deber de limitar la conservación al cumplimiento de la finalidad.",
    lawDetail:
      "Los datos deben conservarse solo por el tiempo necesario para la finalidad que justificó su recolección y luego suprimirse o anonimizarse. Guardar 'por si acaso' indefinidamente no cumple el principio de conservación limitada.",
  },
  "B-CON-002": {
    whyRisk:
      "Si la empresa no sabe dónde están todos los datos de una persona ni cómo eliminarlos, no puede responder a una solicitud de supresión ni cumplir los plazos, lo que deriva en reclamos y sanciones.",
    lawDetail:
      "El titular puede solicitar la supresión de sus datos, y la empresa debe poder ubicarlos y eliminarlos completamente dentro de los plazos legales. Esto exige tener mapeado dónde se almacenan.",
  },
  "B-DER-001": {
    whyRisk:
      "No tener un mecanismo para que las personas ejerzan sus derechos (acceso, rectificación, cancelación, oposición, portabilidad) genera incumplimiento automático apenas alguien lo solicita, y es fácil de fiscalizar.",
    lawDetail:
      "La ley reconoce a los titulares los derechos ARCOP y obliga a la empresa a habilitar canales y procedimientos para atenderlos en los plazos establecidos, de forma gratuita y expedita.",
  },
  "B-SAL-001": {
    whyRisk:
      "Los datos de salud son sensibles: su tratamiento sin las condiciones reforzadas que exige la ley conlleva las sanciones más altas y un daño reputacional serio, especialmente para clínicas y prestadores.",
    lawDetail:
      "Los datos de salud reciben protección reforzada: su tratamiento requiere una base de licitud calificada (consentimiento explícito u otra causal específica) y medidas de seguridad acordes a su sensibilidad.",
  },
  "B-MEN-001": {
    whyRisk:
      "Tratar datos de niños, niñas y adolescentes sin los resguardos especiales expone a la empresa a la máxima severidad, dado el interés superior del menor que la ley protege de forma reforzada.",
    lawDetail:
      "Los datos de menores tienen protección especial: su tratamiento debe atender el interés superior del niño y, por regla general, contar con autorización de quien ejerce su cuidado, además de medidas reforzadas.",
  },
  "B-BIO-001": {
    whyRisk:
      "Usar datos biométricos (huella, rostro, voz) para control de asistencia o acceso sin las condiciones legales expone a la empresa por tratar datos sensibles e irreemplazables: si se filtran, no se pueden 'cambiar' como una contraseña.",
    lawDetail:
      "Los datos biométricos que identifican a una persona son sensibles y su tratamiento exige base de licitud calificada, proporcionalidad (evaluar alternativas menos invasivas) y medidas de seguridad reforzadas.",
  },
  "B-CCT-001": {
    whyRisk:
      "Cámaras de videovigilancia sin señalética, sin finalidad definida ni control de las grabaciones tratan datos personales (imágenes) de trabajadores y clientes de forma que puede vulnerar su privacidad y ser sancionada.",
    lawDetail:
      "La videovigilancia trata datos personales: exige informar su existencia (señalética), una finalidad legítima y proporcional, y resguardar y conservar las imágenes por un tiempo limitado con acceso controlado.",
  },
  "B-WEB-001": {
    whyRisk:
      "Un sitio web o formulario que recolecta datos sin política de privacidad ni información clara incumple el deber de transparencia desde el primer contacto con el titular, algo visible y fácil de detectar.",
    lawDetail:
      "El deber de información obliga a informar de forma clara —típicamente en una política de tratamiento accesible— quién trata los datos, con qué finalidad y cómo ejercer los derechos, al momento de recolectarlos.",
  },
  "B-CAP-001": {
    whyRisk:
      "Si el equipo no está capacitado en protección de datos, los errores humanos (enviar datos al destinatario equivocado, malas prácticas de seguridad) se vuelven la principal fuente de incidentes, y la empresa no puede demostrar diligencia.",
    lawDetail:
      "La responsabilidad proactiva incluye medidas organizativas como la capacitación del personal que trata datos personales, de modo que las políticas de la empresa se apliquen efectivamente en el día a día.",
  },
  "B-GOB-002": {
    whyRisk:
      "Sin una persona formalmente a cargo, la protección de datos queda huérfana: nadie responde las solicitudes de los titulares, nadie mantiene las políticas al día y ante una fiscalización no hay interlocutor. La designación formal es de las primeras evidencias de gobernanza que se revisan.",
    lawDetail:
      "La política de tratamiento debe identificar al responsable y a quien ejerza el rol de prevención dentro de la organización. Designarlo formalmente —con respaldo escrito— es parte del estándar de gobernanza que la ley espera demostrar.",
  },
  "B-INV-001": {
    whyRisk:
      "Si la empresa no sabe qué datos tiene, dónde están y para qué los usa, no puede cumplir casi ninguna otra obligación: no puede responder a un titular, ni borrar datos a tiempo, ni contener bien un incidente. El inventario es la base de todo el cumplimiento.",
    lawDetail:
      "La ley exige poder dar cuenta del tratamiento: categorías de datos, finalidades, destinatarios, plazos de conservación y origen. Eso solo es posible con un registro de actividades de tratamiento (inventario) levantado y actualizado.",
  },
  "B-INC-001": {
    whyRisk:
      "Un incidente mal gestionado multiplica el daño: los afectados no pueden protegerse (cambiar claves, bloquear tarjetas), y la empresa que no registró ni notificó queda expuesta a que el incidente aparezca después, ya sin defensa de diligencia posible.",
    lawDetail:
      "Ante una vulneración de seguridad con riesgo para las personas, la ley obliga a reportar a la autoridad sin dilaciones indebidas y, si afecta datos sensibles, de menores o financieros, también a los titulares. Además exige llevar un registro de los incidentes.",
  },
  "B-EIA-001": {
    whyRisk:
      "Cuando un sistema decide solo (un crédito, una postulación, un precio), la persona afectada tiene derecho a saberlo y a pedir revisión humana. Ocultarlo convierte cada decisión del sistema en un reclamo potencial, con efecto multiplicado por el volumen de decisiones automatizadas.",
    lawDetail:
      "La ley reconoce el derecho a no ser objeto de decisiones puramente automatizadas con efectos significativos: el titular debe ser informado, poder expresar su punto de vista, obtener una explicación y solicitar la intervención de una persona.",
  },
  "B-EIA-002": {
    whyRisk:
      "Implementar un tratamiento de alto riesgo sin evaluar antes su impacto es avanzar a ciegas: los problemas se descubren cuando ya afectaron a personas. La EIPD es además la evidencia de diligencia que la autoridad pedirá primero si algo sale mal.",
    lawDetail:
      "Para tratamientos de alto riesgo —decisiones automatizadas con efectos relevantes, tratamiento masivo, monitoreo sistemático o datos sensibles— la ley exige una Evaluación de Impacto en Protección de Datos previa y documentada.",
  },
  "B-ENC-001": {
    whyRisk:
      "Cuando la empresa trata datos de los clientes de otros, trabaja con material ajeno: sin contrato que regule ese encargo, cualquier incidente o mal uso la deja expuesta ante su cliente y ante la autoridad, y puede perder la cuenta comercial completa.",
    lawDetail:
      "El tratamiento por encargo debe constar en un contrato escrito que fije objeto, duración, finalidad, medidas de seguridad, régimen de subcontratación y el destino de los datos al terminar el servicio.",
  },
  "B-LAB-001": {
    whyRisk:
      "Pedir en la selección datos que no se relacionan con el cargo (hijos, salud, situación socioeconómica) expone a la empresa a reclamos por discriminación laboral y constituye sobre-recolección de datos: dos frentes de riesgo por una misma costumbre.",
    lawDetail:
      "El principio de proporcionalidad limita la recolección a lo estrictamente necesario para la finalidad, y el Código del Trabajo prohíbe condicionar la contratación a datos ajenos a la capacidad e idoneidad para el cargo.",
  },
  "B-LAB-002": {
    whyRisk:
      "Los datos del trabajador (carpeta, sueldo, evaluaciones, monitoreo) son de las categorías más reclamadas ante la Dirección del Trabajo. Tratarlos sin informar ni restringir accesos daña la relación laboral y suma un frente de fiscalización adicional al de datos personales.",
    lawDetail:
      "El Código del Trabajo obliga al empleador a mantener reserva de la información y datos privados del trabajador, y los dictámenes de la Dirección del Trabajo exigen que todo monitoreo o control (correo, videovigilancia, ubicación) sea proporcional, informado y regulado en una política conocida.",
  },
  "B-CES-001": {
    whyRisk:
      "Compartir bases de clientes con otras empresas —aunque sean del mismo grupo— sin autorización convierte cada registro compartido en un tratamiento sin base de licitud, y suele descubrirse cuando el cliente recibe contactos de una empresa que no conoce.",
    lawDetail:
      "La cesión de datos personales a otra entidad requiere el consentimiento del titular u otra base legal, y debe constar por escrito. Cada empresa receptora pasa a responder también por el uso que haga de esos datos.",
  },
};

export function getBreachContent(breachCode: string): BreachContent | null {
  return BREACH_CONTENT[breachCode] ?? null;
}
