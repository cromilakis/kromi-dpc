import type { CriterionAnswer } from "@/lib/interview/auto-map";
import type { Script, ScriptNode } from "@/lib/interview/script/types";

/**
 * Guion guiado — BORRADOR v1 (spec `2026-07-06-guion-guiado-design.md`).
 * PENDIENTE de validación consultor/abogado: los textos y, sobre todo, el mapeo
 * pregunta→criterios son una primera propuesta.
 *
 * Estructura: una "pregunta madre" por control (cubre sus criterios). El helper
 * `verdictNode` arma el patrón común (Sí completo → todos los criterios en
 * "yes"; Parcial → "partial"; No → "no"; más "Otros"). Los controles con ramas
 * (p. ej. encargados) se definen a mano.
 */

const CRITERIA_PER_CONTROL = 4; // todos los baseline tienen 4 criterios

function sets(control: string, criteria: number, answer: CriterionAnswer) {
  return Array.from({ length: criteria }, (_, i) => ({
    control,
    criterion: i,
    answer,
  }));
}

/** Nodo "madre" simple: 3 veredictos que setean TODOS los criterios del control. */
function verdictNode(args: {
  id: string;
  question: string;
  example: string;
  control: string;
  criteria?: number;
  yes: string;
  partial: string;
  no: string;
  condition?: ScriptNode["condition"];
}): ScriptNode {
  const n = args.criteria ?? CRITERIA_PER_CONTROL;
  return {
    id: args.id,
    question: args.question,
    example: args.example,
    allowOther: true,
    covers: Array.from({ length: n }, (_, i) => ({ control: args.control, criterion: i })),
    condition: args.condition,
    options: [
      { id: "si", label: args.yes, effect: { sets: sets(args.control, n, "yes") } },
      { id: "parcial", label: args.partial, effect: { sets: sets(args.control, n, "partial") } },
      { id: "no", label: args.no, effect: { sets: sets(args.control, n, "no") } },
    ],
  };
}

export const RAT_SCRIPT: Script = {
  id: "diagnostico-baseline-v1",
  title: "Entrevista guiada",
  nodes: [
    // — Finalidad e inventario —
    verdictNode({
      id: "finalidad",
      example:
        "Ej.: en una tienda el correo se pide para enviar la boleta (finalidad: facturación) y el teléfono para coordinar el despacho (logística), y al pedirlos se explica ese uso. Usar después ese correo para promociones sería una finalidad nueva que hay que informar aparte.",
      control: "DPC-FIN-001",
      question:
        "¿Para qué usan los datos de las personas y se lo explican al titular al momento de pedirlos?",
      yes: "Cada uso tiene una finalidad clara y se informa al pedir el dato",
      partial: "Hay finalidades claras pero no siempre se informan",
      no: "No está definido para qué se usa cada dato",
    }),
    verdictNode({
      id: "retencion",
      example:
        "Ej.: las fichas de clientes se guardan 6 años por obligación tributaria y luego se eliminan (también de los respaldos); los CV no seleccionados se borran a los 6 meses. Lo clave es que haya un plazo definido por categoría y un borrado real, no 'guardar todo para siempre'.",
      control: "DPC-FIN-002",
      question:
        "¿Por cuánto tiempo guardan los datos y cómo los eliminan cuando ya no se necesitan?",
      yes: "Hay plazos definidos y borrado seguro (incluye respaldos)",
      partial: "Se eliminan a veces, sin plazos ni proceso formal",
      no: "No hay plazos ni proceso de eliminación",
    }),
    verdictNode({
      id: "rat",
      example:
        "Ej.: una planilla o sistema con una fila por proceso — 'Nómina', 'Clientes', 'Postulantes', 'Cámaras' — indicando qué datos usa cada uno, para qué y dónde se guardan. Es el inventario base de todo el cumplimiento.",
      control: "DPC-INV-001",
      question:
        "¿Tienen un registro de todos los procesos donde manejan datos personales (RAT)?",
      yes: "Sí, completo y actualizado",
      partial: "Existe pero parcial o desactualizado",
      no: "No existe un registro",
    }),
    verdictNode({
      id: "flujos",
      example:
        "Ej.: saber que el dato entra por la web → se guarda en el CRM (alojado en Brasil) → se comparte con la empresa de despacho → se elimina a los 2 años. Incluye especialmente si los datos salen al extranjero (nube, casa matriz).",
      control: "DPC-INV-002",
      question:
        "¿Saben el recorrido de los datos de punta a punta, incluyendo si salen al extranjero?",
      yes: "Sí, hay mapeo del ciclo de vida y de las transferencias",
      partial: "Se conoce en parte, sin documentar",
      no: "No está mapeado",
    }),

    // — Licitud, proporcionalidad, calidad —
    verdictNode({
      id: "licitud",
      example:
        "Ej.: los datos de trabajadores se tratan por el contrato laboral, los tributarios por obligación legal, y los de marketing con consentimiento que la persona puede retirar. No todo requiere consentimiento, pero cada uso debe tener su fundamento.",
      control: "DPC-LIC-001",
      question:
        "¿Con qué autorización tratan los datos (consentimiento, contrato, ley) y cómo lo obtienen?",
      yes: "Cada finalidad tiene base legal y el consentimiento es válido y revocable",
      partial: "Hay base legal pero el consentimiento/revocación es débil",
      no: "No hay base identificada ni consentimiento",
    }),
    verdictNode({
      id: "minimizacion",
      example:
        "Ej.: para suscribirse al newsletter piden solo el correo; para un sorteo, nombre y correo. Pedir RUT, dirección o fecha de nacimiento 'por si acaso' sería recolectar de más.",
      control: "DPC-PRO-001",
      question: "¿Piden solo los datos que realmente necesitan para cada finalidad?",
      yes: "Sí, cada dato se justifica y no piden de más",
      partial: "Piden algunos datos sin uso claro",
      no: "Piden datos por defecto sin justificar",
    }),
    verdictNode({
      id: "calidad",
      example:
        "Ej.: si un cliente cambia de teléfono hay una forma de actualizarlo; si pide corregir un dato, se hace en un plazo definido; y se detectan duplicados (el mismo RUT cargado dos veces).",
      control: "DPC-CAL-001",
      question:
        "¿Cómo mantienen los datos actualizados y atienden correcciones de los titulares?",
      yes: "Hay proceso de actualización y rectificación con plazos",
      partial: "Se corrige a pedido, sin proceso definido",
      no: "No hay proceso de actualización/corrección",
    }),

    // — Transparencia, derechos —
    verdictNode({
      id: "transparencia",
      example:
        "Ej.: en la web hay una 'Política de privacidad' accesible desde el pie, con fecha, versión, quién es el responsable y cómo contactarlo, escrita en lenguaje simple.",
      control: "DPC-TRA-001",
      question:
        "¿Tienen publicada una política de tratamiento de datos clara y con fecha/responsable?",
      yes: "Sí, publicada, vigente e identifica al responsable",
      partial: "Existe pero incompleta o desactualizada",
      no: "No está publicada",
    }),
    verdictNode({
      id: "derechos",
      example:
        "Ej.: un formulario 'Ejerce tus derechos' o un correo donde la persona puede pedir ver, corregir, borrar u oponerse al uso de sus datos, verificando su identidad y respondiendo dentro del plazo legal.",
      control: "DPC-DER-001",
      question:
        "¿Tienen un canal para que las personas ejerzan sus derechos (acceso, rectificación, etc.)?",
      yes: "Sí, canal formal con verificación de identidad y plazos",
      partial: "Se atiende informalmente, sin procedimiento",
      no: "No hay canal ni procedimiento",
    }),

    // — Seguridad —
    verdictNode({
      id: "accesos",
      example:
        "Ej.: cada empleado entra con su propio usuario y ve solo lo que su rol necesita (el cajero no accede a RRHH), y queda registro de quién consultó o modificó qué.",
      control: "DPC-SEG-001",
      question:
        "¿Cómo controlan quién accede a los datos y queda registro de lo que se consulta/modifica?",
      yes: "Accesos por rol (mínimo privilegio) y bitácoras inalterables",
      partial: "Hay control de accesos pero sin registro/logs completos",
      no: "Acceso abierto, sin control ni registro",
    }),
    verdictNode({
      id: "cifrado",
      example:
        "Ej.: la base y los notebooks van cifrados, entrar a los sistemas pide un segundo factor (código al celular), y hay respaldos que periódicamente se prueban restaurando uno.",
      control: "DPC-SEG-002",
      question: "¿Cifran los datos y usan doble factor y respaldos probados?",
      yes: "Cifrado en tránsito y reposo, MFA y respaldos probados",
      partial: "Algunas medidas, no todas",
      no: "Sin cifrado/MFA/respaldos",
    }),
    verdictNode({
      id: "confidencialidad",
      example:
        "Ej.: al ingresar, el personal firma una cláusula de confidencialidad que sigue vigente tras renunciar, se le capacita sobre el deber de secreto, y los proveedores también la firman.",
      control: "DPC-CON-001",
      question:
        "¿El personal firma compromisos de confidencialidad y se capacita sobre el deber de secreto?",
      yes: "Sí, con cláusulas que subsisten y se extienden a terceros",
      partial: "Algunos firman, sin capacitación",
      no: "No se firma ni capacita",
    }),

    // — Encargados (rama de ejemplo) —
    {
      id: "encargados",
      question:
        "¿Trabajan con proveedores externos que acceden o tratan datos personales (nube, contador, software de RRHH, etc.)?",
      example:
        "Ej.: proveedores que ven o procesan datos por ustedes: Google Workspace, un contador externo, un software de remuneraciones, una agencia de marketing o un hosting en la nube.",
      allowOther: true,
      covers: [{ control: "DPC-TER-001", criterion: 0 }],
      options: [
        {
          id: "no",
          label: "No, todo se maneja internamente",
          effect: {
            sets: [{ control: "DPC-TER-001", criterion: 0, answer: "yes" }],
          },
        },
        {
          id: "si",
          label: "Sí, trabajamos con proveedores externos",
          effect: {
            factors: ["critical_providers"],
            sets: [{ control: "DPC-TER-001", criterion: 0, answer: "yes" }],
          },
        },
      ],
    },
    {
      id: "encargados_contrato",
      question:
        "Con esos proveedores, ¿firmaron un contrato o anexo por escrito que regule el tratamiento de datos (confidencialidad, brechas, devolución/eliminación)?",
      example:
        "Ej.: con el proveedor de nube hay un contrato/anexo de tratamiento de datos que exige confidencialidad, aviso de brechas y devolver o borrar los datos al terminar — no solo un contrato comercial que no menciona datos.",
      condition: { anyOption: { node: "encargados", options: ["si"] } },
      allowOther: true,
      covers: [
        { control: "DPC-TER-001", criterion: 1 },
        { control: "DPC-TER-001", criterion: 2 },
        { control: "DPC-TER-001", criterion: 3 },
      ],
      options: [
        {
          id: "si",
          label: "Sí, con cláusulas de tratamiento y evaluación de seguridad",
          effect: {
            sets: [
              { control: "DPC-TER-001", criterion: 1, answer: "yes" },
              { control: "DPC-TER-001", criterion: 2, answer: "yes" },
              { control: "DPC-TER-001", criterion: 3, answer: "yes" },
            ],
          },
        },
        {
          id: "parcial",
          label: "Hay contrato pero sin cláusulas de datos",
          effect: {
            sets: [
              { control: "DPC-TER-001", criterion: 1, answer: "partial" },
              { control: "DPC-TER-001", criterion: 2, answer: "no" },
              { control: "DPC-TER-001", criterion: 3, answer: "no" },
            ],
          },
        },
        {
          id: "no",
          label: "No hay contrato de tratamiento",
          effect: {
            sets: [
              { control: "DPC-TER-001", criterion: 1, answer: "no" },
              { control: "DPC-TER-001", criterion: 2, answer: "no" },
              { control: "DPC-TER-001", criterion: 3, answer: "no" },
            ],
          },
        },
      ],
    },

    // — Responsabilidad / gobierno —
    verdictNode({
      id: "dpd",
      example:
        "Ej.: un acta o resolución que nombra a una persona (p. ej. 'Juan Pérez') como Delegado de Protección de Datos, con sus funciones y a quién reporta — no solo alguien que 've el tema' informalmente.",
      control: "DPC-RES-001",
      question:
        "¿Designaron formalmente a un responsable/Delegado de Protección de Datos (por escrito)?",
      yes: "Sí, designación formal con funciones y recursos",
      partial: "Hay un encargado de facto, sin formalizar",
      no: "No hay responsable designado",
    }),
    verdictNode({
      id: "gobierno",
      example:
        "Ej.: una 'Política de Protección de Datos' aprobada por gerencia, versionada y comunicada a todo el personal, que fija principios, roles y reglas — el documento marco del que dependen los demás.",
      control: "DPC-RES-002",
      question:
        "¿Tienen una política de gobierno de datos aprobada por la dirección y comunicada al personal?",
      yes: "Sí, aprobada, versionada y comunicada",
      partial: "Existe borrador o sin aprobar/comunicar",
      no: "No existe",
    }),
    verdictNode({
      id: "evidencias",
      example:
        "Ej.: una carpeta única (Drive/SharePoint) ordenada por control, con contratos, políticas y registros, lista para exportar ante una fiscalización — en vez de evidencia dispersa en correos y equipos.",
      control: "DPC-RES-003",
      question:
        "¿Guardan la evidencia de cumplimiento centralizada y disponible ante una fiscalización?",
      yes: "Sí, repositorio único indexado, versionado y con accesos controlados",
      partial: "Evidencia dispersa o incompleta",
      no: "No hay evidencia organizada",
    }),
    verdictNode({
      id: "mpi",
      example:
        "Ej.: un Modelo de Prevención de Infracciones con responsable, matriz de riesgos y plan de mitigación con seguimiento; su certificación puede operar como atenuante ante la Agencia.",
      control: "DPC-RES-004",
      question:
        "¿Tienen un Modelo de Prevención de Infracciones aprobado, con responsable y seguimiento?",
      yes: "Sí, operativo, aprobado y auditable",
      partial: "Existe parcialmente o solo declarativo",
      no: "No existe",
    }),

    // — Incidentes —
    verdictNode({
      id: "brechas",
      example:
        "Ej.: si se filtra o pierde la base de clientes, hay un plan que dice quién actúa, cómo se contiene, y con qué criterios y plazos se avisa a la Agencia y a los afectados.",
      control: "DPC-INC-001",
      question:
        "Si hoy se filtraran o perdieran datos, ¿tienen un plan de respuesta (roles, plazos, a quién avisar)?",
      yes: "Sí, plan con roles, contención y criterios de notificación",
      partial: "Sabrían reaccionar pero sin plan formal",
      no: "No hay plan",
    }),
    verdictNode({
      id: "incidentes",
      example:
        "Ej.: una bitácora central de incidentes y un instructivo que el personal conoce ('¿viste algo raro? avisa a seguridad@…'), idealmente con un simulacro anual.",
      control: "DPC-INC-002",
      question:
        "¿Llevan un registro de incidentes de seguridad y el personal sabe cómo reportarlos?",
      yes: "Sí, registro central, protocolo conocido y simulacros recientes",
      partial: "Se registran algunos, sin protocolo ni simulacros",
      no: "No se registran ni hay protocolo",
    }),
  ],
};
