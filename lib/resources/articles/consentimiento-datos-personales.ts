import type { ResourceArticle } from "../types";

export const CONSENTIMIENTO_DATOS_PERSONALES: ResourceArticle = {
  slug: "consentimiento-datos-personales",
  type: "satelite",
  title: "Consentimiento de datos personales: qué exige la Ley 21.719",
  metaTitle: "Consentimiento datos personales en Chile: requisitos legales",
  description:
    "Qué hace válido un consentimiento para tratar datos personales en Chile, cómo pedirlo, cuándo se necesita un consentimiento reforzado y cómo acreditarlo ante una fiscalización.",
  keyword: "consentimiento datos personales chile",
  summary:
    "El consentimiento es una de las bases de licitud que la Ley 21.719 exige para tratar datos personales en Chile, y debe ser libre, informado, específico e inequívoco (Art. 12). Para datos sensibles la ley pide un estándar más exigente: consentimiento expreso (Art. 16). El titular puede revocarlo u oponerse en cualquier momento, y la organización debe poder acreditar cuándo y cómo lo obtuvo.",
  sections: [
    {
      heading: "¿Qué es un consentimiento válido según la Ley 21.719?",
      paragraphs: [
        "El Art. 12 de la Ley 21.719 define las cuatro condiciones que debe cumplir el consentimiento para que sea una base de licitud válida al tratar datos personales: libre, informado, específico e inequívoco. Si falta alguna de estas condiciones, el consentimiento no habilita el tratamiento y la organización queda expuesta como si no tuviera base legal.",
        "Libre significa que el titular puede negarse sin sufrir un perjuicio real por hacerlo (por ejemplo, sin perder acceso a un servicio que no requiere ese dato). Informado significa que el titular supo, antes de aceptar, qué datos se recolectan, para qué se usarán y quién los tratará. Específico significa que el consentimiento cubre una finalidad determinada, no autorizaciones genéricas para 'cualquier uso futuro'. E inequívoco significa que debe derivar de una acción afirmativa y clara del titular, no de su silencio o de una casilla ya marcada.",
      ],
    },
    {
      heading: "Cómo pedir el consentimiento correctamente",
      paragraphs: [
        "En la práctica, el requisito de que el consentimiento sea inequívoco descarta varios formatos habituales que las empresas siguen usando por costumbre o por diseño de formularios heredados.",
      ],
      list: {
        ordered: false,
        items: [
          "La casilla debe estar desmarcada por defecto: el titular tiene que marcarla activamente. Una casilla premarcada no constituye consentimiento inequívoco.",
          "El texto junto a la casilla debe explicar la finalidad concreta (por ejemplo, 'recibir ofertas y promociones por correo'), no una fórmula genérica de aceptación de términos y condiciones.",
          "Debe quedar registro verificable de qué se aceptó, cuándo y con qué versión del texto informativo, de forma que la organización pueda acreditarlo más adelante ante un requerimiento.",
          "Si el mismo formulario recolecta datos para varias finalidades distintas (por ejemplo, prestar un servicio y además enviar marketing), cada finalidad debe tener su propio consentimiento específico, no uno combinado.",
        ],
      },
    },
    {
      heading: "Consentimiento reforzado para datos sensibles",
      paragraphs: [
        "El Art. 16 establece una regla más estricta para los datos sensibles: su tratamiento está prohibido, salvo que exista consentimiento expreso del titular u otra habilitación legal específica. Son datos sensibles, entre otros, los de salud, biométricos, y los que revelan origen étnico, afiliación sindical, opiniones políticas o creencias religiosas.",
        "Consentimiento expreso implica un estándar más alto que el consentimiento general del Art. 12: la manifestación de voluntad del titular debe ser explícita y quedar documentada, sin que quepa inferirla de un comportamiento o de una aceptación genérica de condiciones de uso. Categorías específicas —como datos biométricos o de menores de 14 años— tienen además exigencias propias adicionales que conviene revisar caso a caso antes de tratarlas.",
      ],
    },
    {
      heading: "Revocación y derecho de oposición",
      paragraphs: [
        "El consentimiento puede revocarse en cualquier momento (Art. 12): el titular no necesita justificar por qué retira su autorización, y la organización debe dejar de tratar los datos para esa finalidad desde que recibe la revocación, con la misma facilidad con que se otorgó.",
        "Distinto del consentimiento, pero relacionado, es el derecho de oposición del Art. 8° letra b: el titular puede oponerse específicamente al uso de sus datos para marketing directo, y el responsable debe cesar ese tratamiento al recibir la solicitud. Enviar comunicaciones comerciales sin consentimiento previo, libre, informado, específico e inequívoco, o seguir enviándolas después de una oposición, es una de las infracciones más frecuentes que revisa un fiscalizador.",
      ],
    },
    {
      heading: "Cómo acreditar el consentimiento obtenido",
      paragraphs: [
        "El principio de responsabilidad (accountability) que recorre toda la Ley 21.719 traslada la carga de la prueba a la organización: no basta con haber pedido el consentimiento, hay que poder demostrarlo ante la Agencia o ante el propio titular.",
      ],
      list: {
        ordered: true,
        items: [
          "Registrar la fecha, el canal y la versión exacta del texto informativo que el titular aceptó.",
          "Conservar evidencia de la acción afirmativa (por ejemplo, el registro de que la casilla fue marcada por el usuario, no premarcada).",
          "Mantener un historial de revocaciones y oposiciones recibidas, con la fecha en que se dejó de tratar el dato para esa finalidad.",
          "Si el consentimiento fue verbal (por ejemplo, en un mostrador o por teléfono), dejar un registro escrito posterior; un consentimiento verbal sin ningún respaldo documental es difícil de acreditar y expone a la empresa, especialmente si se trata de datos sensibles.",
        ],
      },
    },
  ],
  faq: [
    {
      q: "¿Una casilla premarcada cuenta como consentimiento válido?",
      a: "No. El Art. 12 exige que el consentimiento sea inequívoco, lo que requiere una acción afirmativa del titular. Una casilla que ya viene marcada por defecto no cumple ese estándar.",
    },
    {
      q: "¿Puedo usar un solo consentimiento para varias finalidades distintas?",
      a: "No es recomendable. El consentimiento debe ser específico para cada finalidad. Si se recolectan datos para prestar un servicio y también para enviar marketing, conviene solicitar un consentimiento independiente para cada uso.",
    },
    {
      q: "¿Qué diferencia hay entre revocar el consentimiento y ejercer el derecho de oposición?",
      a: "La revocación (Art. 12) deja sin efecto el consentimiento que el titular dio para un tratamiento determinado. El derecho de oposición (Art. 8° letra b) es específico para marketing directo: el titular puede pedir que se detenga ese uso en particular, incluso si en algún momento lo autorizó.",
    },
    {
      q: "¿El consentimiento para datos sensibles es distinto del consentimiento general?",
      a: "Sí. Mientras el Art. 12 exige un consentimiento libre, informado, específico e inequívoco, el Art. 16 pide para datos sensibles un consentimiento expreso, un estándar más alto que debe quedar documentado de forma explícita.",
    },
    {
      q: "¿Cómo demuestro que obtuve un consentimiento si me lo pide la Agencia?",
      a: "Con registros verificables: fecha, canal, versión del texto informativo aceptado y evidencia de la acción afirmativa del titular. El principio de responsabilidad de la ley pone esa carga de la prueba en la organización, no en el titular.",
    },
  ],
  related: ["ley-21719", "derechos-arcop", "datos-sensibles"],
  author: {
    name: "Equipo legal de Kromi Privacy Center",
    credential: "Especialistas en protección de datos (Ley 21.719)",
  },
  datePublished: "2026-07-24",
  dateModified: "2026-07-24",
  reviewed: true,
};
