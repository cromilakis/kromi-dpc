import type { ResourceArticle } from "../types";

export const PROTECCION_DATOS_RETAIL_ECOMMERCE: ResourceArticle = {
  slug: "proteccion-datos-retail-ecommerce",
  type: "rubro",
  title: "Protección de datos en retail y e-commerce: qué exige la Ley 21.719",
  metaTitle: "Protección de datos e-commerce y retail | Ley 21.719",
  description:
    "Cómo aplica la Ley 21.719 a tiendas online y retail: deber de informar en el sitio y los formularios, cookies, marketing y finalidad de los datos de clientes.",
  keyword: "protección de datos e-commerce",
  summary:
    "Una tienda online o de retail trata a diario datos de identificación, contacto, compra y navegación de sus clientes, y suele usarlos también para marketing y personalización. La Ley 21.719 exige informar ese tratamiento desde el sitio web y cada formulario, gestionar las cookies con consentimiento, no reutilizar los datos operativos para fines distintos de los informados y limitar cuánto tiempo se conservan.",
  sections: [
    {
      heading: "Qué datos maneja un e-commerce o una tienda de retail",
      paragraphs: [
        "Una tienda online, a diferencia de otros negocios, concentra datos personales en varios puntos a la vez: el registro de cuenta (nombre, correo, teléfono), el checkout (dirección de despacho, medio de pago), el historial de compras y navegación, y —si existe programa de fidelización o newsletter— las preferencias y el consentimiento de marketing de cada cliente. El retail con local físico suma además los datos que recoge en caja, en tarjetas de puntos o en devoluciones.",
        "El riesgo no es solo la cantidad de datos, sino su combinación: cruzar historial de compra, ubicación de despacho y comportamiento de navegación permite perfilar a una persona con un detalle considerable, lo que exige un estándar de cuidado mayor al que aplicaría a un solo dato aislado. A esto se suma que buena parte de este tratamiento ocurre a través de plataformas y proveedores externos (pasarela de pago, courier, plataforma de e-commerce, herramienta de email marketing), cada uno de los cuales debe estar regulado como encargado de tratamiento.",
      ],
    },
    {
      heading: "El deber de informar en el sitio web y en cada formulario",
      paragraphs: [
        "El Art. 14 bis obliga a informar al titular desde el primer contacto, y el Art. 14 ter exige mantener una política de tratamiento pública y permanente, con contenidos mínimos como el responsable, las finalidades, las bases de licitud, los destinatarios y los plazos de conservación. En un e-commerce esto se traduce en algo muy concreto: la política de privacidad debe estar publicada y enlazada en el sitio, y cada formulario que recolecta datos —registro de cuenta, checkout, newsletter, contacto— debe referenciarla o incluir un aviso breve de finalidad antes de enviarse.",
        "Es un incumplimiento frecuente y fácil de detectar por un fiscalizador o por el propio cliente: basta revisar el pie de página y los formularios del sitio. Por eso conviene tratarlo como un punto de control permanente, no como un documento que se redacta una vez y se olvida.",
      ],
      list: {
        ordered: false,
        items: [
          "Publicar la política de tratamiento en el sitio y enlazarla en el pie de página.",
          "Enlazarla también junto a cada formulario que recolecta datos (registro, checkout, newsletter, contacto).",
          "Incluir un aviso breve de finalidad justo antes de enviar cada formulario.",
        ],
      },
    },
    {
      heading: "Cookies y consentimiento en el sitio",
      paragraphs: [
        "Las cookies de terceros —analítica, publicidad, remarketing— también son un tratamiento de datos personales y quedan sujetas al mismo deber de información e, idealmente, a un consentimiento previo del visitante antes de instalarlas. Un banner que solo informa, sin permitir rechazar, no cumple el estándar que la ley espera: el visitante debe poder aceptar o rechazar las cookies no esenciales antes de que se activen.",
        "Para un e-commerce esto es especialmente relevante porque las cookies de remarketing suelen alimentarse del historial de navegación y de compra, cruzando información que el visitante no siempre espera que se comparta con terceros. Herramientas de gestión de consentimiento (Cookiebot, Complianz, CookieYes u otras equivalentes, según la plataforma del sitio) permiten implementar este control sin desarrollo a medida.",
      ],
    },
    {
      heading: "Marketing y comunicaciones comerciales: consentimiento y baja",
      paragraphs: [
        "El Art. 8° letra b) reconoce el derecho del titular a oponerse al tratamiento de sus datos para marketing directo, obligando a la empresa a cesar ese uso apenas se ejerce. Enviar campañas de correo, SMS o WhatsApp a clientes que no dieron un consentimiento libre, informado y específico para ese fin —o que ya se opusieron— es una de las infracciones más visibles y reclamadas en el retail online, porque el propio destinatario la detecta de inmediato.",
        "El consentimiento de marketing debe captarse con una casilla no premarcada, quedar registrado con fecha y canal, y poder acreditarse ante un requerimiento. Esa exigencia se cumple con un procedimiento simple pero sostenido en el tiempo, no con una autorización genérica al momento de comprar.",
      ],
      list: {
        ordered: false,
        items: [
          "Usar una casilla de consentimiento no premarcada en el checkout o el registro, separada de la compra misma.",
          "Registrar fecha y canal de cada consentimiento de marketing obtenido.",
          "Incluir en cada correo o SMS comercial un mecanismo simple de baja, y procesarla de inmediato.",
        ],
      },
    },
    {
      heading: "Principio de finalidad: no reutilizar la base de clientes",
      paragraphs: [
        "El Art. 3° letra b) exige que los datos se recolecten para fines determinados, explícitos y lícitos, y prohíbe reutilizarlos después para fines incompatibles con los informados. En retail esto se traduce en un error habitual: usar el correo o teléfono que el cliente entregó para procesar su compra o su despacho —una finalidad operativa— para enviarle después campañas de marketing, sin que esa segunda finalidad haya sido informada ni consentida por separado.",
        "La forma correcta de operar es mantener separada la base operativa (necesaria para vender y despachar) de la base de marketing (que exige su propio consentimiento específico), y declarar ambas finalidades en la política de tratamiento y en el punto de recolección.",
      ],
    },
    {
      heading: "Retención y eliminación de los datos de clientes",
      paragraphs: [
        "El Art. 14 letra d) limita la conservación de los datos al tiempo necesario para la finalidad que la justificó: los antecedentes de un cliente no pueden guardarse indefinidamente solo porque en algún momento compró en la tienda. Un e-commerce acumula con rapidez cuentas inactivas, carritos abandonados y datos de clientes que no han vuelto a comprar en años, lo que aumenta la superficie de riesgo sin ningún beneficio para el negocio.",
        "Definir plazos de conservación por categoría de dato —cuentas inactivas, historial de compra, datos de marketing— y aplicar un procedimiento de depuración periódica es, además de una exigencia legal, una forma directa de reducir el impacto de un eventual incidente de seguridad.",
      ],
    },
  ],
  faq: [
    {
      q: "¿Puedo usar el correo del checkout para enviar campañas de marketing?",
      a: "No, salvo que el cliente haya dado un consentimiento específico y separado para ese fin. El correo o teléfono entregado para procesar la compra y el despacho responde a una finalidad operativa distinta; usarlo para marketing sin esa autorización adicional infringe el principio de finalidad (Art. 3° letra b).",
    },
    {
      q: "¿El banner de cookies de mi tienda online es suficiente?",
      a: "Solo si permite al visitante rechazar las cookies no esenciales antes de que se instalen, además de informar su existencia. Un banner meramente informativo, sin opción real de rechazo, no cumple el estándar del deber de información que exige la ley.",
    },
    {
      q: "¿Qué debo hacer si un cliente pide que dejen de enviarle publicidad?",
      a: "Cesar de inmediato el envío de comunicaciones comerciales a esa persona. El Art. 8° letra b) reconoce el derecho de oposición al marketing directo, y procesar la baja sin demora es, además, la forma más simple de evitar un reclamo.",
    },
    {
      q: "¿Debo tener un contrato con la pasarela de pago o el courier que usa mi tienda?",
      a: "Sí. Cuando un proveedor externo trata datos personales por cuenta de la tienda —pasarela de pago, courier, plataforma de e-commerce, herramienta de email marketing— debe existir un contrato de encargo que fije objeto, medidas de seguridad y destino de los datos al término del servicio.",
    },
    {
      q: "¿Puedo mantener indefinidamente los datos de clientes inactivos?",
      a: "No. Los datos deben conservarse solo por el tiempo necesario para la finalidad que los originó y luego suprimirse o anonimizarse. Conviene definir plazos de retención por categoría (cuentas inactivas, historial de compra, marketing) y depurar periódicamente lo que ya cumplió su plazo.",
    },
  ],
  related: ["ley-21719", "consentimiento-datos-personales", "derechos-arcop"],
  author: {
    name: "Equipo legal de Kromi Privacy Center",
    credential: "Especialistas en protección de datos (Ley 21.719)",
  },
  datePublished: "2026-07-24",
  dateModified: "2026-07-24",
  reviewed: true,
};
