/**
 * Helper puro (sin I/O) que deriva el "estado" legible del certificado del
 * cliente a partir de `status` + `valid_until`. Reusado por el loader del
 * dashboard (`load-dashboard.server.ts`) y por la UI de `/portal` (Fase 1).
 * Recibe `today` como parámetro (nunca `Date.now()` interno) para ser
 * determinístico y testeable.
 */

/** Días antes de `valid_until` en que el certificado pasa a "por vencer". */
export const EXPIRY_WARNING_DAYS = 60;

export type CertStanding =
  | "vigente"
  | "por_vencer"
  | "vencida"
  | "revocada"
  | "sin_certificado";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function certificateStanding(
  cert: { status: string; valid_until: string } | null,
  today: string,
): CertStanding {
  if (!cert) return "sin_certificado";
  if (cert.status === "revoked") return "revocada";

  const validUntil = new Date(cert.valid_until);
  const todayDate = new Date(today);

  if (cert.status === "expired" || validUntil < todayDate) return "vencida";

  const daysRemaining = Math.round(
    (validUntil.getTime() - todayDate.getTime()) / MS_PER_DAY,
  );
  if (daysRemaining <= EXPIRY_WARNING_DAYS) return "por_vencer";

  return "vigente";
}
