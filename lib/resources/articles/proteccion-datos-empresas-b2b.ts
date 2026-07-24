import type { ResourceArticle } from "../types";

export const PROTECCION_DATOS_EMPRESAS_B2B: ResourceArticle = {
  slug: "proteccion-datos-empresas-b2b",
  type: "rubro",
  title: "Protección de datos para empresas B2B, SaaS y startups",
  metaTitle: "Protección de datos empresas B2B: guía Ley 21.719 para SaaS y startups",
  description:
    "Cómo cumple la Ley 21.719 una empresa B2B, SaaS, consultora o agencia: rol de encargado de tratamiento, contratos con clientes y proveedores, decisiones automatizadas y EIPD.",
  keyword: "protección de datos empresas B2B",
  summary:
    "Las empresas SaaS, consultoras, agencias y startups que prestan servicios a otras empresas suelen tratar datos personales por cuenta de sus clientes, lo que las sitúa como encargadas de tratamiento bajo la Ley 21.719. Muchas de estas organizaciones están en una etapa temprana de cumplimiento, y su exposición principal está en los contratos —tanto los que firman con sus clientes como los que reciben de sus propios proveedores— y en los algoritmos que usan para automatizar decisiones.",
  sections: [
    {
      heading: "Encargado de tratamiento vs. responsable: por qué importa la diferencia",
      paragraphs: [
        "Una empresa B2B —una plataforma SaaS de gestión, una agencia de marketing, una consultora de recursos humanos, una herramienta de analítica— rara vez trata solo sus propios datos. En la mayoría de los casos, procesa datos personales que pertenecen a los clientes finales de su cliente: los contactos que un CRM almacena, los postulantes que pasan por una plataforma de reclutamiento, los usuarios que interactúan con un chatbot integrado en el sitio de otra empresa.",
        "La Ley 21.719 distingue entre el responsable del tratamiento (quien decide para qué y cómo se tratan los datos, típicamente el cliente que contrata el servicio) y el encargado de tratamiento (quien trata esos datos por cuenta de otro, siguiendo sus instrucciones). Una startup o proveedor SaaS suele operar como encargado respecto de los datos que sus clientes cargan en la plataforma, y como responsable respecto de sus propios datos operativos (empleados, prospectos comerciales, usuarios de su propio sitio). Confundir estos roles —o no distinguirlos en los contratos— es el origen de buena parte de los riesgos de cumplimiento de este rubro.",
      ],
    },
    {
      heading: "El contrato de encargo cuando se tratan datos de los clientes de los clientes",
      paragraphs: [
        "Cuando una empresa presta un servicio que implica tratar datos personales por cuenta de otra —alojar su base de datos, ejecutar campañas con sus contactos, automatizar procesos sobre sus usuarios—, el Art. 15 bis exige que ese encargo conste en un contrato escrito. El contrato debe fijar el objeto y la duración del encargo, la finalidad para la que se tratan los datos, las medidas de seguridad aplicables, el régimen de subcontratación (qué puede o no subcontratar el encargado) y el destino de los datos al término del servicio: devolución, migración o eliminación.",
        "Sin este contrato, la empresa que presta el servicio queda expuesta ante su propio cliente y ante la Agencia si algo sale mal: un incidente de seguridad, un uso de los datos fuera de lo instruido o una migración descoordinada al terminar el contrato pueden convertirse en una pérdida de la cuenta comercial completa, además de una infracción a la ley.",
      ],
      list: {
        ordered: false,
        items: [
          "Formalizar el encargo con cada cliente cuyos datos se tratan, definiendo objeto, finalidad, medidas de seguridad y duración.",
          "Regular la subcontratación: cualquier tercero adicional que la empresa incorpore (freelancers, otra herramienta, un subprocesador) requiere autorización previa y por escrito del cliente.",
          "Definir con claridad el destino de los datos al término del servicio: devolución, portabilidad o eliminación verificable.",
        ],
      },
    },
    {
      heading: "Los contratos con los proveedores propios de la empresa",
      paragraphs: [
        "El mismo Art. 15 bis opera en la dirección contraria cuando la empresa B2B es, a su vez, cliente de otros proveedores: hosting, procesamiento de pagos, correo transaccional, herramientas de analítica o soporte, servicios de inteligencia artificial de terceros. Si esos proveedores tratan datos personales por cuenta de la empresa, deben estar regulados por un contrato de encargo con obligaciones de confidencialidad y seguridad.",
        "Delegar el tratamiento a un proveedor no traslada la responsabilidad: la empresa sigue respondiendo ante la Agencia y ante los titulares por lo que ese tercero haga con los datos, salvo que exista un contrato que fije las obligaciones del proveedor y permita exigirle cumplimiento.",
      ],
      list: {
        ordered: false,
        items: [
          "Inventariar todos los proveedores que tratan datos personales por cuenta de la empresa (hosting, pagos, correo, analítica, soporte, IA de terceros).",
          "Firmar o anexar una cláusula de encargo con cada uno, fijando finalidad, medidas de seguridad y destino de los datos al término.",
          "Exigir contractualmente que el proveedor notifique cualquier incidente de seguridad que afecte los datos tratados.",
        ],
      },
    },
    {
      heading: "Decisiones automatizadas y el derecho a revisión humana",
      paragraphs: [
        "Muchas empresas B2B y startups construyen su propuesta de valor sobre algoritmos que automatizan decisiones: scoring de leads, priorización de candidatos, precios dinámicos, aprobación o rechazo automático de solicitudes. El Art. 8° bis reconoce el derecho del titular a no ser objeto de decisiones basadas únicamente en tratamiento automatizado cuando esas decisiones tienen efectos significativos sobre la persona, y a ser informado, obtener una explicación y solicitar la intervención de una persona.",
        "Cuando un sistema decide solo —un crédito, una postulación, un precio—, no informar ese hecho convierte cada decisión automatizada en un reclamo potencial, con un efecto que se multiplica por el volumen de decisiones que procesa la plataforma. Para una empresa cuyo producto es justamente la automatización a escala, este es uno de los riesgos de cumplimiento más relevantes.",
      ],
      list: {
        ordered: false,
        items: [
          "Informar al titular, en el punto de la decisión y en la política de tratamiento, que existe un tratamiento automatizado y en qué se basa a grandes rasgos.",
          "Habilitar una vía simple y publicada para que la persona pida que un humano revise la decisión, exprese su punto de vista y reciba una explicación.",
          "Documentar el procedimiento de revisión humana en la política de tratamiento.",
        ],
      },
    },
    {
      heading: "Cuándo se requiere una Evaluación de Impacto (EIPD)",
      paragraphs: [
        "El Art. 15 ter exige una Evaluación de Impacto en Protección de Datos (EIPD) previa y documentada para los tratamientos de alto riesgo: decisiones automatizadas con efectos significativos, tratamiento de datos a gran escala, monitoreo sistemático o tratamiento de datos sensibles. Una plataforma SaaS que procesa datos de miles de usuarios finales de sus clientes, o que automatiza decisiones con impacto relevante sobre las personas, suele encontrarse dentro de este supuesto.",
        "Implementar un tratamiento de alto riesgo sin evaluar antes su impacto significa avanzar a ciegas: los problemas se detectan recién cuando ya afectaron a personas concretas. La EIPD es, además, la primera evidencia de diligencia que la Agencia pedirá si se abre una fiscalización o un reclamo sobre un tratamiento de este tipo.",
      ],
      list: {
        ordered: true,
        items: [
          "Identificar qué tratamientos de la empresa califican como de alto riesgo (decisiones automatizadas relevantes, escala, datos sensibles, monitoreo).",
          "Completar la EIPD antes de seguir operando ese tratamiento: describir el tratamiento, evaluar necesidad y proporcionalidad, identificar riesgos para las personas.",
          "Aplicar las medidas de mitigación que la evaluación identifique, con responsable y plazo asignados.",
          "Revisar la EIPD cuando el tratamiento cambie de forma relevante.",
        ],
      },
    },
    {
      heading: "Por dónde empezar si la empresa está en etapa temprana de cumplimiento",
      paragraphs: [
        "La mayoría de las empresas B2B, SaaS y startups llegan a la Ley 21.719 con un producto y un equipo comercial ya en marcha, pero sin haber ordenado formalmente cómo tratan los datos personales que su actividad implica. El punto de partida no es distinto al de cualquier organización: entender qué datos se tratan, con qué rol (responsable o encargado) y con qué base contractual, y a partir de ahí priorizar los contratos de encargo —con clientes y con proveedores— antes que cualquier otro frente.",
      ],
      list: {
        ordered: true,
        items: [
          "Mapear los tratamientos de la empresa distinguiendo cuáles son como responsable y cuáles como encargado de sus clientes.",
          "Priorizar la firma de contratos de encargo, tanto con clientes como con proveedores propios.",
          "Revisar si algún producto o funcionalidad implica decisiones automatizadas con efectos significativos.",
          "Evaluar si algún tratamiento califica como de alto riesgo y requiere una EIPD.",
        ],
      },
    },
  ],
  faq: [
    {
      q: "¿Una empresa SaaS es responsable o encargada de tratamiento?",
      a: "Depende del dato. Respecto de los datos que sus clientes cargan en la plataforma (contactos, usuarios, postulantes), la empresa SaaS suele actuar como encargada de tratamiento, siguiendo instrucciones del cliente. Respecto de sus propios datos operativos —empleados, prospectos comerciales, usuarios de su propio sitio— actúa como responsable.",
    },
    {
      q: "¿Qué debe tener el contrato con un cliente cuyos datos tratamos?",
      a: "Conforme al Art. 15 bis, debe fijar el objeto y la duración del encargo, la finalidad del tratamiento, las medidas de seguridad aplicables, el régimen de subcontratación y el destino de los datos al terminar el servicio (devolución, migración o eliminación).",
    },
    {
      q: "¿Necesitamos contratos de encargo con nuestros propios proveedores (hosting, pagos, correo)?",
      a: "Sí. Si esos proveedores tratan datos personales por cuenta de la empresa, el Art. 15 bis exige un contrato de encargo con obligaciones de confidencialidad y seguridad. Delegar el tratamiento no traslada la responsabilidad de la empresa ante la Agencia ni ante los titulares.",
    },
    {
      q: "¿Qué pasa si nuestro producto toma decisiones automatizadas, como scoring o precios dinámicos?",
      a: "El Art. 8° bis exige informar al titular que existe una decisión automatizada, explicarle en qué se basa a grandes rasgos y ofrecerle una vía para solicitar la revisión de un humano cuando esa decisión tiene efectos significativos sobre la persona.",
    },
    {
      q: "¿Cuándo una startup necesita hacer una EIPD?",
      a: "Cuando el tratamiento califica como de alto riesgo según el Art. 15 ter: decisiones automatizadas con efectos significativos, tratamiento de datos a gran escala, monitoreo sistemático o tratamiento de datos sensibles. La EIPD debe ser previa al tratamiento y quedar documentada.",
    },
  ],
  related: ["ley-21719", "que-es-el-rat", "notificacion-brechas-seguridad"],
  author: {
    name: "Equipo legal de Kromi Privacy Center",
    credential: "Especialistas en protección de datos (Ley 21.719)",
  },
  datePublished: "2026-07-24",
  dateModified: "2026-07-24",
  reviewed: true,
};
