/**
 * RUT chileno — utilidades PURAS de validación y formato (módulo empresas).
 * Algoritmo módulo 11 estándar: dígito verificador con pesos cíclicos 2..7
 * sobre el cuerpo invertido; 11 → "0", 10 → "K".
 *
 * Sin dependencias ni I/O: testeable en aislamiento (test/companies.test.ts).
 * Importable desde cliente (el formato del RUT es información pública; los
 * pesos del Complexity Score NO viven acá — ver scoring.server.ts).
 */

/** Cuerpo válido: 7 u 8 dígitos (rango real de RUT de personas/empresas). */
const RUT_BODY_PATTERN = /^\d{7,8}$/;

/** Quita puntos/guiones/espacios y normaliza la K a mayúscula. */
export function normalizeRut(raw: string): string {
  return raw.replace(/[.\-\s]/g, "").toUpperCase();
}

/** Dígito verificador (módulo 11) para un cuerpo numérico dado. */
export function computeRutDv(body: string): string {
  let sum = 0;
  let weight = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * weight;
    weight = weight === 7 ? 2 : weight + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

/**
 * ¿Es un RUT válido? Acepta con o sin puntos/guion ("76421905-5",
 * "76.421.905-5", "764219055"). Exige cuerpo de 7-8 dígitos y DV correcto.
 */
export function isValidRut(raw: string): boolean {
  const normalized = normalizeRut(raw);
  if (normalized.length < 8 || normalized.length > 9) return false;
  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  if (!RUT_BODY_PATTERN.test(body)) return false;
  return computeRutDv(body) === dv;
}

/**
 * Formato canónico de persistencia/UI: "76.421.905-K" (mismo formato que el
 * seed demo). Precondición: isValidRut(raw) === true; si no, devuelve el
 * input normalizado tal cual (nunca lanza — el llamador valida antes).
 */
export function formatRut(raw: string): string {
  const normalized = normalizeRut(raw);
  if (!isValidRut(normalized)) return normalized;
  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${dotted}-${dv}`;
}
