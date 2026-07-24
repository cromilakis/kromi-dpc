import type { ResourceArticle } from "../types";

/**
 * Cifras y tramos de este artículo provienen de lib/legal/decision-tree.ts
 * (UTM_CLP, FINE_RANGES) — la fuente de verdad que usa el motor de
 * diagnóstico de KPC para estimar exposición económica. NO son los tramos
 * oficiales de sanciones de la Ley 21.719 (que se listan como "leves",
 * "graves" y "gravísimas" en el título de infracciones); son la
 * clasificación de severidad propia de la herramienta (crítico/alto/medio/
 * bajo) traducida a un rango estimado en UTM y CLP.
 * // REVISAR: confirmar con el equipo legal la correspondencia exacta entre
 * esta clasificación interna (crítico/alto/medio/bajo) y las categorías
 * oficiales de infracción de la Ley 21.719 (leves/graves/gravísimas), y si
 * corresponde citar el artículo específico del título sancionatorio.
 */
export const MULTAS_LEY_21719: ResourceArticle = {
  slug: "multas-ley-21719",
  type: "satelite",
  title: "Multas de la Ley 21.719: montos, tramos y quién sanciona",
  metaTitle: "Multas ley 21.719: montos en UTM y quién puede sancionar",
  description:
    "Quién aplica las multas de la Ley 21.719, cómo se clasifican las infracciones y qué montos (en UTM) puede llegar a pagar tu empresa. Guía práctica para reducir el riesgo.",
  keyword: "multas ley 21.719",
  summary:
    "La Agencia de Protección de Datos Personales es el organismo que fiscaliza y sanciona los incumplimientos de la Ley 21.719. Según la severidad de la infracción, las multas estimadas van desde unas pocas centenas hasta 20.000 UTM. El monto exacto depende de factores como la gravedad del daño, la reincidencia y la diligencia demostrada por la empresa.",
  sections: [
    {
      heading: "¿Quién sanciona los incumplimientos de la Ley 21.719?",
      paragraphs: [
        "La Agencia de Protección de Datos Personales es el organismo público con potestad fiscalizadora y sancionadora sobre el tratamiento de datos personales en Chile. Puede iniciar un procedimiento sancionatorio de oficio o a partir de una denuncia de un titular que no obtuvo respuesta satisfactoria a un ejercicio de sus derechos.",
        "Si una persona ejerce sus derechos de acceso, rectificación, supresión, oposición, portabilidad o bloqueo y la empresa no responde en el plazo legal o la respuesta no la satisface, puede reclamar ante la Agencia. Las resoluciones de la Agencia, a su vez, pueden ser reclamadas ante los tribunales de justicia.",
      ],
      list: {
        ordered: false,
        items: [
          "Fiscaliza el cumplimiento de la ley (Arts. 4° a 11, sobre los derechos del titular).",
          "Recibe los reportes obligatorios de vulneraciones de seguridad (Art. 14 sexies).",
          "Instruye procedimientos sancionatorios y aplica multas.",
          "Sus resoluciones son reclamables ante los tribunales.",
        ],
      },
    },
    {
      heading: "Clasificación de la infracción: de qué depende el monto",
      paragraphs: [
        "La Ley 21.719 distingue niveles de gravedad para las infracciones, y el monto de la multa aplicable depende de esa clasificación. El diagnóstico de KPC estima la severidad de cada brecha detectada en cuatro niveles —crítico, alto, medio y bajo— según el tipo de dato involucrado, la probabilidad de daño y el artículo infringido.",
        "Esta clasificación por severidad es la que usa la herramienta de autoevaluación para estimar el rango de exposición económica de una empresa; no reemplaza la calificación formal que haga la Agencia en un procedimiento sancionatorio concreto, que evalúa cada caso según sus propios criterios.",
      ],
      list: {
        ordered: false,
        items: [
          "Crítico: brechas con alto potencial de daño (p. ej. datos sensibles o de salud sin base de licitud, ausencia de medidas de seguridad frente a información de alto riesgo).",
          "Alto: incumplimientos relevantes de deberes centrales (p. ej. falta de contrato de encargo de tratamiento, ausencia de EIPD donde corresponde).",
          "Medio: brechas de gestión y documentación (p. ej. política de tratamiento incompleta, RAT desactualizado).",
          "Bajo: incumplimientos formales o de menor impacto potencial.",
        ],
      },
    },
    {
      heading: "Montos y tramos de multa (en UTM)",
      paragraphs: [
        "Los siguientes tramos corresponden a la estimación en UTM que usa el motor de diagnóstico de KPC para cada nivel de severidad, convertidos a pesos chilenos con el valor de referencia de la UTM de julio de 2026 (aproximado, se actualiza anualmente). Son una referencia de exposición potencial, no el monto final que fije la Agencia en un caso concreto.",
      ],
      list: {
        ordered: false,
        items: [
          "Severidad crítica: 5.000 a 20.000 UTM ($336.470.000 – $1.345.880.000 aprox.).",
          "Severidad alta: 2.000 a 10.000 UTM ($134.588.000 – $672.940.000 aprox.).",
          "Severidad media: 500 a 5.000 UTM ($33.647.000 – $336.470.000 aprox.).",
          "Severidad baja: 100 a 2.000 UTM ($6.729.400 – $134.588.000 aprox.).",
        ],
      },
    },
    {
      heading: "Factores que agravan o atenúan una sanción",
      paragraphs: [
        "El principio de responsabilidad (Art. 3° letra e) exige que la empresa no solo cumpla la ley, sino que pueda demostrarlo. En la práctica, ese principio es también la mejor defensa frente a una eventual sanción: la evidencia de diligencia (políticas, contratos, registros, medidas de seguridad) puede atenuar la responsabilidad, mientras que su ausencia la agrava.",
        // REVISAR: la ley puede establecer una lista cerrada de agravantes y
        // atenuantes en el título de infracciones y sanciones; verificar
        // artículo exacto y contenido antes de publicar con carácter normativo.
      ],
      list: {
        ordered: false,
        items: [
          "Agravan: reincidencia, tratamiento de datos sensibles o de menores de 14 años sin habilitación (Arts. 16, 16 bis y 16 quáter), volumen o gravedad del daño causado a los titulares, falta de reporte oportuno de una vulneración de seguridad (Art. 14 sexies).",
          "Atenúan: adopción proactiva de medidas de seguridad (Art. 14 quinquies), reporte oportuno y colaboración con la Agencia ante un incidente, evidencia de un programa de cumplimiento vigente (RAT, políticas, contratos de encargo).",
        ],
      },
    },
    {
      heading: "Cómo reducir el riesgo de una multa",
      paragraphs: [
        "La forma más efectiva de reducir el riesgo de sanción es construir y documentar un programa de cumplimiento antes de que ocurra un incidente o una fiscalización, no después.",
      ],
      list: {
        ordered: true,
        items: [
          "Mantener actualizado el Registro de Actividades de Tratamiento (RAT).",
          "Contar con una política de tratamiento pública con los contenidos mínimos exigidos (Art. 14 ter).",
          "Firmar contratos de encargo de tratamiento con todos los proveedores que procesen datos por cuenta de la empresa (Art. 15 bis).",
          "Aplicar medidas de seguridad proporcionales al riesgo (Art. 14 quinquies) y tener un protocolo de respuesta ante vulneraciones (Art. 14 sexies).",
          "Hacer una Evaluación de Impacto (EIPD) cuando el tratamiento sea de alto riesgo (Art. 15 ter).",
          "Ejecutar la autoevaluación gratuita de KPC para identificar brechas y priorizar el plan de adecuación antes de la entrada en vigencia de la ley.",
        ],
      },
    },
  ],
  faq: [
    {
      q: "¿Cuál es la multa máxima que puede aplicar la Agencia bajo la Ley 21.719?",
      a: "Según la estimación del motor de diagnóstico de KPC, las brechas de severidad crítica pueden implicar una exposición de hasta 20.000 UTM (aprox. $1.345.880.000 con el valor de julio de 2026). El monto final en un caso real lo determina la Agencia según la gravedad concreta de la infracción.",
    },
    {
      q: "¿Quién puede aplicar una multa por incumplir la Ley 21.719?",
      a: "La Agencia de Protección de Datos Personales, que fiscaliza el cumplimiento, instruye procedimientos sancionatorios y aplica las multas. Sus resoluciones pueden reclamarse ante los tribunales de justicia.",
    },
    {
      q: "¿Una empresa pequeña también puede ser multada?",
      a: "Sí. La ley no distingue por tamaño de empresa: aplica a toda organización que trate datos personales, y el riesgo de sanción depende de la gravedad del incumplimiento, no del tamaño de quien lo comete.",
    },
    {
      q: "¿Qué se considera al fijar el monto de una multa?",
      a: "La severidad del incumplimiento (tipo de dato afectado, artículo infringido, probabilidad e impacto del daño) y factores como la reincidencia, la diligencia previa de la empresa y su colaboración con la Agencia ante un incidente.",
    },
    {
      q: "¿Reportar una filtración de datos a tiempo reduce el riesgo de multa?",
      a: "El Art. 14 sexies obliga a reportar a la Agencia una vulneración de seguridad sin dilaciones indebidas. Hacerlo oportunamente, junto con evidencia de las medidas de seguridad aplicadas, es un factor que puede atenuar la responsabilidad frente a no reportar o hacerlo tardíamente.",
    },
  ],
  related: ["ley-21719", "entrada-en-vigencia-ley-21719", "que-es-el-rat"],
  author: {
    name: "Equipo legal de Kromi Privacy Center",
    credential: "Especialistas en protección de datos (Ley 21.719)",
  },
  datePublished: "2026-07-24",
  dateModified: "2026-07-24",
  reviewed: true,
};
