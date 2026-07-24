import type { ResourceArticle } from "../types";

export const PROTECCION_DATOS_SALUD: ResourceArticle = {
  slug: "proteccion-datos-salud",
  type: "rubro",
  title: "Protección de datos de pacientes: Ley 21.719 en clínicas y prestadores de salud",
  metaTitle:
    "Protección de datos de pacientes: guía Ley 21.719 para salud (2026)",
  description:
    "Qué exige la Ley 21.719 a clínicas, consultas y prestadores de salud sobre los datos de pacientes, cómo se relaciona con la Ley 20.584 y el Dto. 41 MINSAL, y medidas concretas para cumplir.",
  keyword: "protección de datos pacientes",
  summary:
    "Los datos de salud son datos sensibles y reciben la protección más estricta de la Ley 21.719, con reglas adicionales de la Ley 20.584 y el Dto. 41 MINSAL sobre la ficha clínica. Para clínicas, consultas y prestadores, tratarlos sin las condiciones reforzadas que exige la ley conlleva las sanciones más altas y un daño reputacional serio.",
  sections: [
    {
      heading: "Por qué los datos de salud exigen la máxima protección",
      paragraphs: [
        "Los datos de salud —diagnósticos, tratamientos, resultados de exámenes, antecedentes clínicos— pertenecen a la categoría de datos sensibles: su divulgación indebida puede generar discriminación, estigmatización o un daño grave a la persona titular.",
        "Por eso la Ley 21.719 no los trata como un dato personal más. Un prestador de salud —clínica, consulta médica, laboratorio, centro odontológico— que no aplique las condiciones reforzadas que exige la ley se expone a las sanciones más altas contempladas y a un daño reputacional serio, precisamente por la naturaleza de la información que maneja.",
      ],
    },
    {
      heading: "Qué exige la Ley 21.719 para datos sensibles (Art. 16 y 16 bis)",
      paragraphs: [
        "El Art. 16 establece la regla general: los datos sensibles no pueden tratarse, salvo que exista consentimiento expreso del titular u otra habilitación legal específica. Es una prohibición con excepciones, no una autorización general.",
        "El Art. 16 bis refuerza esta regla para los datos de salud y de perfil biológico: su tratamiento exige habilitaciones específicas y garantías adicionales de confidencialidad, por encima del estándar exigido a otros datos sensibles.",
        "En la práctica, esto significa que un prestador de salud debe tener una base de licitud calificada (consentimiento explícito u otra causal específica, como la propia atención de salud) y medidas de seguridad acordes a esa sensibilidad, no medidas genéricas.",
      ],
    },
    {
      heading: "La ficha clínica: Ley 20.584 y Dto. 41 MINSAL",
      paragraphs: [
        "La ficha clínica tiene además su propio marco regulatorio, complementario a la Ley 21.719. La Ley 20.584 (Derechos y Deberes de los Pacientes, Arts. 12 a 15) establece que la ficha clínica es información reservada: solo puede acceder a ella el equipo tratante y quienes la ley autoriza expresamente, y el paciente tiene derecho a obtener copia de su propia ficha.",
        "El Decreto 41/2013 de MINSAL reglamenta la ficha clínica en detalle: exige conservarla por un mínimo de 15 años desde la última atención, controlar el acceso por perfiles de usuario y llevar un registro de quiénes acceden a cada ficha.",
        "Para un prestador, esto se traduce en dos exigencias que deben convivir: proteger la ficha como dato sensible bajo la Ley 21.719, y cumplir el régimen de acceso restringido y conservación que fijan la Ley 20.584 y el Dto. 41.",
      ],
    },
    {
      heading: "Medidas concretas para un prestador de salud",
      paragraphs: [
        "Cumplir estas exigencias requiere pasar de la intención a controles verificables. Las medidas más relevantes para un prestador de salud son:",
      ],
      list: {
        ordered: true,
        items: [
          "Restringir el acceso a la ficha clínica solo al personal que atiende directamente al paciente, retirando accesos generales o cuentas compartidas.",
          "Migrar los registros clínicos desde Excel o Drive a un sistema de ficha clínica electrónica que controle el acceso por perfil y registre quién consulta cada ficha (por ejemplo Rayen, Medilink, Nubimed o Agendapro).",
          "Conservar las fichas por el plazo legal —15 años desde la última atención, según el Dto. 41/2013— y recabar el consentimiento expreso donde corresponda al tratamiento de datos de salud.",
        ],
      },
    },
    {
      heading: "Consentimiento y casos especiales: menores y datos biométricos",
      paragraphs: [
        "El consentimiento para tratar datos de salud debe ser expreso, no puede presumirse ni inferirse de una conducta pasiva. Cuando el prestador atiende a niños, niñas o adolescentes menores de 14 años, el Art. 16 quáter exige además la autorización de su padre, madre o representante legal, atendiendo siempre al interés superior del menor —una capa adicional de protección que se suma, no reemplaza, a las reglas sobre datos de salud.",
        "Algunos prestadores usan además datos biométricos (huella dactilar, reconocimiento facial) para control de acceso o identificación de pacientes. El Art. 16 ter exige informar al titular el sistema usado, la finalidad y el plazo de conservación, con un consentimiento libre: si se filtran, estos datos no se pueden \"cambiar\" como una contraseña, lo que exige almacenarlos cifrados y con acceso reforzado.",
      ],
    },
  ],
  faq: [
    {
      q: "¿Una consulta médica individual también debe cumplir estas exigencias, o solo las clínicas grandes?",
      a: "La Ley 21.719 no distingue por tamaño: aplica a toda organización que trate datos personales, incluida una consulta individual. El nivel de exigencia es proporcional al riesgo del tratamiento, pero tratarse de datos de salud implica igualmente el régimen reforzado del Art. 16 bis.",
    },
    {
      q: "¿Cuánto tiempo hay que conservar la ficha clínica de un paciente?",
      a: "El Decreto 41/2013 de MINSAL exige conservarla por un mínimo de 15 años desde la última atención registrada.",
    },
    {
      q: "¿Quién puede acceder a la ficha clínica de un paciente?",
      a: "Según la Ley 20.584, solo el equipo tratante y quienes la ley autoriza expresamente. El prestador debe controlar ese acceso por perfiles y registrar quién consulta cada ficha, conforme al Dto. 41 MINSAL.",
    },
    {
      q: "¿Basta con el consentimiento del paciente para tratar sus datos de salud?",
      a: "El consentimiento expreso es una de las bases de licitud que exige el Art. 16 bis, pero no la única: también puede habilitar el tratamiento otra causal legal específica, como la propia atención de salud. Lo que la ley no permite es tratar datos de salud sin ninguna base de licitud.",
    },
    {
      q: "¿Qué pasa si el prestador usa huella digital o reconocimiento facial para identificar pacientes?",
      a: "Ese tratamiento queda sujeto al Art. 16 ter sobre datos biométricos: debe informarse el sistema usado, la finalidad y el plazo de conservación, obtener un consentimiento libre y almacenar los datos cifrados, dado que no pueden reemplazarse si se filtran.",
    },
  ],
  related: ["ley-21719", "que-es-el-rat", "multas-ley-21719"],
  author: {
    name: "Equipo legal de Kromi Privacy Center",
    credential: "Especialistas en protección de datos (Ley 21.719)",
  },
  datePublished: "2026-07-24",
  dateModified: "2026-07-24",
  reviewed: true,
};
