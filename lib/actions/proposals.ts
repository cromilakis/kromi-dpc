"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe, StripeError } from "@/lib/stripe/client";

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

export type AcceptProposalError =
  | "validation"
  | "unauthorized"
  | "not_found"
  | "conflict"
  | "unavailable";

export type AcceptProposalResult =
  | { ok: true }
  | { ok: false; error: AcceptProposalError };

const acceptProposalSchema = z.object({ proposalId: z.uuid() });

/**
 * El cliente acepta SU propuesta ('sent' -> 'accepted'). Por diseño de RLS
 * (migración 20260706110000_proposals_payments.sql), el cliente NO tiene
 * policy de UPDATE sobre `proposals` — solo SELECT de la suya. Por eso acá:
 * 1. Se lee la propuesta con el cliente AUTENTICADO (`createClient()`): la
 *    RLS de SELECT (`company_id = current_company_id()`) ya garantiza que
 *    solo puede ver la propia; si no aparece, es que no existe o es de otra
 *    empresa (no se distingue el caso, para no filtrar existencia ajena).
 * 2. El UPDATE se hace con el cliente **service-role** (`lib/supabase/admin.ts`),
 *    recién DESPUÉS de haber verificado la pertenencia con el paso 1 — nunca
 *    antes. El service-role bypassa RLS a propósito acá (no hay otra forma
 *    de mutar `proposals` desde una sesión de cliente); la comprobación de
 *    pertenencia + el filtro `status = 'sent'` en el UPDATE hacen de guardas.
 * 3. `audit_log` también se inserta con service-role: su policy de INSERT
 *    exige `is_consultant()`, que el cliente nunca cumple.
 *
 * Idempotencia: si la propuesta ya está 'accepted', se responde ok:true (el
 * cliente pudo reintentar tras un timeout de red sin haber visto la
 * confirmación); si ya está 'paid' (o en cualquier otro estado que no sea
 * 'sent'/'accepted', p. ej. 'draft'/'expired'), se responde 'conflict': no
 * hay nada razonable que aceptar.
 */
export async function acceptProposal(proposalId: string): Promise<AcceptProposalResult> {
  const parsed = acceptProposalSchema.safeParse({ proposalId });
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    // Lectura con el cliente autenticado: RLS (`proposals_client_select`)
    // acota el resultado a la propuesta de SU propia empresa.
    const { data: proposal, error: readError } = await supabase
      .from("proposals")
      .select("id,company_id,status")
      .eq("id", parsed.data.proposalId)
      .maybeSingle();
    if (readError) {
      console.error("[proposals] lectura de proposal falló:", readError.message);
      return { ok: false, error: "unavailable" };
    }
    if (!proposal) return { ok: false, error: "not_found" };

    if (proposal.status === "accepted") return { ok: true };
    if (proposal.status !== "sent") return { ok: false, error: "conflict" };

    // UPDATE con service-role: el cliente no tiene policy de UPDATE por
    // diseño (ver comentario de la función). El filtro `eq("status","sent")`
    // evita una doble-aceptación concurrente (si otra request ya la marcó
    // 'accepted' entre la lectura y este UPDATE, aquí no matchea ninguna
    // fila y se detecta abajo).
    const admin = createAdminClient();
    const { data: updated, error: updateError } = await admin
      .from("proposals")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", parsed.data.proposalId)
      .eq("status", "sent")
      .select("id")
      .maybeSingle();
    if (updateError) {
      console.error("[proposals] update de proposal falló:", updateError.message);
      return { ok: false, error: "unavailable" };
    }
    if (!updated) return { ok: false, error: "conflict" };

    const { error: auditError } = await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "proposal.accepted",
      entity: "proposals",
      entity_id: parsed.data.proposalId,
      detail: { company_id: proposal.company_id },
    });
    if (auditError) {
      console.error(
        `[proposals] audit_log (proposal.accepted, id=${parsed.data.proposalId}) falló:`,
        auditError.message,
      );
    }

    revalidatePath("/portal");
    return { ok: true };
  } catch (cause) {
    console.error("[proposals] acceptProposal no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}

export type CreateCheckoutSessionError =
  | "validation"
  | "unauthorized"
  | "not_found"
  | "conflict"
  | "disabled"
  | "unavailable";

export type CreateCheckoutSessionResult =
  | { ok: true; url: string }
  | { ok: false; error: CreateCheckoutSessionError };

const createCheckoutSessionSchema = z.object({ proposalId: z.uuid() });

/**
 * Determina el origin para las URLs de retorno de Checkout. Prioridad:
 * 1. `NEXT_PUBLIC_SITE_URL` si está configurada (recomendado en producción,
 *    donde el header `origin` de un fetch server-side puede no reflejar el
 *    dominio público detrás de un proxy/CDN).
 * 2. El header `origin` de la request (presente en navegación normal).
 * 3. El header `host` (con https), como último recurso.
 */
async function resolveOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("host");
  if (host) return `https://${host}`;

  return "http://localhost:3000";
}

/**
 * Crea una Stripe Checkout Session (hosted, modo test) para que el cliente
 * pague SU propuesta ya aceptada (spec company-portal-phase2, tarea 4). El
 * estado real de pago NO se fija acá ni en el redirect de retorno: esta
 * action solo abre el cobro y deja un `payments` en 'pending'; el webhook
 * (tarea 5), verificado por firma, es la única fuente de verdad que marca
 * 'paid' (ver Global Constraints del plan).
 *
 * OJO CLP zero-decimal: a diferencia de monedas como USD, Stripe trata CLP
 * como moneda "zero-decimal" (https://stripe.com/docs/currencies#zero-decimal):
 * el monto en `unit_amount` se manda TAL CUAL en pesos, SIN multiplicar por
 * 100 (multiplicar por 100 cobraría 100x de más).
 *
 * Misma doctrina de pertenencia que `acceptProposal`: se lee la propuesta con
 * el cliente autenticado (RLS la acota a la empresa propia); el upsert de
 * `payments` y el UPDATE de `stripe_session_id` se hacen con service-role
 * porque el cliente no tiene INSERT/UPDATE directo en `payments` (RLS).
 */
export async function createCheckoutSession(
  proposalId: string,
): Promise<CreateCheckoutSessionResult> {
  const parsed = createCheckoutSessionSchema.safeParse({ proposalId });
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthorized" };

    // Lectura con el cliente autenticado: RLS acota el resultado a la
    // propuesta de SU propia empresa (mismo patrón que acceptProposal).
    const { data: proposal, error: readError } = await supabase
      .from("proposals")
      .select("id,company_id,plan,amount_clp,status")
      .eq("id", parsed.data.proposalId)
      .maybeSingle();
    if (readError) {
      console.error("[proposals] lectura de proposal falló:", readError.message);
      return { ok: false, error: "unavailable" };
    }
    if (!proposal) return { ok: false, error: "not_found" };

    if (proposal.status === "paid") return { ok: false, error: "conflict" };
    if (proposal.status !== "accepted") return { ok: false, error: "conflict" };

    let stripe;
    try {
      stripe = getStripe();
    } catch (cause) {
      if (cause instanceof StripeError) return { ok: false, error: "disabled" };
      throw cause;
    }

    const admin = createAdminClient();

    // Upsert del payment 'pending': si el cliente reintenta el pago (p. ej.
    // canceló el Checkout anterior), se reutiliza el registro existente en
    // vez de acumular filas huérfanas por proposal.
    const { data: existingPayment, error: existingPaymentError } = await admin
      .from("payments")
      .select("id")
      .eq("proposal_id", parsed.data.proposalId)
      .eq("status", "pending")
      .maybeSingle();
    if (existingPaymentError) {
      console.error(
        "[proposals] lectura de payment pendiente falló:",
        existingPaymentError.message,
      );
      return { ok: false, error: "unavailable" };
    }

    let paymentId: string;
    if (existingPayment) {
      paymentId = existingPayment.id;
      const { error: updateAmountError } = await admin
        .from("payments")
        .update({ amount_clp: proposal.amount_clp })
        .eq("id", paymentId);
      if (updateAmountError) {
        console.error(
          "[proposals] actualización de payment pendiente falló:",
          updateAmountError.message,
        );
        return { ok: false, error: "unavailable" };
      }
    } else {
      const { data: inserted, error: insertPaymentError } = await admin
        .from("payments")
        .insert({
          proposal_id: parsed.data.proposalId,
          company_id: proposal.company_id,
          amount_clp: proposal.amount_clp,
          status: "pending",
        })
        .select("id")
        .single();
      if (insertPaymentError || !inserted) {
        console.error(
          "[proposals] insert de payment falló:",
          insertPaymentError?.message,
        );
        return { ok: false, error: "unavailable" };
      }
      paymentId = inserted.id;
    }

    const origin = await resolveOrigin();

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "clp",
              product_data: { name: proposal.plan },
              // CLP es zero-decimal en Stripe: se manda el monto en pesos
              // TAL CUAL, sin *100 (ver comentario del docblock).
              unit_amount: proposal.amount_clp,
            },
            quantity: 1,
          },
        ],
        metadata: {
          proposal_id: parsed.data.proposalId,
          company_id: proposal.company_id,
          payment_id: paymentId,
        },
        success_url: `${origin}/portal?paid=1`,
        cancel_url: `${origin}/portal`,
      });
    } catch (cause) {
      console.error("[proposals] Stripe checkout.sessions.create falló:", cause);
      return { ok: false, error: "unavailable" };
    }
    if (!session.url) {
      console.error("[proposals] Stripe no devolvió session.url");
      return { ok: false, error: "unavailable" };
    }

    const { error: sessionIdError } = await admin
      .from("payments")
      .update({ stripe_session_id: session.id })
      .eq("id", paymentId);
    if (sessionIdError) {
      console.error(
        "[proposals] persistir stripe_session_id falló:",
        sessionIdError.message,
      );
      return { ok: false, error: "unavailable" };
    }

    const { error: auditError } = await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "payment.checkout_created",
      entity: "payments",
      entity_id: paymentId,
      detail: {
        proposal_id: parsed.data.proposalId,
        company_id: proposal.company_id,
        stripe_session_id: session.id,
      },
    });
    if (auditError) {
      console.error(
        `[proposals] audit_log (payment.checkout_created, id=${paymentId}) falló:`,
        auditError.message,
      );
    }

    return { ok: true, url: session.url };
  } catch (cause) {
    console.error("[proposals] createCheckoutSession no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
