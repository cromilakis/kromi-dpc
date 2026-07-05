"use server";

import {
  DB_ESTIMATED_TIER,
  DB_RISK_FACTOR_TOKENS,
  estimate,
} from "../self-assessment/estimate";
import { leadSubmissionSchema } from "../self-assessment/lead-schema";
import { computeInternalScore } from "../self-assessment/scoring.server";
import { createAdminClient } from "../supabase/admin";

/**
 * Server action del autoevaluador público (/self-assessment): valida con Zod
 * ESTRICTO, recalcula la estimación EN SERVIDOR (jamás se confía en el tramo
 * calculado por el cliente) e inserta el lead en self_assessments vía service
 * role (la tabla no tiene política de INSERT anon a propósito — migración RLS).
 *
 * Anti-abuso (D8): honeypot `website` (si viene con valor se responde ok sin
 * insertar), dedupe por correo en una ventana de 10 minutos y límites de
 * tamaño estrictos en el schema. Rate limiting real por IP → Vercel Firewall
 * en Connect (ver init.md pendientes).
 *
 * Degradación con gracia: si falta el env o el insert falla, se loggea con
 * console.error y se devuelve { ok: false, error: "unavailable" } — la UI
 * mantiene visible el resultado y sugiere WhatsApp.
 */

export type SubmitSelfAssessmentResult =
  | { ok: true }
  | { ok: false; error: "validation" | "unavailable" };

/** Ventana de dedupe por correo: mismo email en <10 min no se reinserta. */
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

export async function submitSelfAssessment(
  input: unknown,
): Promise<SubmitSelfAssessmentResult> {
  const parsed = leadSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    console.error(
      "[self-assessment] payload inválido:",
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.code}`),
    );
    return { ok: false, error: "validation" };
  }

  const {
    sizeTier,
    sectorCode,
    riskFactors,
    contactName,
    contactEmail,
    contactPhone,
    website,
  } = parsed.data;

  // Honeypot: un humano nunca completa el campo oculto. Se responde ok:true
  // SIN insertar para no darle señal al bot de que fue detectado.
  if (website) {
    return { ok: true };
  }

  // Recalculo en servidor: orientación pública + score interno (server-only).
  const result = estimate({ sizeTier, sectorCode, riskFactors });
  const internal = computeInternalScore({ sizeTier, sectorCode, riskFactors });

  try {
    const supabase = createAdminClient();

    // Dedupe: si ya existe un lead con el mismo correo en la ventana, se
    // responde ok sin duplicar la fila. Si la consulta falla, se sigue con el
    // insert (capturar el lead pesa más que el dedupe).
    if (contactEmail) {
      const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
      const { data: existing, error: dedupeError } = await supabase
        .from("self_assessments")
        .select("id")
        .eq("contact_email", contactEmail)
        .gte("created_at", since)
        .limit(1);
      if (dedupeError) {
        console.error("[self-assessment] dedupe falló:", dedupeError.message);
      } else if (existing && existing.length > 0) {
        return { ok: true };
      }
    }

    const { error } = await supabase.from("self_assessments").insert({
      // Respuestas crudas + score interno (uso exclusivo del equipo consultor;
      // el prospecto nunca ve este número — RFC §11/§14.3).
      answers: {
        size_tier: sizeTier,
        sector_code: sectorCode,
        risk_factors: [...riskFactors],
        internal: {
          base_points: internal.basePoints,
          multiplier: internal.multiplier,
          score: internal.score,
          score_tier: internal.scoreTier,
        },
      },
      size_tier: sizeTier,
      sector_code: sectorCode,
      // Factores de AJUSTE detectados, en los tokens documentados por la migración.
      risk_factors: result.adjustmentFactors.map(
        (factor) => DB_RISK_FACTOR_TOKENS[factor],
      ),
      estimated_tier: DB_ESTIMATED_TIER[sizeTier],
      contact_name: contactName ?? null,
      contact_email: contactEmail ?? null,
      contact_phone: contactPhone ?? null,
    });

    if (error) {
      console.error("[self-assessment] insert falló:", error.message);
      return { ok: false, error: "unavailable" };
    }
    return { ok: true };
  } catch (cause) {
    console.error("[self-assessment] servicio no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
