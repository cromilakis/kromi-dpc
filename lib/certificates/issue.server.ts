import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Emisión de certificados DPC — helpers puros de código, hash y vigencia
 * (spec certificados, risk high). Solo servidor: el algoritmo del código y
 * del hash es interno. Testeado en test/certificates.test.ts.
 *
 * Patrón del código (seed-demo: 'DPC-CA-2026-X7K4QZ'):
 *   DPC-<iniciales de la empresa>-<año>-<6 chars aleatorios base32>
 * El sufijo usa el alfabeto base32 RFC 4648 (A-Z, 2-7) con bytes de
 * crypto.randomBytes: 256 % 32 === 0, por lo que `byte % 32` es uniforme
 * (sin sesgo módulo). 32^6 ≈ 1.07e9 combinaciones por empresa/año.
 */

/** Vigencia del certificado (y de cada revalidación): 12 meses. */
export const CERTIFICATE_VALIDITY_MONTHS = 12;

/** Alfabeto base32 RFC 4648 (sin 0/1/8/9: evita confusión visual O/I/B/g). */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Forma del código emitido (el seed usa 2 iniciales; nosotros hasta 3). */
export const CERTIFICATE_CODE_PATTERN = /^DPC-[A-Z]{2,3}-\d{4}-[A-Z2-7]{6}$/;

/**
 * Iniciales (hasta 3 letras A-Z) del nombre de la empresa, sin diacríticos:
 * primera letra de las primeras 3 palabras; si hay menos palabras se completa
 * con las letras siguientes de la primera palabra; fallback final 'X'.
 * "Clínica Andes Salud" → CAS · "Aurora Pay" → APU · "Kappa" → KAP.
 */
export function companyCodeInitials(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
  const words = normalized.split(/[^A-Z]+/).filter(Boolean);
  let initials = words
    .slice(0, 3)
    .map((word) => word[0]!)
    .join("");
  if (initials.length < 3 && words.length > 0) {
    initials = (initials + words[0]!.slice(initials.length ? 1 : 0))
      .slice(0, 3);
  }
  return initials.padEnd(3, "X").slice(0, 3);
}

/** Sufijo aleatorio criptográfico de 6 chars base32 (RFC 4648). */
function randomBase32(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const byte of bytes) {
    out += BASE32_ALPHABET[byte % 32]!;
  }
  return out;
}

/** Código verificable: DPC-<iniciales>-<año>-<6 base32 crypto>. */
export function generateCertificateCode(
  companyName: string,
  issueYear: number,
): string {
  return `DPC-${companyCodeInitials(companyName)}-${issueYear}-${randomBase32(6)}`;
}

/**
 * Hash de integridad del certificado: sha256(company_id + code + issued_at),
 * con ':' como separador para que la concatenación sea inequívoca (p. ej.
 * ("ab","c") vs ("a","bc")). Cumple el check de BD: 64 hex minúsculas.
 */
export function certificateHash(
  companyId: string,
  code: string,
  issuedAt: string,
): string {
  return createHash("sha256")
    .update(`${companyId}:${code}:${issuedAt}`)
    .digest("hex");
}

/** Fecha actual en formato date de Postgres (YYYY-MM-DD, UTC). */
export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Suma meses calendario a una fecha YYYY-MM-DD en UTC (sin drift de zona
 * horaria). El desborde de fin de mes lo resuelve Date.UTC (29 feb + 12m →
 * 1 mar), siempre > fecha origen, compatible con el check valid_until > issued_at.
 */
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Fecha inválida para addMonths: ${isoDate}`);
  }
  return new Date(Date.UTC(year, month - 1 + months, day))
    .toISOString()
    .slice(0, 10);
}
