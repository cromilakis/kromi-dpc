/**
 * Ramas de deep-dive — preguntas condicionales de seguimiento que se
 * activan según las respuestas del screening. Cada rama profundiza en
 * un área específica para detectar brechas que el screening no pudo
 * capturar con preguntas generales.
 *
 * Las ramas se activan automáticamente según la columna `activatesBranches`
 * de las respuestas de screening.
 */

import type { DeepDiveBranch } from "./decision-tree";
import { SCREENING_BREACHES as B } from "./screening-nodes";

export const DEEP_DIVE_BRANCHES: DeepDiveBranch[] = [
  // =========================================================================
  // DD-SENSIBLE — Datos sensibles (activado por S-004 "si" o "no_seguro")
  // =========================================================================
  {
    id: "DD-SENSIBLE",
    name: "Datos sensibles",
    dimension: 3,
    triggerCondition: { questionId: "S-004", answer: "si" },
    questions: [
      {
        id: "DD-SEN-001",
        question: "¿Qué tipo de datos sensibles manejan?",
        multiple: true,
        allowCustom: true,
        answers: [
          {
            value: "salud",
            label: "Datos de salud (diagnósticos, fichas clínicas, tratamientos)",
            breach: B["B-SAL-001"],
          },
          { value: "biometricos", label: "Datos biométricos (huella, rostro, voz)" },
          { value: "financieros", label: "Datos financieros o crediticios" },
          { value: "menores", label: "Datos de niños, niñas o adolescentes (menores de 18)", breach: B["B-MEN-001"] },
          {
            value: "sindicales",
            label: "Afiliación sindical, política o gremial",
          },
          {
            value: "otro_sensible",
            label: "Otro tipo de dato sensible",
          },
        ],
      },
      {
        id: "DD-SEN-002",
        question:
          "¿Los pacientes, clientes o titulares firman algún documento donde autoricen el tratamiento de estos datos sensibles?",
        answers: [
          {
            value: "si_consentimiento",
            label: "Sí, tenemos consentimiento firmado por cada titular",
          },
          {
            value: "consentimiento_verbal",
            label: "Es verbal, no queda registro escrito",
            breach: B["B-LEG-002"],
          },
          {
            value: "no_consentimiento",
            label: "No, no pedimos autorización",
            breach: B["B-LEG-002"],
          },
        ],
      },
      {
        id: "DD-SEN-003",
        question:
          "¿Quiénes dentro de la empresa pueden ver estos datos sensibles?",
        allowCustom: true,
        answers: [
          {
            value: "solo_autorizado",
            label: "Solo la persona que atiende directamente al titular",
          },
          {
            value: "todo_equipo",
            label: "Todo el equipo tiene acceso",
            breach: {
              ...B["B-SEG-001"],
              severity: "critico",
              description: "Datos sensibles accesibles por personal no autorizado sin control de acceso por rol.",
              fineRangeUtn: { min: 5_000, max: 20_000 },
            },
          },
          {
            value: "no_seguro",
            label: "No estoy seguro de quién puede verlos",
          },
        ],
      },
    ],
  },

  // =========================================================================
  // DD-SALUD — Sector salud (activado por S-002 "salud")
  // =========================================================================
  {
    id: "DD-SALUD",
    name: "Obligaciones de salud",
    dimension: 9,
    triggerCondition: { questionId: "S-002", answer: "salud" },
    questions: [
      {
        id: "DD-SAL-001",
        question:
          "¿Cómo guardan las fichas clínicas o registros de atención de los pacientes?",
        multiple: true,
        answers: [
          {
            value: "software_clinico",
            label: "Software de ficha clínica electrónica especializado",
          },
          {
            value: "excel_drive",
            label: "Planilla Excel / Google Drive / Dropbox",
            breach: B["B-SAL-001"],
          },
          {
            value: "papel",
            label: "Carpetas físicas / papel",
            breach: B["B-SAL-001"],
          },
        ],
      },
      {
        id: "DD-SAL-002",
        question:
          "¿Por cuánto tiempo conservan las fichas clínicas después de la última atención del paciente?",
        answers: [
          {
            value: "min_15_años",
            label: "15 años o más, o de forma permanente",
          },
          {
            value: "menos_15",
            label: "No tenemos un plazo definido, podría ser menos de 15 años",
            breach: {
              ...B["B-CON-001"],
              description:
                "Fichas clínicas conservadas por menos del plazo legal de 15 años, o sin criterio de conservación definido (Dto. 41/2013 MINSAL; Ley 20.584).",
            },
          },
        ],
      },
      {
        id: "DD-SAL-003",
        question:
          "Cuando un paciente solicita una copia de su ficha clínica, ¿en cuánto tiempo la entregan habitualmente?",
        answers: [
          {
            value: "menos_5_dias",
            label: "En 5 días hábiles o menos",
          },
          {
            value: "mas_tiempo",
            label: "No tenemos un procedimiento definido, podría ser más de 5 días hábiles",
            breach: {
              ...B["B-DER-001"],
              description:
                "Sin procedimiento para entregar copia de ficha clínica en el plazo legal de 5 días hábiles (Ley 20.584, Art. 15).",
            },
          },
        ],
      },
    ],
  },

  // =========================================================================
  // DD-FINANCIERO — Sector financiero (activado por S-002 "financiero")
  // =========================================================================
  {
    id: "DD-FINANCIERO",
    name: "Obligaciones financieras",
    dimension: 9,
    triggerCondition: { questionId: "S-002", answer: "financiero" },
    questions: [
      {
        id: "DD-FIN-001",
        question:
          "¿Tiene procedimientos documentados para proteger el secreto bancario o la confidencialidad de datos financieros de clientes?",
        answers: [
          {
            value: "si_procedimiento",
            label: "Sí, tenemos procedimientos formales y el personal los conoce",
          },
          {
            value: "informal",
            label: "Es informal, el equipo lo sabe pero no está documentado",
          },
          {
            value: "no",
            label: "No tenemos procedimientos específicos",
            breach: {
              ...B["B-CAP-001"],
              severity: "alto",
              description:
                "Sin procedimientos documentados de secreto bancario o confidencialidad de datos financieros (Art. 154 DFL 3, NCG 461 CMF).",
              articles: ["Art. 154 DFL 3/1997", "NCG 461 CMF"],
              fineRangeUtn: { min: 2_000, max: 10_000 },
            },
          },
        ],
      },
      {
        id: "DD-FIN-002",
        question:
          "Los datos de deudores o información comercial que manejan, ¿se eliminan cuando la deuda prescribe o se extingue?",
        answers: [
          {
            value: "si_automatico",
            label: "Sí, tenemos un sistema automático o procedimiento manual de caducidad",
          },
          {
            value: "no_sistema",
            label: "No tenemos un sistema para eso, se quedan indefinidamente",
            breach: B["B-CON-001"],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // DD-PROVEEDORES — Proveedores externos (activado por S-005 "si"/"no_seguro")
  // =========================================================================
  {
    id: "DD-PROVEEDORES",
    name: "Proveedores y encargados",
    dimension: 7,
    triggerCondition: { questionId: "S-005", answer: "si" },
    questions: [
      {
        id: "DD-PRO-001",
        question:
          "¿Tiene contratos firmados con estos proveedores donde se especifique cómo deben tratar los datos de la empresa?",
        answers: [
          {
            value: "si_todos",
            label: "Sí, con todos los proveedores que acceden a datos",
          },
          {
            value: "algunos",
            label: "Con algunos, pero no con todos",
            breach: B["B-TER-001"],
          },
          {
            value: "ninguno",
            label: "No, no tenemos contratos de este tipo",
            breach: B["B-TER-001"],
          },
        ],
      },
      {
        id: "DD-PRO-002",
        question:
          "¿Sus contratos con proveedores regulan si pueden subcontratar el tratamiento de datos a terceros?",
        answers: [
          {
            value: "regulado",
            label: "Sí, lo prohíben o exigen nuestra autorización previa",
          },
          {
            value: "no_regulado",
            label: "No lo regulan, o no está definido en el contrato",
            breach: {
              ...B["B-TER-001"],
              description:
                "Contratos con proveedores sin cláusula que regule la subcontratación — cadena de tratamiento sin control (Art. 15 bis, Ley 21.719).",
            },
          },
        ],
      },
      {
        id: "DD-PRO-003",
        question:
          "¿Qué pasa con los datos cuando termina la relación con un proveedor? ¿Los devuelven, los eliminan?",
        answers: [
          {
            value: "si_regulado",
            label: "Está especificado en el contrato (devolución o eliminación)",
          },
          {
            value: "no_regulado",
            label: "No está definido / Lo desconozco",
            breach: {
              ...B["B-TER-001"],
              description:
                "Sin cláusula contractual sobre destino de datos al término del servicio (Art. 15 bis).",
            },
          },
        ],
      },
    ],
  },

  // =========================================================================
  // DD-SEGURIDAD-SOFTWARE — Software especializado (S-006 "software")
  // =========================================================================
  {
    id: "DD-SEGURIDAD-SOFTWARE",
    name: "Seguridad del software",
    dimension: 6,
    triggerCondition: { questionId: "S-006", answer: "software" },
    questions: [
      {
        id: "DD-SSW-001",
        question:
          "¿El software que usan tiene control de acceso con usuarios y contraseñas individuales?",
        answers: [
          {
            value: "si_individual",
            label: "Sí, cada persona tiene su propio usuario",
          },
          {
            value: "compartido",
            label: "Comparten un mismo usuario y contraseña",
            breach: B["B-SEG-001"],
          },
        ],
      },
      {
        id: "DD-SSW-002",
        question:
          "¿El software permite saber quién accedió, modificó o eliminó cada dato?",
        answers: [
          {
            value: "si_auditoria",
            label: "Sí, tiene registro de auditoría",
          },
          {
            value: "no_auditoria",
            label: "No, o no lo sé",
            breach: {
              ...B["B-SEG-001"],
              description:
                "Software sin registro de auditoría de accesos a datos personales (Art. 14 quinquies).",
            },
          },
        ],
      },
      {
        id: "DD-SSW-003",
        question:
          "¿Cada cuánto hacen copias de seguridad de los datos del software?",
        answers: [
          {
            value: "diario",
            label: "Diario o en tiempo real",
          },
          {
            value: "semanal_manual",
            label: "Semanal o cuando alguien se acuerda",
          },
          {
            value: "nunca",
            label: "No hacemos respaldos",
            breach: B["B-SEG-001"],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // DD-WEB — Presencia web (activado por S-008 "si")
  // =========================================================================
  {
    id: "DD-WEB",
    name: "Presencia web y formularios",
    dimension: 4,
    triggerCondition: { questionId: "S-008", answer: "si" },
    questions: [
      {
        id: "DD-WEB-001",
        question:
          "Cuando una persona llena un formulario en su sitio web, ¿se le informa en ese momento para qué se usarán sus datos?",
        answers: [
          {
            value: "si_aviso",
            label: "Sí, hay un aviso de privacidad visible junto al formulario",
          },
          {
            value: "solo_politica",
            label: "Solo tenemos la política de privacidad en otra página",
          },
          {
            value: "no_aviso",
            label: "No, no informamos nada al recolectar los datos",
            breach: {
              ...B["B-WEB-001"],
              severity: "alto",
              description:
                "Formularios web recolectan datos personales sin informar al titular en el momento de la recolección (Art. 14).",
            },
          },
        ],
      },
      {
        id: "DD-WEB-002",
        question:
          "¿Su sitio web usa cookies de terceros? (Google Analytics, Meta Pixel, anuncios)",
        answers: [
          {
            value: "si_cookies",
            label: "Sí, usamos analítica o publicidad con cookies",
          },
          {
            value: "no_se",
            label: "No estoy seguro, el desarrollador lo configuró",
          },
          {
            value: "no_cookies",
            label: "No, solo cookies técnicas necesarias",
          },
        ],
      },
      {
        id: "DD-WEB-003",
        question:
          "¿Tiene un banner o aviso de cookies que permita al usuario aceptar o rechazar antes de instalarlas?",
        answers: [
          {
            value: "si_banner",
            label: "Sí, con opción de aceptar/rechazar",
          },
          {
            value: "solo_aviso",
            label: "Tenemos aviso pero no se pueden rechazar",
          },
          {
            value: "no_banner",
            label: "No tenemos nada sobre cookies",
            breach: {
              ...B["B-WEB-001"],
              description:
                "Cookies de terceros instaladas sin consentimiento previo ni mecanismo de rechazo.",
            },
          },
        ],
      },
    ],
  },

  // =========================================================================
  // DD-MARKETING — Marketing (activado por S-009 "si_marketing")
  // =========================================================================
  {
    id: "DD-MARKETING",
    name: "Marketing y comunicaciones",
    dimension: 3,
    triggerCondition: { questionId: "S-009", answer: "si_marketing" },
    questions: [
      {
        id: "DD-MKT-001",
        question:
          "¿Cómo obtuvieron los datos de contacto que usan para marketing?",
        multiple: true,
        allowCustom: true,
        answers: [
          {
            value: "consentimiento",
            label: "Los titulares dieron su consentimiento explícito para recibir marketing",
          },
          {
            value: "clientes_existentes",
            label: "Son clientes que ya nos compraron",
          },
          {
            value: "base_comprada",
            label: "Compramos o conseguimos una base de datos de terceros",
            breach: B["B-LEG-001"],
          },
        ],
      },
      {
        id: "DD-MKT-002",
        question:
          "¿Cada comunicación de marketing incluye una opción clara para que la persona deje de recibirlas?",
        answers: [
          {
            value: "si_optout",
            label: "Sí, cada correo/SMS tiene un link para desuscribirse",
          },
          {
            value: "dificil_optout",
            label: "Es difícil darse de baja o no siempre lo incluimos",
            breach: B["B-LEG-001"],
          },
        ],
      },
      {
        id: "DD-MKT-003",
        question:
          "¿Mezclan la base de datos de marketing con los datos recolectados para otros fines? (ej. los teléfonos de las boletas)",
        answers: [
          {
            value: "separado",
            label: "No, son bases separadas con finalidades distintas",
          },
          {
            value: "mezclado",
            label: "Sí, usamos la misma base para todo",
            breach: B["B-LEG-003"],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // DD-CCTV — Videovigilancia (activado por S-010 "si")
  // =========================================================================
  {
    id: "DD-CCTV",
    name: "Videovigilancia",
    dimension: 9,
    triggerCondition: { questionId: "S-010", answer: "si" },
    questions: [
      {
        id: "DD-CCT-001",
        question:
          "¿Hay carteles o avisos visibles que informen a las personas que están siendo grabadas?",
        answers: [
          {
            value: "si_avisos",
            label: "Sí, en todas las zonas con cámaras",
          },
          {
            value: "algunos",
            label: "Solo en algunas zonas",
            breach: B["B-CCT-001"],
          },
          {
            value: "no_avisos",
            label: "No, no hay avisos",
            breach: B["B-CCT-001"],
          },
        ],
      },
      {
        id: "DD-CCT-002",
        question:
          "¿Por cuánto tiempo conservan las grabaciones de las cámaras?",
        answers: [
          {
            value: "30_dias",
            label: "Máximo 30 días, luego se sobrescriben",
          },
          {
            value: "mas_tiempo",
            label: "Más de 30 días o indefinidamente",
            breach: {
              ...B["B-CCT-001"],
              description:
                "Conservación de imágenes de videovigilancia por más de 30 días sin justificación legal (DFL 3/2025).",
            },
          },
          {
            value: "no_se",
            label: "No está definido / Lo desconozco",
          },
        ],
      },
      {
        id: "DD-CCT-003",
        question:
          "¿Las cámaras apuntan a lugares privados? (baños, vestidores, comedores, oficinas individuales)",
        answers: [
          {
            value: "zonas_publicas",
            label: "No, solo zonas comunes, accesos y exteriores",
          },
          {
            value: "zonas_privadas",
            label: "Sí, algunas apuntan a oficinas o zonas de descanso",
            breach: {
              ...B["B-CCT-001"],
              severity: "critico",
              description:
                "Cámaras en zonas privadas (baños, vestidores, comedores) — infracción grave a la dignidad (Art. 161-A Código Penal, DFL 3/2025).",
              fineRangeUtn: { min: 5_000, max: 20_000 },
            },
          },
        ],
      },
    ],
  },

  // =========================================================================
  // DD-BIOMETRIA — Datos biométricos (activado por S-011 "si")
  // =========================================================================
  {
    id: "DD-BIOMETRIA",
    name: "Datos biométricos",
    dimension: 9,
    triggerCondition: { questionId: "S-011", answer: "si" },
    questions: [
      {
        id: "DD-BIO-001",
        question:
          "¿Para qué usan los datos biométricos?",
        multiple: true,
        allowCustom: true,
        answers: [
          {
            value: "control_asistencia",
            label: "Control de asistencia de trabajadores",
          },
          {
            value: "acceso",
            label: "Control de acceso a instalaciones",
          },
          {
            value: "clientes",
            label: "Verificación de identidad de clientes o usuarios",
          },
        ],
      },
      {
        id: "DD-BIO-002",
        question:
          "¿Se informó a las personas sobre qué sistema biométrico se usa, para qué, y por cuánto tiempo se conservan sus datos?",
        answers: [
          {
            value: "si_informado",
            label: "Sí, se informó por escrito o en un documento accesible",
          },
          {
            value: "verbal",
            label: "Se dijo verbalmente, pero no hay registro",
            breach: B["B-BIO-001"],
          },
          {
            value: "no_informado",
            label: "No, no se informó nada específico",
            breach: B["B-BIO-001"],
          },
        ],
      },
      {
        id: "DD-BIO-003",
        question:
          "Si alguien no quiere entregar su dato biométrico, ¿tiene una alternativa no biométrica? (tarjeta, PIN, clave)",
        answers: [
          {
            value: "si_alternativa",
            label: "Sí, ofrecemos alternativa sin biometría",
          },
          {
            value: "no_alternativa",
            label: "No, es obligatorio usar el sistema biométrico",
            breach: {
              ...B["B-BIO-001"],
              severity: "critico",
              description:
                "Sistema biométrico obligatorio sin alternativa — el consentimiento no es libre en contexto laboral (Art. 16 ter).",
              fineRangeUtn: { min: 5_000, max: 20_000 },
            },
          },
        ],
      },
    ],
  },

  // =========================================================================
  // DD-TRANSFER — Transferencia internacional (activado por S-012 "si"/"no_se")
  // =========================================================================
  {
    id: "DD-TRANSFER",
    name: "Transferencia internacional de datos",
    dimension: 7,
    triggerCondition: { questionId: "S-012", answer: "si" },
    questions: [
      {
        id: "DD-TRF-001",
        question:
          "¿A qué países se transfieren o almacenan los datos?",
        multiple: true,
        answers: [
          {
            value: "eeuu",
            label: "Estados Unidos",
          },
          {
            value: "europa",
            label: "Europa (UE/EEE)",
          },
          {
            value: "latam",
            label: "Otro país de Latinoamérica",
          },
          {
            value: "no_se_pais",
            label: "No sé exactamente a qué país",
            breach: B["B-TER-002"],
          },
        ],
      },
      {
        id: "DD-TRF-002",
        question:
          "¿Tiene firmado algún acuerdo, cláusula contractual o anexo con el proveedor extranjero que garantice la protección de los datos?",
        answers: [
          {
            value: "si_acuerdo",
            label: "Sí, tenemos cláusulas contractuales de protección de datos",
          },
          {
            value: "no_acuerdo",
            label: "No, no tenemos un acuerdo",
            breach: B["B-TER-002"],
          },
          {
            value: "no_se_acuerdo",
            label: "Lo desconozco",
          },
        ],
      },
      {
        id: "DD-TRF-003",
        question:
          "¿Informan a los titulares (clientes, pacientes, trabajadores) que sus datos pueden alojarse en servidores en el extranjero?",
        answers: [
          {
            value: "si_informado",
            label: "Sí, está informado en la política de privacidad",
          },
          {
            value: "no_informado",
            label: "No, no lo hemos comunicado",
            breach: B["B-TER-002"],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // DD-RETAIL — Retail / Consumo (activado por S-002 "retail")
  // =========================================================================
  {
    id: "DD-RETAIL",
    name: "Obligaciones de retail y consumo",
    dimension: 9,
    triggerCondition: { questionId: "S-002", answer: "retail" },
    questions: [
      {
        id: "DD-RET-001",
        question:
          "¿Conservan los datos de clientes después de que la compra o garantía ya terminó?",
        answers: [
          {
            value: "solo_garantia",
            label: "Solo durante el período de garantía o devolución",
          },
          {
            value: "indefinido",
            label: "Los conservamos indefinidamente",
            breach: B["B-CON-001"],
          },
        ],
      },
      {
        id: "DD-RET-002",
        question:
          "¿Comparten datos de clientes con otras empresas del grupo, franquicias o partners comerciales?",
        answers: [
          {
            value: "no_comparten",
            label: "No, cada empresa maneja sus propios datos",
          },
          {
            value: "si_comparten",
            label: "Sí, compartimos datos entre empresas relacionadas",
          },
        ],
      },
    ],
  },

  // =========================================================================
  // DD-EDUCACION — Educación (activado por S-002 "educacion")
  // =========================================================================
  {
    id: "DD-EDUCACION",
    name: "Obligaciones de educación",
    dimension: 9,
    triggerCondition: { questionId: "S-002", answer: "educacion" },
    questions: [
      {
        id: "DD-EDU-001",
        question:
          "¿Tratan datos de estudiantes menores de 18 años?",
        answers: [
          {
            value: "si_menores",
            label: "Sí, la mayoría son menores de edad",
          },
          {
            value: "algunos",
            label: "Algunos son menores, otros adultos",
          },
          {
            value: "solo_adultos",
            label: "No, solo trabajamos con adultos",
          },
        ],
      },
      {
        id: "DD-EDU-002",
        question:
          "¿Tienen el consentimiento de los padres o representantes legales para tratar los datos de los estudiantes menores de 14 años?",
        answers: [
          {
            value: "si_consentimiento",
            label: "Sí, tenemos autorización firmada",
          },
          {
            value: "matricula",
            label: "Se asume por la matrícula, pero no hay un consentimiento específico",
            breach: B["B-MEN-001"],
          },
          {
            value: "no_consentimiento",
            label: "No, no pedimos consentimiento específico",
            breach: B["B-MEN-001"],
          },
        ],
      },
    ],
  },
];
