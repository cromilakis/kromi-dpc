import type { ResourceArticle } from "../types";

export const NOTIFICACION_BRECHAS_SEGURIDAD: ResourceArticle = {
  slug: "notificacion-brechas-seguridad",
  type: "satelite",
  title: "Notificación de brechas de datos: qué exige la Ley 21.719",
  metaTitle: "Notificación de brechas de datos personales | Ley 21.719",
  description:
    "Qué es una vulneración de seguridad, cuándo hay que hacer la notificación de brechas de datos a la Agencia y a los titulares, y cómo prepararse con un plan de respuesta.",
  keyword: "notificación de brechas de datos",
  summary:
    "La notificación de brechas de datos es el deber, establecido en el Art. 14 sexies de la Ley 21.719, de reportar a la Agencia de Protección de Datos Personales toda vulneración de seguridad con riesgo razonable para las personas, y de avisar además a los titulares cuando la brecha afecta datos sensibles, de menores de 14 años o financieros. Contar con un plan de respuesta a incidentes y un registro de brechas es la forma práctica de poder cumplir este deber cuando ocurre.",
  sections: [
    {
      heading: "¿Qué es una vulneración o brecha de seguridad?",
      paragraphs: [
        "Una vulneración de seguridad —o brecha de datos— es cualquier incidente que compromete la confidencialidad, integridad o disponibilidad de datos personales: una filtración de información hacia terceros no autorizados, la pérdida de un dispositivo o respaldo sin cifrar, un acceso indebido a un sistema, o el envío de datos al destinatario equivocado.",
        "El Artículo 14 sexies de la Ley 21.719 pone el foco en las vulneraciones que generan un riesgo razonable para las personas titulares de los datos, no en cualquier incidente menor sin consecuencias. Determinar ese riesgo —qué datos se vieron afectados, cuántas personas, y qué daño podrían sufrir— es el primer paso para saber si corresponde notificar.",
      ],
    },
    {
      heading: "¿Cuándo hay que notificar, y a quién?",
      paragraphs: [
        "El Art. 14 sexies distingue dos destinatarios de la notificación, con condiciones distintas para cada uno.",
      ],
      list: {
        ordered: false,
        items: [
          "A la Agencia de Protección de Datos Personales: siempre que la vulneración implique un riesgo razonable para los derechos de los titulares, sin importar qué tipo de dato esté involucrado.",
          "A los titulares afectados: adicionalmente, cuando la vulneración compromete datos sensibles, datos de menores de 14 años o datos financieros, dado el mayor daño potencial que implica su exposición.",
        ],
      },
    },
    {
      heading: "¿En qué plazo se debe notificar?",
      paragraphs: [
        // REVISAR: la fuente (Art. 14 sexies, lib/legal/citations.ts) no fija un número de horas o días; usa la expresión "sin dilaciones indebidas" y "por los medios más expeditos". No agregar un plazo numérico sin confirmación del equipo legal.
        "La Ley 21.719 no fija un plazo expresado en horas o días para la notificación de brechas de datos. El Art. 14 sexies exige reportar a la Agencia por los medios más expeditos y sin dilaciones indebidas, lo que en la práctica significa actuar apenas se detecta y confirma el riesgo, sin esperar a tener todos los detalles del incidente resueltos.",
        "Esta falta de un número exacto no es una licencia para postergar la notificación: la exigencia de actuar sin dilaciones indebidas se evalúa según cuánto se demoró la organización en reaccionar una vez que tuvo motivos razonables para sospechar o confirmar la vulneración.",
      ],
    },
    {
      heading: "Cómo prepararse: el plan de respuesta a incidentes",
      paragraphs: [
        "Improvisar la respuesta en medio de una brecha real multiplica el riesgo de errores y de demoras que después son difíciles de justificar ante la Agencia. Por eso, el estándar de diligencia esperado es contar con un plan de respuesta a incidentes escrito y conocido por el equipo, antes de que ocurra un incidente.",
        "Un plan de respuesta a incidentes ordena la reacción de la empresa en fases claras, con roles y contactos definidos de antemano.",
      ],
      list: {
        ordered: true,
        items: [
          "Detección: identificar que ocurrió un evento que puede constituir una vulneración de seguridad.",
          "Contención: limitar el alcance del incidente (revocar accesos, aislar sistemas, detener la exposición) mientras se investiga.",
          "Evaluación de riesgo: determinar qué datos y cuántas personas se vieron afectadas, y si existe riesgo razonable para sus derechos.",
          "Notificación: reportar a la Agencia sin dilaciones indebidas y, si corresponde según el tipo de dato afectado, a los titulares.",
        ],
      },
    },
    {
      heading: "El registro de incidentes de seguridad",
      paragraphs: [
        "El Art. 14 sexies exige además llevar un registro de los incidentes de seguridad, con independencia de si en cada caso terminó siendo necesario notificar. Este registro documenta qué ocurrió, cuándo se detectó, qué datos y personas se vieron involucrados, qué medidas de contención se aplicaron y si hubo notificación a la Agencia o a los titulares.",
        "Mantener este registro cumple una doble función: permite acreditar diligencia ante una fiscalización posterior —conforme al principio de responsabilidad de la Ley 21.719— y sirve como base para revisar y mejorar el plan de respuesta después de cada incidente, incluyendo los que no llegaron a ser reportados.",
        "Estas medidas de registro y respuesta se enmarcan además en el deber general de aplicar medidas de seguridad proporcionales al riesgo del Art. 14 quinquies, que exige controles de acceso, cifrado, respaldos y trazabilidad adecuados a la naturaleza de los datos tratados.",
      ],
    },
  ],
  faq: [
    {
      q: "¿Toda filtración de datos se debe notificar a la Agencia?",
      a: "Solo cuando implica un riesgo razonable para los derechos de los titulares. Un incidente menor, sin exposición real de datos personales o sin consecuencias probables para las personas, no necesariamente activa el deber de notificación, pero conviene registrarlo igual.",
    },
    {
      q: "¿Cuándo hay que avisar también a los titulares, y no solo a la Agencia?",
      a: "Cuando la vulneración afecta datos sensibles, datos de menores de 14 años o datos financieros. En esos casos, el Art. 14 sexies exige notificar tanto a la Agencia como a las personas cuyos datos se vieron comprometidos.",
    },
    {
      q: "¿Cuánto tiempo hay para notificar una brecha de datos?",
      a: "La Ley 21.719 no establece un número exacto de horas o días. El Art. 14 sexies exige hacerlo por los medios más expeditos y sin dilaciones indebidas, es decir, tan pronto como se detecta y se confirma el riesgo, sin demoras injustificadas.",
    },
    {
      q: "¿Qué debe incluir un plan de respuesta a incidentes de seguridad?",
      a: "Debe cubrir al menos las fases de detección, contención, evaluación del riesgo y notificación, con roles y contactos reales de la empresa definidos de antemano, para que el equipo sepa exactamente a quién avisar apenas detecta un incidente.",
    },
    {
      q: "¿Es obligatorio llevar un registro de incidentes de seguridad?",
      a: "Sí. El Art. 14 sexies exige mantener un registro de los incidentes de seguridad, incluyendo aquellos que no terminaron siendo notificados, como parte de la evidencia de cumplimiento que la organización debe poder mostrar.",
    },
  ],
  related: ["ley-21719", "multas-ley-21719", "que-es-el-rat"],
  author: {
    name: "Equipo legal de Kromi Privacy Center",
    credential: "Especialistas en protección de datos (Ley 21.719)",
  },
  datePublished: "2026-07-24",
  dateModified: "2026-07-24",
  reviewed: true,
};
