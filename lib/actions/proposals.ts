"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions del módulo "propuesta al cliente" (spec Fase 2, tarea 2):
 * el consultor publica una propuesta (plan + monto) para que el cliente la
 * vea/acepte en el portal (Tarea 3) y eventualmente pague por Stripe
 * (Tareas 4-5). Doctrina de siempre (company-members.ts/interview.ts):
 * 1. "use server" + Zod ANTES de tocar datos.
 * 2. Verificación de sesión + rol consultor en el servidor (defensa en
 *    profundidad además de la RLS de `proposals`, que ya exige
 *    is_consultant() para INSERT).
 * 3. `audit_log` en la mutación sensible.
 *
 * Simplificación de la Fase 2: no existe un estado 'draft' persistido en la
 * UI del consultor — la propuesta se publica ('sent') al crearla.
 */

export type CreateProposalError = "validation" | "unauthorized" | "unavailable";

export type CreateProposalResult =
  | { ok: true; proposalId: string }
  | { ok: false; error: CreateProposalError };

const createProposalSchema = z.object({
  companyId: z.uuid(),
  plan: z.string().min(1).max(200),
  amountClp: z.number().int().positive(),
});

async function insertAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: {
    actorId: string;
    action: string;
    entity: string;
    entityId: string;
    detail: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    detail: entry.detail as never,
  });
  if (error) {
    console.error(
      `[proposals] audit_log (${entry.action}, id=${entry.entityId}) falló:`,
      error.message,
    );
  }
}

/**
 * Crea y publica una propuesta (plan + monto CLP) para una empresa: el
 * precio lo decide el consultor a partir de la calculadora interna de
 * pricing; el cliente jamás ve el Complexity Score, solo el plan y el monto
 * final publicados acá. Draft→sent simplificado: queda 'sent' desde el
 * insert.
 */
export async function createProposal(
  companyId: string,
  input: { plan: string; amountClp: number },
): Promise<CreateProposalResult> {
  const parsed = createProposalSchema.safeParse({
    companyId,
    plan: input.plan,
    amountClp: input.amountClp,
  });
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    // Defensa en profundidad: además de la RLS de proposals (solo
    // is_consultant() puede insertar), se verifica el rol acá mismo.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("[proposals] lectura de profile falló:", profileError.message);
      return { ok: false, error: "unavailable" };
    }
    if (!profile || (profile.role !== "consultant" && profile.role !== "admin")) {
      return { ok: false, error: "unauthorized" };
    }

    const { data: proposal, error: insertError } = await supabase
      .from("proposals")
      .insert({
        company_id: parsed.data.companyId,
        plan: parsed.data.plan,
        amount_clp: parsed.data.amountClp,
        currency: "clp",
        status: "sent",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (insertError || !proposal) {
      console.error("[proposals] insert de proposal falló:", insertError?.message);
      return { ok: false, error: "unavailable" };
    }

    await insertAuditLog(supabase, {
      actorId: user.id,
      action: "proposal.created",
      entity: "proposals",
      entityId: proposal.id,
      detail: {
        company_id: parsed.data.companyId,
        plan: parsed.data.plan,
        amount_clp: parsed.data.amountClp,
      },
    });

    return { ok: true, proposalId: proposal.id };
  } catch (cause) {
    console.error("[proposals] createProposal no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
