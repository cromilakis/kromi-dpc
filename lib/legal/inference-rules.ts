/**
 * Reglas de inferencia — detectan brechas que el usuario no declaró
 * explícitamente, cruzando dos o más respuestas del screening.
 *
 * Cada regla tiene condiciones que deben cumplirse TODAS para activarse,
 * y una brecha asociada que se agrega al resultado del diagnóstico.
 *
 * Las reglas se ejecutan después del screening y antes de mostrar
 * el resultado. Son pura lógica: sin I/O, sin efectos secundarios.
 */

import type { InferenceRule } from "./decision-tree";
import { SCREENING_BREACHES } from "./screening-nodes";

const B = SCREENING_BREACHES;

export const INFERENCE_RULES: InferenceRule[] = [
  // =========================================================================
  // Datos sensibles + nube personal = brecha crítica de seguridad
  // =========================================================================
  {
    id: "IR-001",
    description:
      "Empresa maneja datos sensibles Y los guarda en nube con cuenta personal → brecha crítica de seguridad",
    conditions: [
      { nodeId: "S-004", answer: "si" },
      { nodeId: "S-007", answer: "personal" },
    ],
    breach: B["B-SEG-002"],
  },
  {
    id: "IR-002",
    description:
      "Empresa no sabe si maneja datos sensibles Y usa nube con cuenta personal → brecha alta de seguridad",
    conditions: [
      { nodeId: "S-004", answer: "no_seguro" },
      { nodeId: "S-007", answer: "personal" },
    ],
    breach: B["B-SEG-002"],
  },

  // =========================================================================
  // Tiene empleados + usa contador/proveedor externo + no tiene contrato
  // =========================================================================
  {
    id: "IR-003",
    description:
      "Microempresa con proveedores externos → posible brecha de encargo sin contrato",
    conditions: [
      { nodeId: "S-001", answer: "micro" },
      { nodeId: "S-005", answer: "si" },
    ],
    breach: B["B-CON-002"],
  },
  {
    id: "IR-004",
    description:
      "Empresa pequeña con proveedores externos → posible brecha de encargo sin contrato",
    conditions: [
      { nodeId: "S-001", answer: "pequena" },
      { nodeId: "S-005", answer: "si" },
    ],
    breach: B["B-CON-002"],
  },
  {
    id: "IR-005",
    description:
      "Empresa mediana/grande con proveedores externos → brecha de encargo",
    conditions: [
      { nodeId: "S-001", answer: "mediana" },
      { nodeId: "S-005", answer: "si" },
    ],
    breach: B["B-CON-002"],
  },
  {
    id: "IR-006",
    description:
      "Empresa grande con proveedores externos → brecha de encargo",
    conditions: [
      { nodeId: "S-001", answer: "grande" },
      { nodeId: "S-005", answer: "si" },
    ],
    breach: B["B-CON-002"],
  },

  // =========================================================================
  // Datos sensibles + sin política de privacidad = brecha de gobernanza crítica
  // =========================================================================
  {
    id: "IR-006",
    description:
      "Empresa maneja datos sensibles Y no tiene política de privacidad → brecha crítica de transparencia",
    conditions: [
      { nodeId: "S-004", answer: "si" },
      { nodeId: "S-015", answer: "no" },
    ],
    breach: {
      ...B["B-GOB-001"],
      severity: "critico",
      fineRangeUtn: { min: 5_000, max: 20_000 },
    },
  },

  // =========================================================================
  // Sector salud + guarda datos en Excel/papel = brecha de ficha clínica
  // =========================================================================
  {
    id: "IR-007",
    description:
      "Empresa de salud guarda datos de pacientes en Excel o papel → brecha de ficha clínica Ley 20.584",
    conditions: [
      { nodeId: "S-002", answer: "salud" },
      { nodeId: "S-006", answer: "excel_pc" },
    ],
    breach: B["B-SAL-001"],
  },
  {
    id: "IR-008",
    description:
      "Empresa de salud guarda datos en nube compartida → brecha de ficha clínica",
    conditions: [
      { nodeId: "S-002", answer: "salud" },
      { nodeId: "S-006", answer: "nube_compartido" },
    ],
    breach: B["B-SAL-001"],
  },
  {
    id: "IR-009",
    description:
      "Empresa de salud guarda datos en papel → brecha de ficha clínica",
    conditions: [
      { nodeId: "S-002", answer: "salud" },
      { nodeId: "S-006", answer: "papel" },
    ],
    breach: B["B-SAL-001"],
  },

  // =========================================================================
  // Más de 2 años operando + no puede eliminar datos = brecha de conservación
  // =========================================================================
  {
    id: "IR-010",
    description:
      "Empresa lleva más de 2 años Y no sabe eliminar datos → brecha de conservación y derechos ARCO",
    conditions: [
      { nodeId: "S-013", answer: "mas_2_años" },
      { nodeId: "S-014", answer: "no" },
    ],
    breach: B["B-CON-001"],
  },

  // =========================================================================
  // Sector retail + envía marketing + sin política = brecha SERNAC
  // =========================================================================
  {
    id: "IR-011",
    description:
      "Empresa de retail/envía marketing Y no tiene política de privacidad → brecha de transparencia + Ley 19.496",
    conditions: [
      { nodeId: "S-002", answer: "retail" },
      { nodeId: "S-009", answer: "si_marketing" },
      { nodeId: "S-015", answer: "no" },
    ],
    breach: B["B-LEG-001"],
  },

  // =========================================================================
  // No sabe si transfiere datos al extranjero + usa proveedores = brecha
  // =========================================================================
  {
    id: "IR-012",
    description:
      "Empresa no sabe dónde están los servidores Y usa proveedores externos → posible transferencia internacional no documentada",
    conditions: [
      { nodeId: "S-012", answer: "no_se" },
      { nodeId: "S-005", answer: "si" },
    ],
    breach: B["B-TER-002"],
  },

  // =========================================================================
  // Datos sensibles + transferencia internacional = brecha crítica
  // =========================================================================
  {
    id: "IR-013",
    description:
      "Datos sensibles transferidos al extranjero sin garantías documentadas → brecha crítica",
    conditions: [
      { nodeId: "S-004", answer: "si" },
      { nodeId: "S-012", answer: "si" },
    ],
    breach: {
      ...B["B-TER-002"],
      severity: "critico",
      fineRangeUtn: { min: 5_000, max: 20_000 },
    },
  },

  // =========================================================================
  // No tiene política + tiene sitio web = brecha de transparencia
  // =========================================================================
  {
    id: "IR-014",
    description:
      "Empresa con sitio web sin política de privacidad ni aviso al recolectar datos",
    conditions: [
      { nodeId: "S-008", answer: "si" },
      { nodeId: "S-015", answer: "no" },
    ],
    breach: B["B-WEB-001"],
  },

  // =========================================================================
  // Capacitación: más de 3 empleados + sin política = brecha de cultura
  // =========================================================================
  {
    id: "IR-015",
    description:
      "Empresa con varios empleados sin gobernanza documentada → brecha de capacitación y cultura",
    conditions: [
      { nodeId: "S-015", answer: "no" },
    ],
    breach: B["B-CAP-001"],
  },
];
