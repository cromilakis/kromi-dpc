/**
 * Sanitiza el parámetro ?next= del flujo de login (anti open-redirect):
 * solo se aceptan rutas internas de la plataforma (/app…). Cualquier otra
 * cosa (URLs absolutas, protocol-relative //, backslashes) cae al fallback.
 * Pura y fuera del archivo "use server" (esos módulos solo exportan async
 * functions) para poder testearla y reusarla desde el middleware.
 */
export const DEFAULT_APP_PATH = "/app";

export function safeNextPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_APP_PATH;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_APP_PATH;
  }
  if (
    next === DEFAULT_APP_PATH ||
    next.startsWith(`${DEFAULT_APP_PATH}/`) ||
    next.startsWith(`${DEFAULT_APP_PATH}?`)
  ) {
    return next;
  }
  return DEFAULT_APP_PATH;
}
