/**
 * Nodos de screening — 15 preguntas amplias que clasifican el perfil de
 * riesgo de la empresa. Cada respuesta puede activar ramas de deep-dive,
 * disparar brechas directamente, o redirigir a preguntas condicionales.
 *
 * Las brechas referencian artículos del texto promulgado de la Ley 21.719,
 * verificados contra BCN (idNorma=1209272).
 */

import type { BreachDescriptor, ScreeningNode } from "./decision-tree";

// ---------------------------------------------------------------------------
// Factor de riesgo → etiqueta
// ---------------------------------------------------------------------------

export const RISK_FACTOR_LABELS: Record<string, string> = {
  sensitive_data: "Datos sensibles",
  international_transfers: "Transferencias internacionales",
  critical_providers: "Proveedores críticos",
  health_sector: "Sector salud (regulación reforzada)",
  financial_sector: "Sector financiero (regulación reforzada)",
  biometric_data: "Datos biométricos",
  automated_decisions: "Decisiones automatizadas",
  marketing_data: "Marketing y comunicaciones",
  cctv: "Videovigilancia",
  minors_data: "Datos de niños, niñas o adolescentes",
  multi_site: "Múltiples sucursales o sedes",
  web_presence: "Presencia web o formularios online",
};

// ---------------------------------------------------------------------------
// Brechas predefinidas (referenciadas por ID desde los nodos)
// ---------------------------------------------------------------------------

export const SCREENING_BREACHES: Record<string, BreachDescriptor> = {
  // --- Gobernanza ---
  "B-GOB-001": {
    id: "B-GOB-001",
    description:
      "No existe una política de privacidad o documento que informe a los titulares sobre el tratamiento de sus datos.",
    severity: "alto",
    articles: ["Art. 14 ter (12 literales)"],
    fineRangeUtn: { min: 2_000, max: 10_000 },
    estimatedWeeks: 3,
    dimension: 4,
  },
  // --- Legitimidad ---
  "B-LEG-001": {
    id: "B-LEG-001",
    description:
      "Se envían comunicaciones de marketing sin consentimiento previo, libre, informado, específico e inequívoco.",
    severity: "alto",
    articles: ["Art. 12", "Art. 8° letra b)"],
    fineRangeUtn: { min: 2_000, max: 10_000 },
    estimatedWeeks: 2,
    dimension: 3,
  },
  "B-LEG-002": {
    id: "B-LEG-002",
    description:
      "Datos sensibles (salud, biométricos, financieros, menores de edad) tratados sin consentimiento expreso documentado.",
    severity: "critico",
    articles: ["Art. 16", "Art. 16 bis"],
    fineRangeUtn: { min: 5_000, max: 20_000 },
    estimatedWeeks: 4,
    dimension: 3,
  },
  "B-LEG-003": {
    id: "B-LEG-003",
    description:
      "Datos de clientes tratados para una finalidad distinta a la informada (ej. teléfono para boleta usado también para marketing).",
    severity: "alto",
    articles: ["Art. 3° letra b) (principio de finalidad)", "Art. 12"],
    fineRangeUtn: { min: 2_000, max: 10_000 },
    estimatedWeeks: 2,
    dimension: 3,
  },
  // --- Seguridad ---
  "B-SEG-001": {
    id: "B-SEG-001",
    description:
      "Datos personales almacenados en planillas sin cifrado, sin control de acceso, sin respaldo, en equipos locales o cuentas personales en la nube.",
    severity: "critico",
    articles: ["Art. 14 quinquies", "Art. 14 quáter"],
    fineRangeUtn: { min: 5_000, max: 20_000 },
    estimatedWeeks: 3,
    dimension: 6,
  },
  "B-SEG-002": {
    id: "B-SEG-002",
    description:
      "Datos sensibles (diagnósticos, biométricos, financieros) almacenados en Drive/Dropbox con cuentas personales (Gmail/Hotmail) sin BAA ni acuerdo de tratamiento con el proveedor de nube.",
    severity: "critico",
    articles: ["Art. 14 quinquies", "Art. 16", "Art. 16 bis"],
    fineRangeUtn: { min: 10_000, max: 20_000 },
    estimatedWeeks: 4,
    dimension: 6,
  },
  "B-SEG-003": {
    id: "B-SEG-003",
    description:
      "No existe protocolo de respuesta ante vulneraciones de seguridad (filtración, hackeo, pérdida de datos).",
    severity: "alto",
    articles: ["Art. 14 sexies"],
    fineRangeUtn: { min: 2_000, max: 10_000 },
    estimatedWeeks: 2,
    dimension: 6,
  },
  // --- Terceros / proveedores ---
  "B-TER-001": {
    id: "B-TER-001",
    description:
      "Proveedores externos (contador, software, hosting) tratan datos personales sin contrato de encargo que especifique objeto, finalidad, medidas de seguridad y destino de los datos.",
    severity: "critico",
    articles: ["Art. 15 bis"],
    fineRangeUtn: { min: 5_000, max: 20_000 },
    estimatedWeeks: 3,
    dimension: 7,
  },
  "B-TER-002": {
    id: "B-TER-002",
    description:
      "Datos personales almacenados o procesados en servidores en el extranjero sin verificar el nivel adecuado de protección ni implementar garantías (cláusulas contractuales, consentimiento informado).",
    severity: "alto",
    articles: ["Art. 14 ter letra h)", "Art. 15"],
    fineRangeUtn: { min: 2_000, max: 10_000 },
    estimatedWeeks: 3,
    dimension: 7,
  },
  // --- Derechos ARCO ---
  "B-DER-001": {
    id: "B-DER-001",
    description:
      "No existe un procedimiento ni canal definido para que los titulares ejerzan sus derechos de acceso, rectificación, supresión, oposición, bloqueo o portabilidad.",
    severity: "alto",
    articles: ["Arts. 4° a 11 (Título I)"],
    fineRangeUtn: { min: 2_000, max: 10_000 },
    estimatedWeeks: 3,
    dimension: 5,
  },
  // --- Sectorial: Salud ---
  "B-SAL-001": {
    id: "B-SAL-001",
    description:
      "Diagnósticos, fichas clínicas o datos de salud tratados sin las medidas de confidencialidad y acceso restringido exigidas por la Ley 20.584 y el Dto. 41/2013 MINSAL.",
    severity: "critico",
    articles: ["Ley 20.584 Arts. 12-15", "Dto. 41/2013 MINSAL", "Art. 16 bis"],
    fineRangeUtn: { min: 10_000, max: 20_000 },
    estimatedWeeks: 6,
    dimension: 9,
  },
  // --- Sectorial: Videovigilancia ---
  "B-CCT-001": {
    id: "B-CCT-001",
    description:
      "Cámaras de seguridad sin aviso visible, sin informar la finalidad de la captura, o conservando imágenes por más de 30 días sin justificación.",
    severity: "medio",
    articles: ["DFL 3/2025 (Nueva Ley de Seguridad Privada)", "Art. 161-A Código Penal"],
    fineRangeUtn: { min: 500, max: 5_000 },
    estimatedWeeks: 1,
    dimension: 9,
  },
  // --- Capacitación ---
  "B-CAP-001": {
    id: "B-CAP-001",
    description:
      "El personal que trata datos personales no ha recibido capacitación sobre protección de datos, confidencialidad o procedimientos de seguridad.",
    severity: "medio",
    articles: ["Art. 3° letra e) (principio de responsabilidad)", "Art. 14 bis"],
    fineRangeUtn: { min: 500, max: 5_000 },
    estimatedWeeks: 2,
    dimension: 10,
  },
  // --- Conservación ---
  "B-CON-001": {
    id: "B-CON-001",
    description:
      "Datos personales conservados indefinidamente sin plazos de retención definidos ni procedimiento de eliminación al cumplir su finalidad.",
    severity: "medio",
    articles: ["Art. 3° letra c) (principio de proporcionalidad)", "Art. 14 letra d)"],
    fineRangeUtn: { min: 500, max: 5_000 },
    estimatedWeeks: 2,
    dimension: 2,
  },
  // --- Consentimiento datos sensibles menores ---
  "B-MEN-001": {
    id: "B-MEN-001",
    description:
      "Datos de menores de 14 años tratados sin consentimiento de padres o representantes legales, o datos sensibles de adolescentes menores de 16 años sin dicho consentimiento.",
    severity: "critico",
    articles: ["Art. 16 quáter"],
    fineRangeUtn: { min: 5_000, max: 20_000 },
    estimatedWeeks: 3,
    dimension: 3,
  },
  // --- Biométricos ---
  "B-BIO-001": {
    id: "B-BIO-001",
    description:
      "Datos biométricos (huella, rostro, voz) tratados sin informar al titular sobre el sistema usado, la finalidad, el período de conservación y sus derechos, o sin ofrecer alternativa no biométrica.",
    severity: "alto",
    articles: ["Art. 16 ter"],
    fineRangeUtn: { min: 2_000, max: 10_000 },
    estimatedWeeks: 3,
    dimension: 9,
  },
  // --- Sitio web / formularios ---
  "B-WEB-001": {
    id: "B-WEB-001",
    description:
      "Sitio web o formularios online que recolectan datos personales sin aviso de privacidad visible, sin informar la finalidad del tratamiento al momento de la recolección, o sin política de privacidad accesible.",
    severity: "alto",
    articles: ["Art. 14 ter", "Art. 14"],
    fineRangeUtn: { min: 2_000, max: 10_000 },
    estimatedWeeks: 3,
    dimension: 4,
  },
  // --- Estudio contable sin encargo ---
  "B-CON-002": {
    id: "B-CON-002",
    description:
      "Estudio contable o proveedor externo trata datos de trabajadores (sueldos, contratos, datos personales) sin contrato de encargo ni cláusula de confidencialidad.",
    severity: "critico",
    articles: ["Art. 15 bis", "Art. 154 bis Código del Trabajo"],
    fineRangeUtn: { min: 5_000, max: 20_000 },
    estimatedWeeks: 2,
    dimension: 7,
  },
};

// ---------------------------------------------------------------------------
// Screening nodes
// ---------------------------------------------------------------------------

export const SCREENING_NODES: ScreeningNode[] = [
  // =========================================================================
  // S-001 — Tamaño de la empresa
  // =========================================================================
  {
    id: "S-001",
    question: "¿Cuántas personas trabajan en la empresa?",
    dimension: 1,
    answers: [
      { value: "micro", label: "1 a 2 personas" },
      { value: "pequena", label: "3 a 10 personas" },
      { value: "mediana", label: "11 a 49 personas" },
      { value: "grande", label: "50 o más personas" },
    ],
  },

  // =========================================================================
  // S-002 — Rubro
  // =========================================================================
  {
    id: "S-002",
    question: "¿A qué rubro pertenece la empresa?",
    dimension: 9,
    multiple: true,
    allowCustom: true,
    answers: [
      {
        value: "retail",
        label: "Comercio / Retail",
        activatesBranches: ["DD-RETAIL"],
      },
      {
        value: "salud",
        label: "Salud (clínica, terapia, laboratorio, farmacia)",
        activatesBranches: ["DD-SALUD"],
      },
      {
        value: "financiero",
        label: "Financiero / Seguros / Bancario",
        activatesBranches: ["DD-FINANCIERO"],
      },
      {
        value: "educacion",
        label: "Educación / Formación",
        activatesBranches: ["DD-EDUCACION"],
      },
      {
        value: "rrhh",
        label: "RRHH / Servicios transitorios / Capacitación laboral",
      },
      {
        value: "tecnologia",
        label: "Tecnología / Software / SaaS",
      },
      {
        value: "otro",
        label: "Otro rubro",
      },
    ],
  },

  // =========================================================================
  // S-003 — Datos de clientes/pacientes/usuarios
  // =========================================================================
  {
    id: "S-003",
    question: "¿Maneja datos de clientes, pacientes, usuarios o beneficiarios?",
    dimension: 2,
    riskFactor: "has_titulares",
    answers: [
      {
        value: "si",
        label: "Sí, manejamos datos de clientes/pacientes/usuarios",
      },
      {
        value: "no",
        label: "No, solo manejamos datos internos (empleados, proveedores)",
        nextNodeId: "S-005",
      },
    ],
  },

  // =========================================================================
  // S-004 — Datos sensibles
  // =========================================================================
  {
    id: "S-004",
    question:
      "De los datos que maneja, ¿alguno incluye información de salud, biométrica (huella, rostro), financiera, o de menores de edad?",
    dimension: 3,
    riskFactor: "sensitive_data",
    appliesIfFactor: "has_titulares",
    answers: [
      {
        value: "si",
        label: "Sí, manejamos datos sensibles (salud, biométricos, financieros, menores)",
        activatesBranches: ["DD-SENSIBLE"],
        triggersBreaches: [SCREENING_BREACHES["B-LEG-002"]],
      },
      {
        value: "no",
        label: "No, solo datos básicos (nombre, teléfono, correo, RUT)",
      },
      {
        value: "no_seguro",
        label: "No estoy seguro de qué se considera dato sensible",
        activatesBranches: ["DD-SENSIBLE"],
      },
    ],
  },

  // =========================================================================
  // S-005 — Proveedores externos
  // =========================================================================
  {
    id: "S-005",
    question:
      "¿Usa proveedores o servicios externos que accedan a información de la empresa? (contador, software de facturación, hosting, CRM, email marketing, Dropbox/Drive, etc.)",
    dimension: 7,
    riskFactor: "critical_providers",
    answers: [
      {
        value: "si",
        label: "Sí, usamos servicios externos",
        activatesBranches: ["DD-PROVEEDORES"],
      },
      {
        value: "no",
        label: "No, todo lo manejamos internamente",
      },
      {
        value: "no_seguro",
        label: "No estoy seguro",
        activatesBranches: ["DD-PROVEEDORES"],
      },
    ],
  },

  // =========================================================================
  // S-006 — Almacenamiento de información
  // =========================================================================
  {
    id: "S-006",
    question:
      "¿Dónde guarda la información de clientes, pacientes o trabajadores?",
    dimension: 6,
    multiple: true,
    answers: [
      {
        value: "excel_pc",
        label: "En planillas Excel / documentos en el computador local",
        triggersBreaches: [SCREENING_BREACHES["B-SEG-001"]],
      },
      {
        value: "nube_compartido",
        label: "En Google Drive, Dropbox, OneDrive o similar, compartido entre el equipo",
        triggersBreaches: [SCREENING_BREACHES["B-SEG-001"]],
      },
      {
        value: "software",
        label: "En un software especializado de gestión (ERP, CRM, sistema clínico, etc.)",
        activatesBranches: ["DD-SEGURIDAD-SOFTWARE"],
      },
      {
        value: "papel",
        label: "En papel / carpetas físicas",
        triggersBreaches: [SCREENING_BREACHES["B-SEG-001"]],
      },
    ],
  },

  // =========================================================================
  // S-007 — Tipo de cuenta cloud
  // =========================================================================
  {
    id: "S-007",
    question:
      "¿La cuenta de Drive, Dropbox o nube que usan es personal (Gmail, Hotmail) o empresarial (Google Workspace, Microsoft 365 Business)?",
    dimension: 6,
    answers: [
      {
        value: "personal",
        label: "Cuenta personal (Gmail, Hotmail, etc.)",
        triggersBreaches: [SCREENING_BREACHES["B-SEG-002"]],
      },
      {
        value: "empresarial",
        label: "Cuenta empresarial (Workspace, Microsoft 365 Business)",
      },
      {
        value: "no_usa_nube",
        label: "No usamos nube",
      },
    ],
  },

  // =========================================================================
  // S-008 — Presencia web
  // =========================================================================
  {
    id: "S-008",
    question:
      "¿Tiene página web, tienda online, app o formulario en internet donde pida datos de personas?",
    dimension: 4,
    riskFactor: "web_presence",
    answers: [
      {
        value: "si",
        label: "Sí, tenemos presencia web que recolecta datos",
        activatesBranches: ["DD-WEB"],
        triggersBreaches: [SCREENING_BREACHES["B-WEB-001"]],
      },
      {
        value: "no",
        label: "No tenemos página web ni formularios online",
      },
    ],
  },

  // =========================================================================
  // S-009 — Comunicaciones / Marketing
  // =========================================================================
  {
    id: "S-009",
    question:
      "¿Envía comunicaciones a clientes por WhatsApp, correo o SMS? (boletas, marketing, ofertas, recordatorios)",
    dimension: 3,
    riskFactor: "marketing_data",
    answers: [
      {
        value: "si_transaccional",
        label: "Sí, solo comunicaciones operativas (boletas, confirmaciones, recordatorios de cita)",
      },
      {
        value: "si_marketing",
        label: "Sí, también enviamos ofertas, promociones o marketing",
        activatesBranches: ["DD-MARKETING"],
        triggersBreaches: [SCREENING_BREACHES["B-LEG-001"]],
      },
      {
        value: "no",
        label: "No enviamos comunicaciones a clientes",
      },
    ],
  },

  // =========================================================================
  // S-010 — Videovigilancia
  // =========================================================================
  {
    id: "S-010",
    question: "¿Tiene cámaras de seguridad en sus instalaciones?",
    dimension: 9,
    riskFactor: "cctv",
    answers: [
      {
        value: "si",
        label: "Sí, tenemos cámaras de seguridad",
        activatesBranches: ["DD-CCTV"],
        triggersBreaches: [SCREENING_BREACHES["B-CCT-001"]],
      },
      {
        value: "no",
        label: "No tenemos cámaras",
      },
    ],
  },

  // =========================================================================
  // S-011 — Datos biométricos
  // =========================================================================
  {
    id: "S-011",
    question:
      "¿Usa huella digital, reconocimiento facial u otro sistema biométrico con trabajadores o clientes? (control de asistencia, acceso, verificación de identidad)",
    dimension: 9,
    riskFactor: "biometric_data",
    answers: [
      {
        value: "si",
        label: "Sí, usamos datos biométricos",
        activatesBranches: ["DD-BIOMETRIA"],
        triggersBreaches: [SCREENING_BREACHES["B-BIO-001"]],
      },
      {
        value: "no",
        label: "No usamos datos biométricos",
      },
    ],
  },

  // =========================================================================
  // S-012 — Transferencia internacional
  // =========================================================================
  {
    id: "S-012",
    question:
      "¿Los sistemas que usa guardan información en servidores fuera de Chile? (la nube de un proveedor, casa matriz en el extranjero, software con datos en EE.UU., Europa, etc.)",
    dimension: 7,
    riskFactor: "international_transfers",
    answers: [
      {
        value: "si",
        label: "Sí, sé que hay datos en el extranjero",
        activatesBranches: ["DD-TRANSFER"],
        triggersBreaches: [SCREENING_BREACHES["B-TER-002"]],
      },
      {
        value: "no_se",
        label: "No sé dónde están los servidores",
        // No se profundiza (país, acuerdos, aviso): el usuario ya declaró que
        // desconoce. La incertidumbre se maneja por inferencia (ver
        // inference-rules S-012 "no_se" → posible transferencia no documentada).
      },
      {
        value: "no",
        label: "No, todo está en Chile",
      },
    ],
  },

  // =========================================================================
  // S-013 — Antigüedad / conservación
  // =========================================================================
  {
    id: "S-013",
    question: "¿Hace cuánto tiempo opera la empresa?",
    dimension: 2,
    answers: [
      {
        value: "menos_6_meses",
        label: "Menos de 6 meses",
      },
      {
        value: "6_meses_2_años",
        label: "Entre 6 meses y 2 años",
      },
      {
        value: "mas_2_años",
        label: "Más de 2 años",
        triggersBreaches: [SCREENING_BREACHES["B-CON-001"]],
      },
    ],
  },

  // =========================================================================
  // S-014 — Capacidad de eliminar datos
  // =========================================================================
  {
    id: "S-014",
    question:
      "Si un cliente, paciente o trabajador le pidiera que borre todos sus datos, ¿sabe exactamente dónde buscar y cómo eliminarlos completamente?",
    dimension: 5,
    answers: [
      {
        value: "si",
        label: "Sí, tenemos claro dónde están y cómo eliminarlos",
      },
      {
        value: "mas_o_menos",
        label: "Más o menos, algunos datos sabríamos borrar, otros no",
        triggersBreaches: [SCREENING_BREACHES["B-DER-001"]],
      },
      {
        value: "no",
        label: "No, no tengo claro cómo hacerlo",
        triggersBreaches: [SCREENING_BREACHES["B-DER-001"]],
      },
    ],
  },

  // =========================================================================
  // S-015 — Política de privacidad
  // =========================================================================
  {
    id: "S-015",
    question:
      "¿Tiene algún documento, política o aviso que explique a las personas cómo trata sus datos personales?",
    dimension: 4,
    answers: [
      {
        value: "si_publicado",
        label: "Sí, está publicado/accesible (web, local, documento)",
      },
      {
        value: "si_interno",
        label: "Tenemos algo interno pero no está publicado formalmente",
        triggersBreaches: [SCREENING_BREACHES["B-GOB-001"]],
      },
      {
        value: "no",
        label: "No, no tenemos nada por escrito",
        triggersBreaches: [SCREENING_BREACHES["B-GOB-001"]],
      },
    ],
  },
];
