import type { ResourceArticle } from "../types";

export const PROTECCION_DATOS_FINTECH: ResourceArticle = {
  slug: "proteccion-datos-fintech",
  type: "rubro",
  title: "Protección de datos en fintech y empresas financieras: guía Ley 21.719",
  metaTitle: "Protección de datos fintech: guía de cumplimiento Ley 21.719",
  description:
    "Cómo cumplir la Ley 21.719 en fintech, cooperativas y empresas de servicios financieros: datos sensibles, secreto bancario, NCG 461 CMF y transferencias internacionales.",
  keyword: "protección de datos fintech",
  summary:
    "Las fintech, cooperativas de ahorro y crédito y empresas de servicios financieros tratan datos especialmente sensibles —ingresos, deudas, historial crediticio, movimientos bancarios— que la Ley 21.719 protege de forma reforzada y que además están sujetos al secreto bancario del DFL 3/1997. A esto se suma la exigencia sectorial de la Comisión para el Mercado Financiero (CMF), lo que hace del sector financiero uno de los de mayor riesgo regulatorio y reputacional ante un incidente de seguridad.",
  sections: [
    {
      heading: "Por qué los datos financieros son especialmente sensibles",
      paragraphs: [
        "Una fintech o una empresa de servicios financieros no solo trata datos de identificación de sus clientes: trata su situación socioeconómica, ingresos, deudas, historial de pagos, movimientos y hábitos de consumo. La Ley 21.719 reconoce expresamente esta categoría dentro de los datos sensibles: el Art. 16 incluye la situación socioeconómica y financiera como una de las categorías de datos cuyo tratamiento está prohibido por regla general, salvo que exista consentimiento expreso del titular u otra habilitación legal específica.",
        "Esto cambia el estándar aplicable frente a otros rubros: no basta con informar el tratamiento y contar con una base de licitud genérica, sino que la empresa debe poder acreditar una habilitación reforzada para tratar este tipo de información, además de aplicar medidas de seguridad proporcionales al riesgo que implica manejar datos financieros a escala.",
      ],
    },
    {
      heading: "Ley 21.719 y secreto bancario: dos regímenes que conviven",
      paragraphs: [
        "Las entidades del sector financiero no solo están sujetas a la Ley 21.719: conviven con el secreto bancario establecido en el Art. 154 del DFL 3/1997 (Ley General de Bancos), que somete las operaciones de los clientes a reserva y solo permite revelarlas con su consentimiento o en los casos que la ley autoriza expresamente.",
        "En la práctica, esto significa que una fintech o institución financiera debe cumplir dos estándares de protección que se refuerzan entre sí: el régimen general de datos personales (bases de licitud, derechos ARCOP, deber de información) y el régimen específico de reserva de las operaciones bancarias. Un tratamiento que sería aceptable para datos personales comunes —por ejemplo, compartir información con un tercero sin resguardos claros— puede además configurar una infracción al secreto bancario si involucra operaciones de clientes.",
      ],
    },
    {
      heading: "Regulación sectorial: la Norma de Carácter General N° 461 de la CMF",
      paragraphs: [
        "La Comisión para el Mercado Financiero (CMF) exige a las entidades bajo su fiscalización estándares propios de gestión de riesgos y seguridad de la información mediante la Norma de Carácter General N° 461 (NCG 461 CMF), que aplica de forma específica a la industria financiera e incluye la protección de los datos de los clientes.",
        "Esto agrega una capa adicional de exigencia sobre la que impone la Ley 21.719: una fintech regulada por la CMF debe demostrar cumplimiento ante dos fiscalizadores distintos —la Agencia de Protección de Datos Personales y la propia CMF— lo que en la práctica exige que sus políticas de seguridad y su documentación de cumplimiento cubran ambos marcos de forma coherente.",
      ],
    },
    {
      heading: "Seguridad reforzada y control de accesos",
      paragraphs: [
        "Dado que trata datos sensibles a gran escala, el sector financiero debe aplicar el estándar más exigente de medidas de seguridad que contempla el Art. 14 quinquies de la Ley 21.719: control de accesos individualizado, cifrado, respaldos y trazabilidad completa de quién accede a qué información y cuándo.",
        "El riesgo más frecuente en la práctica no es la ausencia total de controles, sino su debilidad: usuarios compartidos entre operadores, accesos sin restricción por rol o sistemas sin registro de auditoría. Ese tipo de brecha es especialmente grave en el sector financiero, porque compromete tanto la Ley 21.719 como el deber de reserva del secreto bancario.",
      ],
      list: {
        ordered: false,
        items: [
          "Acceso individualizado: cada persona del equipo debe operar con su propia credencial, nunca con usuarios compartidos.",
          "Control de acceso por rol: solo debe acceder a los datos financieros de un cliente quien lo necesite para su función específica.",
          "Registro de auditoría: el sistema debe permitir reconstruir quién accedió, modificó o eliminó cada dato.",
          "Cifrado y respaldos: la información financiera debe protegerse en tránsito y en reposo, con respaldos periódicos verificables.",
        ],
      },
    },
    {
      heading: "Transferencias internacionales de datos: nube y casa matriz",
      paragraphs: [
        "Es habitual que una fintech opere sobre infraestructura en la nube alojada fuera de Chile, o que reporte datos de clientes a una casa matriz en el extranjero. Ambos escenarios constituyen una transferencia internacional de datos, y la Ley 21.719 exige que el destino ofrezca un nivel de protección adecuado o que se adopten garantías apropiadas —como cláusulas contractuales— además de informar el país de destino en la política de tratamiento (Art. 14 ter letra h, Art. 15).",
        "El riesgo aumenta cuando se trata de datos financieros: no saber con precisión en qué país se alojan los servidores, o no tener un acuerdo firmado con el proveedor extranjero que garantice la protección de los datos, expone a la empresa frente a la Agencia. Cuando además esos datos son sensibles —como ocurre con la situación financiera—, la ausencia de garantías documentadas configura una brecha crítica.",
      ],
    },
    {
      heading: "Encargados de tratamiento y proveedores tecnológicos",
      paragraphs: [
        "Las fintech dependen intensamente de proveedores externos: procesadores de pago, plataformas de scoring crediticio, proveedores de hosting y software as a service. Cada uno de ellos que trate datos de clientes por cuenta de la empresa actúa como encargado de tratamiento, y el Art. 15 bis exige que exista un contrato escrito que fije el objeto del encargo, las medidas de seguridad exigidas, el régimen de subcontratación y el destino de los datos al término del servicio.",
        "La empresa financiera no se libera de su responsabilidad por delegar el tratamiento en un tercero: si el proveedor sufre un incidente o trata los datos fuera de lo pactado, la responsabilidad frente a la Agencia y frente a los clientes recae igualmente en la fintech. Por eso, revisar y actualizar estos contratos es una de las primeras tareas de adecuación para el sector.",
      ],
      list: {
        ordered: true,
        items: [
          "Inventariar todos los proveedores que acceden a datos financieros de clientes (pagos, scoring, hosting, soporte).",
          "Verificar que exista un contrato de encargo de tratamiento vigente con cada uno (Art. 15 bis).",
          "Confirmar si alguno de esos proveedores implica transferencia internacional y documentar las garantías correspondientes.",
          "Revisar que el contrato regule qué ocurre con los datos al término de la relación con el proveedor.",
        ],
      },
    },
  ],
  faq: [
    {
      q: "¿Los datos financieros son datos sensibles según la Ley 21.719?",
      a: "Sí. El Art. 16 de la Ley 21.719 incluye la situación socioeconómica y financiera dentro de las categorías de datos sensibles, cuyo tratamiento está prohibido salvo consentimiento expreso del titular u otra habilitación legal específica.",
    },
    {
      q: "¿La Ley 21.719 reemplaza al secreto bancario?",
      a: "No. La Ley 21.719 y el secreto bancario del Art. 154 del DFL 3/1997 (Ley General de Bancos) son regímenes complementarios: la primera regula el tratamiento de datos personales en general y el segundo somete específicamente las operaciones de los clientes a reserva.",
    },
    {
      q: "¿Qué exige la CMF además de la Ley 21.719?",
      a: "La Norma de Carácter General N° 461 (NCG 461 CMF) exige a las entidades fiscalizadas por la CMF estándares propios de gestión de riesgos y seguridad de la información, incluida la protección de los datos de los clientes, de forma adicional a las obligaciones de la Ley 21.719.",
    },
    {
      q: "¿Alojar los datos en un servidor fuera de Chile es una transferencia internacional?",
      a: "Sí. Si los datos de clientes se alojan en infraestructura en la nube fuera de Chile o se comparten con una casa matriz en el extranjero, esto constituye una transferencia internacional que debe informarse en la política de tratamiento (Art. 14 ter letra h) y contar con garantías adecuadas.",
    },
    {
      q: "¿Qué debe tener el contrato con un proveedor tecnológico que procesa datos financieros?",
      a: "Debe fijar el objeto del encargo, las medidas de seguridad exigidas, el régimen de subcontratación y el destino de los datos al término del servicio, conforme al Art. 15 bis de la Ley 21.719. La empresa financiera sigue siendo responsable frente a la Agencia aunque delegue el tratamiento en el proveedor.",
    },
  ],
  related: ["ley-21719", "datos-sensibles", "que-es-el-rat"],
  author: {
    name: "Equipo legal de Kromi Privacy Center",
    credential: "Especialistas en protección de datos (Ley 21.719)",
  },
  datePublished: "2026-07-24",
  dateModified: "2026-07-24",
  reviewed: true,
};
