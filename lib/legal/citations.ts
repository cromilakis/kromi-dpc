/**
 * Catálogo de citas legales (mejora 2026-07-21): convierte las referencias de
 * artículos/normas usadas en el catálogo de brechas (campo `articles`) en
 * citas navegables — nombre completo de la norma, resumen breve y link al
 * texto oficial en Ley Chile (BCN) u organismo correspondiente.
 *
 * ⚠️ Los resúmenes son REFERENCIALES (no texto oficial) y BORRADOR PENDIENTE
 * DE REVISIÓN LEGAL, igual que breach-content.ts. Los idNorma de BCN están
 * verificados: 21.719→1209272, 20.584→1039348, Dto. 41→1046753, Seguridad
 * Privada (21.659)→1202067, CT→207436 (los ya usados por el footer).
 *
 * Lib PURA e importable desde el cliente (alimenta el chip interactivo
 * components/legal/citation-chip.tsx).
 */

export interface LegalCitation {
  /** Nombre completo de la norma para el panel. */
  norm: string;
  /** Resumen referencial (no oficial) de qué dice lo citado. */
  summary: string;
  /** URL del texto oficial (Ley Chile/BCN u organismo). */
  url: string;
}

const LEYCHILE = "https://www.bcn.cl/leychile/navegar?idNorma=";
const LEY_21719 = `${LEYCHILE}1209272`;
const LEY_20584 = `${LEYCHILE}1039348`;
const CODIGO_TRABAJO = `${LEYCHILE}207436`;
const CODIGO_PENAL = `${LEYCHILE}1984`;
const LGB_DFL3 = `${LEYCHILE}83324`;
const SEG_PRIVADA = `${LEYCHILE}1202067`;
const DTO_41 = `${LEYCHILE}1046753`;
const CMF_NORMATIVA = "https://www.cmfchile.cl/institucional/legislacion_normativa/";
const DT_LEGISLACION = "https://www.dt.gob.cl/legislacion/";

const L21719 = "Ley 21.719 — Protección de Datos Personales";

/**
 * Claves NORMALIZADAS (sin paréntesis aclaratorios): normalizeArticleRef()
 * reduce "Art. 3° letra c) (proporcionalidad)" → "Art. 3° letra c)".
 */
const CITATIONS: Record<string, LegalCitation> = {
  // --- Ley 21.719 (Ley 19.628 reformada) ---
  "Art. 3° letra b)": {
    norm: `${L21719}, Art. 3° letra b`,
    summary:
      "Principio de finalidad: los datos deben recolectarse para fines determinados, explícitos y lícitos, y no pueden tratarse después para fines incompatibles con los informados.",
    url: LEY_21719,
  },
  "Art. 3° letra c)": {
    norm: `${L21719}, Art. 3° letra c`,
    summary:
      "Principio de proporcionalidad (minimización): solo pueden tratarse los datos estrictamente necesarios para la finalidad declarada.",
    url: LEY_21719,
  },
  "Art. 3° letra e)": {
    norm: `${L21719}, Art. 3° letra e`,
    summary:
      "Principio de responsabilidad: quien trata datos debe cumplir la ley y PODER DEMOSTRARLO, con medidas y evidencia (accountability).",
    url: LEY_21719,
  },
  "Arts. 4° a 11": {
    norm: `${L21719}, Arts. 4° a 11 (Título I)`,
    summary:
      "Los derechos del titular: acceso, rectificación, supresión, oposición, portabilidad y bloqueo, con respuesta en 30 días corridos y de forma gratuita. Si la respuesta no satisface, se puede reclamar ante la Agencia.",
    url: LEY_21719,
  },
  "Art. 8° bis": {
    norm: `${L21719}, Art. 8° bis`,
    summary:
      "Decisiones automatizadas: derecho a no ser objeto de decisiones basadas únicamente en tratamiento automatizado con efectos significativos, a ser informado, obtener explicación y pedir la intervención de una persona.",
    url: LEY_21719,
  },
  "Art. 8° letra b)": {
    norm: `${L21719}, Art. 8° letra b`,
    summary:
      "Derecho de oposición: el titular puede oponerse al tratamiento de sus datos para marketing directo, y el responsable debe cesar ese uso.",
    url: LEY_21719,
  },
  "Art. 12": {
    norm: `${L21719}, Art. 12`,
    summary:
      "El consentimiento debe ser libre, informado, específico e inequívoco, y el titular puede revocarlo en cualquier momento. El responsable debe poder acreditar que lo obtuvo.",
    url: LEY_21719,
  },
  "Art. 14": {
    norm: `${L21719}, Art. 14`,
    summary:
      "Obligaciones generales del responsable: informar al titular, tratar los datos con licitud y limitar su conservación al tiempo necesario para la finalidad (letra d).",
    url: LEY_21719,
  },
  "Art. 14 letra d)": {
    norm: `${L21719}, Art. 14 letra d`,
    summary:
      "Conservación limitada: los datos deben suprimirse o anonimizarse cuando ya no sean necesarios para la finalidad que justificó su tratamiento.",
    url: LEY_21719,
  },
  "Art. 14 bis": {
    norm: `${L21719}, Art. 14 bis`,
    summary:
      "Deber de informar al momento de recolectar los datos: el titular debe saber quién los trata, para qué y cómo ejercer sus derechos, desde el primer contacto.",
    url: LEY_21719,
  },
  "Art. 14 ter": {
    norm: `${L21719}, Art. 14 ter`,
    summary:
      "El deber de información permanente: una política de tratamiento pública con 12 contenidos mínimos (responsable, finalidades, bases de licitud, destinatarios, plazos, derechos, transferencias, decisiones automatizadas, entre otros).",
    url: LEY_21719,
  },
  "Art. 14 ter letra b)": {
    norm: `${L21719}, Art. 14 ter letra b`,
    summary:
      "La política de tratamiento debe identificar al responsable y a quien ejerza el rol de encargado de prevención dentro de la organización.",
    url: LEY_21719,
  },
  "Art. 14 ter letra h)": {
    norm: `${L21719}, Art. 14 ter letra h`,
    summary:
      "Transferencias internacionales: se debe informar si los datos se transfieren al extranjero, el país de destino y el nivel adecuado de protección o las garantías adoptadas.",
    url: LEY_21719,
  },
  "Art. 14 quáter": {
    norm: `${L21719}, Art. 14 quáter`,
    summary:
      "Deber de reserva y protección en el tratamiento: los datos deben tratarse con confidencialidad y resguardo adecuados a su naturaleza.",
    url: LEY_21719,
  },
  "Art. 14 quinquies": {
    norm: `${L21719}, Art. 14 quinquies`,
    summary:
      "Medidas de seguridad: el responsable debe aplicar medidas técnicas y organizativas apropiadas al riesgo (control de accesos, cifrado, respaldos, trazabilidad) para asegurar confidencialidad, integridad y disponibilidad.",
    url: LEY_21719,
  },
  "Art. 14 sexies": {
    norm: `${L21719}, Art. 14 sexies`,
    summary:
      "Vulneraciones de seguridad: ante una filtración, pérdida o acceso no autorizado con riesgo razonable, se debe reportar a la Agencia por los medios más expeditos y sin dilaciones indebidas; si afecta datos sensibles, de menores de 14 años o financieros, también a los titulares. Exige registro de incidentes.",
    url: LEY_21719,
  },
  "Art. 15": {
    norm: `${L21719}, Art. 15`,
    summary:
      "Cesión de datos: comunicar datos personales a otra entidad para sus propios fines requiere el consentimiento del titular u otra base legal, y debe constar por escrito.",
    url: LEY_21719,
  },
  "Art. 15 bis": {
    norm: `${L21719}, Art. 15 bis`,
    summary:
      "Encargo de tratamiento: cuando un tercero trata datos por cuenta del responsable, debe existir un contrato escrito que fije objeto, finalidad, medidas de seguridad, régimen de subcontratación y destino de los datos al término.",
    url: LEY_21719,
  },
  "Art. 15 ter": {
    norm: `${L21719}, Art. 15 ter`,
    summary:
      "Evaluación de Impacto (EIPD): obligatoria y previa para tratamientos de alto riesgo — decisiones automatizadas con efectos significativos, tratamiento a gran escala, monitoreo sistemático de zonas públicas o datos sensibles.",
    url: LEY_21719,
  },
  "Art. 16": {
    norm: `${L21719}, Art. 16`,
    summary:
      "Datos sensibles: regla general de prohibición de tratamiento, salvo consentimiento expreso del titular u otra habilitación legal específica.",
    url: LEY_21719,
  },
  "Art. 16 bis": {
    norm: `${L21719}, Art. 16 bis`,
    summary:
      "Datos de salud y perfil biológico: régimen reforzado — su tratamiento exige habilitaciones específicas y garantías adicionales de confidencialidad.",
    url: LEY_21719,
  },
  "Art. 16 ter": {
    norm: `${L21719}, Art. 16 ter`,
    summary:
      "Datos biométricos (huella, rostro, voz): se debe informar al titular el sistema usado, la finalidad y el plazo de conservación; el consentimiento debe ser libre — en contextos como el laboral, eso exige ofrecer una alternativa.",
    url: LEY_21719,
  },
  "Art. 16 quáter": {
    norm: `${L21719}, Art. 16 quáter`,
    summary:
      "Niños, niñas y adolescentes: tratar datos de menores de 14 años requiere la autorización de su padre, madre o representante legal, y siempre atendiendo a su interés superior.",
    url: LEY_21719,
  },
  // --- Normas conexas ---
  "Art. 154 bis Código del Trabajo": {
    norm: "Código del Trabajo, Art. 154 bis",
    summary:
      "El empleador debe mantener RESERVA de toda la información y datos privados del trabajador a los que acceda con ocasión de la relación laboral.",
    url: CODIGO_TRABAJO,
  },
  "Art. 2 Código del Trabajo": {
    norm: "Código del Trabajo, Art. 2",
    summary:
      "No discriminación laboral: se prohíben las distinciones o exclusiones que no se basen en la capacidad o idoneidad para el cargo — pedir datos ajenos al cargo en la selección puede configurarla.",
    url: CODIGO_TRABAJO,
  },
  "Art. 161-A Código Penal": {
    norm: "Código Penal, Art. 161-A",
    summary:
      "Sanciona penalmente captar, grabar o difundir imágenes o comunicaciones privadas en recintos particulares o lugares no de libre acceso, sin consentimiento del afectado.",
    url: CODIGO_PENAL,
  },
  "Art. 154 DFL 3/1997": {
    norm: "Ley General de Bancos (DFL 3/1997), Art. 154",
    summary:
      "Secreto bancario: las operaciones de los clientes están sujetas a reserva y solo pueden revelarse con consentimiento del titular o en los casos que la ley autoriza.",
    url: LGB_DFL3,
  },
  "Ley 20.584 Arts. 12-15": {
    norm: "Ley 20.584 — Derechos y Deberes de los Pacientes, Arts. 12 a 15",
    summary:
      "La ficha clínica es información reservada: solo accede el equipo tratante y quienes la ley autoriza; el paciente tiene derecho a obtener copia de su ficha.",
    url: LEY_20584,
  },
  "Dto. 41/2013 MINSAL": {
    norm: "Decreto 41 MINSAL — Reglamento sobre Fichas Clínicas",
    summary:
      "Reglamenta la ficha clínica: conservación mínima de 15 años desde la última atención, acceso por perfiles y registro de quienes acceden.",
    url: DTO_41,
  },
  "DFL 3/2025": {
    norm: "Ley de Seguridad Privada (Ley 21.659; texto refundido DFL 3/2025)",
    summary:
      "Regula la videovigilancia privada: aviso de la existencia de cámaras, finalidad legítima y conservación limitada de las grabaciones (30 días como referencia operativa).",
    url: SEG_PRIVADA,
  },
  "NCG 461 CMF": {
    norm: "Norma de Carácter General N° 461 — CMF",
    summary:
      "Exigencias de la Comisión para el Mercado Financiero sobre gestión de riesgos y seguridad de la información en la industria financiera, incluida la protección de los datos de clientes.",
    url: CMF_NORMATIVA,
  },
  "Dictámenes DT": {
    norm: "Dictámenes de la Dirección del Trabajo",
    summary:
      "Criterios administrativos de la DT sobre control laboral: el monitoreo (correo, videovigilancia, biometría) debe ser general, proporcional, informado a los trabajadores y no dirigido a vigilar a una persona específica.",
    url: DT_LEGISLACION,
  },
};

/**
 * Normaliza una referencia del catálogo a su clave de cita: recorta los
 * paréntesis aclaratorios finales ("(12 literales)", "(principio de …)").
 */
export function normalizeArticleRef(ref: string): string {
  return ref.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export function getCitation(ref: string): LegalCitation | null {
  return CITATIONS[normalizeArticleRef(ref)] ?? null;
}
