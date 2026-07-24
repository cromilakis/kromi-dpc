import type { ResourceArticle } from "../types";

export const QUE_ES_EL_RAT: ResourceArticle = {
  slug: "que-es-el-rat",
  type: "satelite",
  title: "¿Qué es el RAT? Registro de Actividades de Tratamiento explicado",
  metaTitle:
    "Qué es el RAT (Registro de Actividades de Tratamiento) y cómo hacerlo",
  description:
    "Qué es el RAT o Registro de Actividades de Tratamiento, por qué la Ley 21.719 lo exige, qué debe contener y cómo levantarlo paso a paso en tu empresa.",
  keyword: "registro de actividades de tratamiento",
  summary:
    "El RAT (Registro de Actividades de Tratamiento) es el documento que detalla qué datos personales trata una empresa, con qué finalidad, bajo qué base de licitud y por cuánto tiempo. Es la base para cumplir casi cualquier otra obligación de la Ley 21.719, y su ausencia es una de las brechas de mayor riesgo detectadas en las autoevaluaciones.",
  sections: [
    {
      heading: "¿Qué es el RAT?",
      paragraphs: [
        "El Registro de Actividades de Tratamiento (RAT) es un inventario escrito y actualizado de todas las actividades en que una empresa trata datos personales: ventas y facturación, remuneraciones, campañas de marketing, postulaciones a empleo, atención a clientes, entre otras.",
        "Cada actividad de tratamiento se documenta como una fila del registro, con la información necesaria para poder dar cuenta de qué datos se manejan, dónde están y para qué se usan. Sin ese inventario, es prácticamente imposible cumplir el resto de las obligaciones de la ley: no se puede responder a un titular con precisión, ni borrar datos a tiempo, ni contener bien un incidente de seguridad.",
      ],
    },
    {
      heading: "¿Por qué la Ley 21.719 exige el RAT?",
      paragraphs: [
        "La ley exige poder dar cuenta del tratamiento: categorías de datos, finalidades, destinatarios, plazos de conservación y origen. Eso solo es posible con un registro de actividades de tratamiento (inventario) levantado y actualizado.",
        "No tener este registro —o tenerlo solo \"de memoria\", sin dejar constancia escrita— es una de las brechas de mayor severidad que detecta la autoevaluación de KPC, porque compromete la capacidad de la empresa para demostrar cumplimiento ante cualquier fiscalización o solicitud de un titular.",
        // REVISAR: confirmar si corresponde citar el Art. 14 ter como fundamento directo del RAT o si existe un artículo específico dedicado al registro; las fuentes internas lo asocian al deber de información del Art. 14 ter y al principio de responsabilidad del Art. 3° letra e).
      ],
    },
    {
      heading: "Qué información debe contener cada actividad del RAT",
      paragraphs: [
        "Para cada actividad de tratamiento identificada, el RAT debe dejar registrada, como mínimo, la siguiente información:",
      ],
      list: {
        ordered: false,
        items: [
          "Categorías de datos personales tratados (identificación, contacto, laborales, financieros, de salud u otros datos sensibles, etc.).",
          "Finalidad del tratamiento: para qué se usan esos datos en esa actividad concreta.",
          "Base de licitud que habilita el tratamiento (contrato, consentimiento, obligación legal, interés legítimo u otra causa aplicable).",
          "Destinatarios de los datos, incluidos terceros o proveedores a quienes se comunican.",
          "Plazo de conservación de los datos para esa actividad.",
          "Origen de los datos, cuando no provienen directamente del titular.",
        ],
      },
    },
    {
      heading: "Cómo levantar el RAT paso a paso",
      paragraphs: [
        "Levantar el RAT desde cero es un trabajo de relevamiento que conviene abordar en tres etapas.",
      ],
      list: {
        ordered: true,
        items: [
          "Recorrer cada área y levantar sus tratamientos: entrevistar a ventas, administración, RRHH y marketing para listar cada actividad que usa datos personales (venta y facturación, remuneraciones, campañas, postulaciones) y registrarla en el RAT. Evidencia: un RAT con al menos una fila por actividad de tratamiento identificada.",
          "Completar base de licitud, destinatarios y plazos: para cada actividad, dejar registrada la base de licitud (contrato, consentimiento, obligación legal, etc.), a quién se comunican los datos (incluidos proveedores) y el plazo de conservación. Evidencia: un RAT con las columnas de base de licitud, destinatarios y conservación completas.",
          "Asignar responsable y ciclo de revisión: designar quién mantiene el RAT y fijar una revisión al menos anual, o cada vez que se agregue un sistema o una nueva actividad de tratamiento. Evidencia: registro de la fecha de última revisión y del responsable en el propio RAT.",
        ],
      },
    },
    {
      heading: "Cómo mantener el RAT actualizado",
      paragraphs: [
        "El RAT no es un documento que se completa una vez y se archiva: pierde valor si no refleja la realidad actual de la empresa. Cada vez que se incorpora un nuevo sistema, se contrata un nuevo proveedor que trate datos por cuenta de la empresa, o se lanza una nueva actividad (por ejemplo, una campaña o un nuevo canal de venta), esa actividad debe agregarse al registro.",
        "Fijar un responsable formal del RAT y una revisión periódica —al menos anual— es la forma más simple de evitar que el registro quede desactualizado y deje de ser útil como evidencia de cumplimiento.",
      ],
    },
  ],
  faq: [
    {
      q: "¿El RAT es obligatorio para todas las empresas?",
      a: "La Ley 21.719 exige poder dar cuenta del tratamiento de datos personales, lo que en la práctica requiere un registro de actividades de tratamiento. Aplica a toda organización que trate datos personales, con un nivel de detalle proporcional al volumen y riesgo de esos tratamientos.",
    },
    {
      q: "¿Qué diferencia hay entre el RAT y la política de tratamiento de datos?",
      a: "El RAT es un inventario interno y detallado de cada actividad de tratamiento, usado principalmente como evidencia de cumplimiento. La política de tratamiento es el documento público, dirigido a los titulares, que informa de forma más general quién trata sus datos y con qué finalidad.",
    },
    {
      q: "¿Con qué frecuencia hay que actualizar el RAT?",
      a: "Como mínimo, una vez al año. Además, cada vez que se incorpora un nuevo sistema, proveedor o actividad que implique tratamiento de datos personales, esa actividad debe agregarse al registro de inmediato.",
    },
    {
      q: "¿Qué pasa si mi empresa no tiene RAT?",
      a: "No tener un RAT escrito y actualizado es una de las brechas de mayor severidad frente a la Ley 21.719, porque sin ese inventario la empresa no puede demostrar qué datos trata, para qué, ni cumplir a tiempo con solicitudes de titulares o autoridades.",
    },
    {
      q: "¿Quién debe encargarse de mantener el RAT?",
      a: "Debe existir una persona o rol formalmente designado como responsable de mantener el RAT actualizado, coordinando con las distintas áreas de la empresa que tratan datos personales.",
    },
  ],
  related: ["ley-21719", "multas-ley-21719", "proteccion-datos-salud"],
  author: {
    name: "Equipo legal de Kromi Privacy Center",
    credential: "Especialistas en protección de datos (Ley 21.719)",
  },
  datePublished: "2026-07-24",
  dateModified: "2026-07-24",
  reviewed: true,
};
