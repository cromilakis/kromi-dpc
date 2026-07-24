import type { ResourceArticle } from "../types";

export const DERECHOS_ARCOP: ResourceArticle = {
  slug: "derechos-arcop",
  type: "satelite",
  title: "Derechos ARCOP: qué son y cómo debe responderlos tu empresa",
  metaTitle: "Derechos ARCOP: guía práctica para empresas (Ley 21.719)",
  description:
    "Qué son los derechos ARCOP (acceso, rectificación, cancelación, oposición, portabilidad), qué plazo tiene tu empresa para responder y cómo habilitar un canal para atenderlos.",
  keyword: "derechos ARCOP",
  summary:
    "Los derechos ARCOP —acceso, rectificación, cancelación, oposición y portabilidad— son las facultades que la Ley 21.719 otorga a toda persona sobre sus datos personales (Arts. 4° a 11). Toda organización que trate datos debe habilitar un canal para recibirlos, verificar la identidad de quien los ejerce y responder dentro de 30 días corridos y de forma gratuita.",
  sections: [
    {
      heading: "¿Qué son los derechos ARCOP?",
      paragraphs: [
        "ARCOP es la sigla que agrupa los derechos que la Ley 21.719 reconoce a todo titular de datos personales sobre la información que una empresa u organización trata sobre él (Arts. 4° a 11, Título I). A veces estos derechos se mencionan como 'ARCO', una nomenclatura anterior que no incluye la portabilidad; en Chile, con la Ley 21.719, el conjunto vigente y completo es ARCOP.",
        "Estos derechos existen para que la persona mantenga control sobre sus propios datos, incluso después de haberlos entregado: puede saber qué se sabe de ella, corregirlo, pedir que se elimine, oponerse a ciertos usos o llevarse la información a otro proveedor. Para la empresa, no son un gesto de cortesía sino una obligación legal exigible, con plazo y sin costo para quien la ejerce.",
      ],
    },
    {
      heading: "Los cinco derechos, uno por uno",
      paragraphs: [
        "Cada letra de ARCOP corresponde a una facultad distinta, y conviene distinguirlas porque la respuesta operativa de la empresa cambia según cuál se ejerza.",
      ],
      list: {
        ordered: false,
        items: [
          "Acceso: la persona puede pedir confirmación de si la empresa trata datos suyos y, si es así, obtener una copia de esos datos y de la información básica del tratamiento (finalidad, destinatarios, plazo de conservación).",
          "Rectificación: la persona puede pedir que se corrijan datos suyos que estén desactualizados, sean inexactos o estén incompletos.",
          "Cancelación (supresión): la persona puede pedir que se eliminen sus datos cuando ya no sean necesarios para la finalidad que justificó su tratamiento, cuando revoque su consentimiento o en los demás casos que fija la ley.",
          "Oposición: la persona puede oponerse a que sus datos se sigan tratando para un fin determinado, de forma expresa en el caso del marketing directo (Art. 8° letra b), donde la empresa debe cesar ese uso apenas recibe la solicitud.",
          "Portabilidad: la persona puede pedir que sus datos se le entreguen en un formato estructurado y de uso común, o que se transmitan directamente a otro responsable, cuando el tratamiento se basa en su consentimiento o en un contrato.",
        ],
      },
    },
    {
      heading: "El plazo de respuesta: 30 días corridos",
      paragraphs: [
        "La Ley 21.719 fija un plazo único para responder cualquiera de los derechos ARCOP: 30 días corridos desde que se recibe la solicitud (Arts. 4° a 11). La respuesta debe ser gratuita para el titular, cualquiera sea el resultado —se acoja, se rechace parcialmente o se rechace la solicitud—, y debe quedar registrada con su fecha para poder acreditar que se cumplió el plazo.",
        "Si la persona no queda conforme con la respuesta, o si la empresa no responde dentro de plazo, puede reclamar ante la Agencia de Protección de Datos Personales. Por eso el plazo no es solo una buena práctica de atención al cliente: es el punto que la Agencia revisa primero ante cualquier reclamo por derechos ARCOP.",
      ],
    },
    {
      heading: "Cómo habilitar un canal de atención de derechos ARCOP",
      paragraphs: [
        "Para poder cumplir el plazo legal, la empresa necesita un canal único y conocido por el que las personas puedan presentar sus solicitudes, y un procedimiento interno mínimo para tramitarlas. No se requiere infraestructura compleja: basta con un canal formalizado y un registro que permita controlar los plazos.",
      ],
      list: {
        ordered: true,
        items: [
          "Definir un canal único —un correo dedicado (por ejemplo, privacidad@tuempresa.cl) o un formulario (Google Forms, Microsoft Forms, Typeform)— para recibir solicitudes de derechos ARCOP.",
          "Publicar ese canal en la política de tratamiento de datos y en el sitio web, de forma visible.",
          "Adoptar un formulario ARCOP tipo que pida los datos mínimos para identificar al solicitante y el derecho que ejerce.",
          "Registrar cada solicitud con su fecha de ingreso, para poder controlar el plazo de 30 días corridos desde el primer momento.",
          "Resolver la solicitud dentro de plazo y dejar constancia de la respuesta entregada, incluyendo los casos en que se rechaza.",
        ],
      },
    },
    {
      heading: "Verificar la identidad y registrar cada solicitud",
      paragraphs: [
        "Antes de entregar información o eliminar datos, la empresa debe verificar razonablemente que quien solicita es efectivamente el titular de los datos (o su representante legal), para evitar entregar información de una persona a un tercero no autorizado. La verificación no debe transformarse en una barrera desproporcionada: basta con confirmar identidad con los medios que la empresa ya usa para relacionarse con esa persona (por ejemplo, contrastar el correo o RUT registrado).",
        "Cada solicitud recibida, junto con la verificación de identidad y la respuesta entregada, debe quedar registrada. Ese registro es la evidencia que permite demostrar ante la Agencia —conforme al principio de responsabilidad— que la empresa cuenta con un procedimiento real y no solo declarado en la política de tratamiento.",
      ],
    },
    {
      heading: "¿Qué pasa si la empresa no responde a tiempo?",
      paragraphs: [
        "Si la empresa deja pasar el plazo de 30 días corridos sin responder, o responde de forma insatisfactoria para el titular, este puede presentar un reclamo ante la Agencia de Protección de Datos Personales. La ausencia de un canal definido o de un procedimiento para tramitar estas solicitudes es, en sí misma, una de las infracciones más frecuentes que revisa la Agencia, porque suele ser fácil de detectar y de acreditar.",
        // REVISAR: confirmar con el equipo legal si corresponde detallar aquí el rango de multa asociado a esta infracción antes de publicar cifras específicas.
        "Más allá de una eventual sanción, no contar con un canal de derechos ARCOP también genera un riesgo reputacional: cada solicitud sin responder es, potencialmente, un reclamo documentado que la persona puede escalar directamente ante el regulador.",
      ],
    },
  ],
  faq: [
    {
      q: "¿Cuál es la diferencia entre ARCO y ARCOP?",
      a: "ARCO es una nomenclatura anterior que agrupa acceso, rectificación, cancelación y oposición. ARCOP agrega la portabilidad, que la Ley 21.719 reconoce expresamente como un derecho adicional (Arts. 4° a 11). En Chile, el conjunto vigente y completo es ARCOP.",
    },
    {
      q: "¿En cuánto tiempo debe responder mi empresa una solicitud ARCOP?",
      a: "Dentro de 30 días corridos desde que se recibe la solicitud, y de forma gratuita para quien la presenta (Arts. 4° a 11). Conviene registrar la fecha de ingreso de cada solicitud para controlar el plazo.",
    },
    {
      q: "¿Puedo cobrar por atender una solicitud de derechos ARCOP?",
      a: "No. La ley exige que la respuesta a estos derechos sea gratuita para el titular, cualquiera sea el resultado de la solicitud.",
    },
    {
      q: "¿Qué necesito para habilitar un canal de derechos ARCOP en mi empresa?",
      a: "Un canal único y conocido (correo dedicado o formulario), publicado en la política de tratamiento y en el sitio web, más un registro interno que permita verificar la identidad del solicitante y controlar el plazo de 30 días corridos de cada solicitud.",
    },
    {
      q: "¿Qué pasa si no respondo dentro de plazo a una solicitud ARCOP?",
      a: "La persona puede reclamar ante la Agencia de Protección de Datos Personales. La falta de un canal o procedimiento definido para atender estos derechos es una de las infracciones más frecuentes que la Agencia fiscaliza.",
    },
  ],
  related: ["ley-21719", "consentimiento-datos-personales", "multas-ley-21719"],
  author: {
    name: "Equipo legal de Kromi Privacy Center",
    credential: "Especialistas en protección de datos (Ley 21.719)",
  },
  datePublished: "2026-07-24",
  dateModified: "2026-07-24",
  reviewed: true,
};
