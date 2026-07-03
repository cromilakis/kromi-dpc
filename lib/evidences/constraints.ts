/**
 * Restricciones de archivos de evidencia — ESPEJO del bucket privado
 * 'evidences' (supabase/migrations/20260702100300_storage.sql: 50 MiB,
 * MIME de documentos). Compartido entre el form de subida (pre-validación
 * con feedback inmediato) y la server action uploadEvidence (validación
 * autoritativa); el bucket vuelve a validar en Storage (defensa en capas).
 * Sin "server-only": no hay nada secreto (los límites son visibles en la UI).
 */

/** 50 MiB — file_size_limit del bucket. */
export const EVIDENCE_MAX_FILE_BYTES = 52_428_800;

/** allowed_mime_types del bucket (pdf, imágenes, office, csv). */
export const EVIDENCE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

/** Valor para el atributo accept del input file. */
export const EVIDENCE_ACCEPT_ATTRIBUTE = EVIDENCE_ALLOWED_MIME_TYPES.join(",");

export function isAllowedEvidenceMimeType(type: string): boolean {
  return (EVIDENCE_ALLOWED_MIME_TYPES as readonly string[]).includes(type);
}

/**
 * Sanitiza un nombre de archivo para usarlo en la ruta de Storage y como
 * nombre de la evidencia (clave del versionado por (empresa, nombre)):
 * descarta rutas (path traversal), quita diacríticos, colapsa todo lo que no
 * sea [A-Za-z0-9._-] a '_' y acota el largo preservando la extensión.
 */
export function sanitizeEvidenceFileName(fileName: string): string {
  // Solo el nombre base: neutraliza separadores de ruta ('../', 'C:\…').
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const normalized = base
    .normalize("NFD")
    // Combining marks U+0300–U+036F literales (diacríticos que separa NFD).
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    // Sin puntos al inicio (ocultos/relativos) ni guiones bajos colgantes.
    .replace(/^[._]+/, "")
    .replace(/_+$/, "");
  if (!normalized) return "documento";

  const MAX_LENGTH = 100;
  if (normalized.length <= MAX_LENGTH) return normalized;
  const dot = normalized.lastIndexOf(".");
  if (dot > 0 && normalized.length - dot <= 12) {
    const extension = normalized.slice(dot);
    return normalized.slice(0, MAX_LENGTH - extension.length) + extension;
  }
  return normalized.slice(0, MAX_LENGTH);
}
