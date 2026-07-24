import type { ResourceArticle } from "../types";

export const DATOS_SENSIBLES: ResourceArticle = {
  slug: "datos-sensibles",
  type: "satelite",
  title: "Datos sensibles en la Ley 21.719: qué son y cómo tratarlos",
  metaTitle: "Datos sensibles ley 21.719: categorías y requisitos",
  description:
    "Qué son los datos sensibles según la Ley 21.719, qué categorías incluye (salud, biométricos, menores) y qué exige la ley para tratarlos: consentimiento expreso y medidas de seguridad reforzadas.",
  keyword: "datos sensibles ley 21.719",
  summary:
    "Los datos sensibles son una categoría especial de datos personales —salud, biométricos, origen étnico, afiliación sindical o política, entre otros— cuyo tratamiento la Ley 21.719 prohíbe por regla general, salvo consentimiento expreso del titular u otra habilitación legal (Art. 16). Además del régimen general, la ley contempla reglas reforzadas específicas para datos de salud (Art. 16 bis), biométricos (Art. 16 ter) y de niños, niñas y adolescentes menores de 14 años (Art. 16 quáter).",
  sections: [
    {
      heading: "¿Qué son los datos sensibles?",
      paragraphs: [
        "Los datos sensibles son una subcategoría de los datos personales que, por su naturaleza, pueden dar origen a discriminación o exponer a su titular a un riesgo significativo si se tratan de forma indebida. Por eso la Ley 21.719 les otorga un régimen de protección más exigente que al resto de los datos personales.",
        "El listado no es un catálogo cerrado de ejemplos menores: incluye categorías que revelan aspectos íntimos o especialmente delicados de una persona, y que en general no deberían inferirse ni recolectarse salvo que exista una razón legítima y verificable para hacerlo.",
      ],
      list: {
        ordered: false,
        items: [
          "Origen étnico o racial.",
          "Afiliación sindical.",
          "Opiniones políticas, convicciones religiosas o filosóficas.",
          "Datos de salud y de perfil biológico humano.",
          "Datos biométricos (huella, rostro, voz, iris, entre otros).",
          "Vida sexual, orientación sexual e identidad de género.",
          // REVISAR: confirmar con el equipo legal si el listado exacto del Art. 2 (definición de "datos sensibles") incluye alguna categoría adicional no cubierta en lib/legal/citations.ts antes de publicar.
        ],
      },
    },
    {
      heading: "La regla general: prohibición salvo consentimiento u otra habilitación (Art. 16)",
      paragraphs: [
        "El Artículo 16 de la Ley 21.719 fija la regla base para todos los datos sensibles: su tratamiento está prohibido, salvo que exista consentimiento expreso del titular o concurra otra habilitación legal específica que lo permita.",
        "Esta prohibición por defecto es una de las diferencias más relevantes respecto del régimen anterior de la Ley 19.628, que trataba a los datos sensibles con un estándar menos exigente. En la práctica, esto significa que una empresa no puede simplemente recolectar o inferir datos sensibles porque le resulten útiles: necesita, antes de tratarlos, identificar expresamente la base legal que la habilita.",
        "Cuando la base es el consentimiento, este debe ser expreso —no basta con un consentimiento tácito o genérico— y la empresa debe poder acreditarlo ante la Agencia de Protección de Datos Personales en caso de un reclamo o fiscalización.",
      ],
    },
    {
      heading: "Datos de salud y de perfil biológico (Art. 16 bis)",
      paragraphs: [
        "El Artículo 16 bis regula el tratamiento de los datos de salud y de perfil biológico humano, una categoría especialmente relevante para clínicas, prestadores de salud, aseguradoras y cualquier empleador que gestione licencias médicas o exámenes ocupacionales.",
        "Este régimen exige habilitaciones específicas para tratar estos datos y garantías adicionales de confidencialidad, dado el impacto que su exposición indebida puede tener sobre la persona. Una empresa que trata datos de salud debe poder demostrar tanto la base legal del tratamiento como las medidas concretas que resguardan su reserva.",
      ],
    },
    {
      heading: "Datos biométricos (Art. 16 ter)",
      paragraphs: [
        "El Artículo 16 ter regula específicamente los datos biométricos —huella dactilar, reconocimiento facial, voz, iris, entre otros—, cada vez más usados en control de acceso y de asistencia laboral.",
        "La ley exige informar al titular el sistema utilizado, la finalidad del tratamiento y el plazo de conservación de los datos. Además, el consentimiento debe ser realmente libre: en contextos como el laboral, donde existe una relación de subordinación, esto obliga a ofrecer una alternativa no biométrica —por ejemplo, tarjeta o PIN— a quien no desee o no pueda dar ese consentimiento, sin que ello le genere consecuencias adversas.",
      ],
      list: {
        ordered: false,
        items: [
          "Informar por escrito el sistema biométrico usado, su finalidad y el plazo de conservación.",
          "Ofrecer una alternativa no biométrica disponible para quien no consienta.",
          "Almacenar plantillas cifradas (no la imagen o el dato bruto) y eliminarlas al término de la relación.",
        ],
      },
    },
    {
      heading: "Datos de niños, niñas y adolescentes (Art. 16 quáter)",
      paragraphs: [
        "El Artículo 16 quáter establece que el tratamiento de datos de menores de 14 años requiere la autorización de su padre, madre o representante legal, atendiendo siempre al interés superior del niño como criterio rector.",
        "Esta exigencia se suma —no reemplaza— a las reglas generales sobre datos sensibles cuando el dato del menor corresponde además a alguna de esas categorías, como sucede con datos de salud o biométricos de niños, niñas y adolescentes.",
      ],
    },
    {
      heading: "Medidas de seguridad reforzadas para datos sensibles",
      paragraphs: [
        "Más allá de contar con una base de licitud válida, la Ley 21.719 espera que las organizaciones apliquen medidas de seguridad proporcionales al riesgo, y ese estándar es más alto cuando se trata de datos sensibles.",
        "En la práctica, esto se traduce en separar los datos sensibles de los datos de contacto ordinarios, restringir su acceso a quienes realmente lo necesitan para la finalidad declarada, y aplicar cifrado y trazabilidad reforzados, de modo que la empresa pueda demostrar diligencia ante una eventual fiscalización o incidente.",
      ],
      list: {
        ordered: false,
        items: [
          "Control de acceso restringido y diferenciado para datos sensibles.",
          "Cifrado de los datos sensibles almacenados, especialmente biométricos y de salud.",
          "Registro de quién accede a estos datos y con qué finalidad.",
          "Minimización del plazo de conservación al estrictamente necesario.",
        ],
      },
    },
  ],
  faq: [
    {
      q: "¿Qué se considera un dato sensible según la Ley 21.719?",
      a: "Son datos personales que revelan aspectos como el origen étnico o racial, la afiliación sindical, las opiniones políticas o convicciones religiosas, la salud, los datos biométricos o la vida sexual y orientación sexual de una persona.",
    },
    {
      q: "¿Se puede tratar un dato sensible sin consentimiento?",
      a: "La regla general del Art. 16 es que el tratamiento de datos sensibles está prohibido salvo consentimiento expreso del titular u otra habilitación legal específica que lo permita en el caso concreto.",
    },
    {
      q: "¿Qué exige la ley para usar biometría en el control de asistencia laboral?",
      a: "El Art. 16 ter exige informar al trabajador el sistema usado, la finalidad y el plazo de conservación, y ofrecer una alternativa no biométrica a quien no consienta, para que el consentimiento sea realmente libre en el contexto laboral.",
    },
    {
      q: "¿Se puede tratar datos de un menor de 14 años?",
      a: "Sí, pero requiere la autorización de su padre, madre o representante legal, conforme al Art. 16 quáter, atendiendo siempre al interés superior del niño.",
    },
    {
      q: "¿Qué pasa si se filtran datos sensibles en una brecha de seguridad?",
      a: "Conforme al Art. 14 sexies, si la vulneración afecta datos sensibles, de menores de 14 años o financieros, la empresa debe notificar no solo a la Agencia sino también a los titulares afectados, además de mantener un registro del incidente.",
    },
  ],
  related: ["ley-21719", "consentimiento-datos-personales", "proteccion-datos-salud"],
  author: {
    name: "Equipo legal de Kromi Privacy Center",
    credential: "Especialistas en protección de datos (Ley 21.719)",
  },
  datePublished: "2026-07-24",
  dateModified: "2026-07-24",
  reviewed: true,
};
