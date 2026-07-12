import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, StripeError } from "@/lib/stripe/client";

/**
 * Webhook de Stripe — FUENTE DE VERDAD del pago (spec company-portal-phase2,
 * tarea 5). El redirect del cliente tras el Checkout (`?paid=1`, ver
 * `lib/actions/proposals.ts#createCheckoutSession`) es solo informativo y NO
 * es confiable (manipulable por el navegador): el estado `paid` de
 * `payments`/`proposals` únicamente se fija acá, tras verificar la firma de
 * Stripe.
 *
 * Requiere Node.js (no Edge): el SDK de Stripe usa APIs de Node para verificar
 * la firma HMAC.
 */
export const runtime = "nodejs";

type PaymentLookup = {
  sessionId: string | null;
  paymentIntentId: string | null;
  metadataPaymentId: string | null;
  metadataProposalId: string | null;
};

/** Extrae del evento los identificadores con los que ubicar el `payments`
 * correspondiente. `checkout.session.completed` es el evento principal (trae
 * `session.id`, que es lo que se persistió como `stripe_session_id` al crear
 * la Checkout Session); `payment_intent.succeeded` se soporta como respaldo
 * opcional vía metadata. Cualquier otro tipo de evento se ignora (null). */
function extractLookup(event: Stripe.Event): PaymentLookup | null {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    return {
      sessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      metadataPaymentId: session.metadata?.payment_id ?? null,
      metadataProposalId: session.metadata?.proposal_id ?? null,
    };
  }
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    return {
      sessionId: null,
      paymentIntentId: intent.id,
      metadataPaymentId: intent.metadata?.payment_id ?? null,
      metadataProposalId: intent.metadata?.proposal_id ?? null,
    };
  }
  return null;
}

type PaymentRow = { id: string; proposal_id: string; status: string };

/** Busca el `payments` afectado: primero por `stripe_session_id` (caso
 * principal), luego por `id` de metadata (`payment_id`), y por último por
 * `proposal_id` de metadata (el pending más reciente). Si ninguna vía
 * encuentra fila, el evento es de una sesión que este sistema no reconoce
 * (no es un error: se ignora en el handler). */
async function findPayment(
  admin: ReturnType<typeof createAdminClient>,
  lookup: PaymentLookup,
): Promise<PaymentRow | null> {
  if (lookup.sessionId) {
    const { data, error } = await admin
      .from("payments")
      .select("id,proposal_id,status")
      .eq("stripe_session_id", lookup.sessionId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as PaymentRow;
  }
  if (lookup.metadataPaymentId) {
    const { data, error } = await admin
      .from("payments")
      .select("id,proposal_id,status")
      .eq("id", lookup.metadataPaymentId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as PaymentRow;
  }
  if (lookup.metadataProposalId) {
    const { data, error } = await admin
      .from("payments")
      .select("id,proposal_id,status")
      .eq("proposal_id", lookup.metadataProposalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as PaymentRow;
  }
  return null;
}

/** Concilia el pago del lead público del diagnóstico (/self-assessment): marca
 * self_assessments.payment_status = 'paid'. Idempotente por el filtro
 * `eq('payment_status','pending')`. La Checkout Session la crea
 * lib/actions/self-assessment.ts#registerAndStartCheckout (o
 * #resumeDiagnosisCheckout) con metadata {kind:'diagnosis_lead', lead_id}. */
async function reconcileDiagnosisLead(
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
): Promise<void> {
  const leadId = session.metadata?.lead_id ?? null;
  const admin = createAdminClient();

  // Lookup por lead_id (metadata) o, en su defecto, por session id persistido.
  const query = admin
    .from("self_assessments")
    .update({ payment_status: "paid", paid_at: new Date().toISOString() })
    .eq("payment_status", "pending");
  const { data: updated, error } = leadId
    ? await query.eq("id", leadId).select("id, company_id").maybeSingle()
    : await query.eq("stripe_session_id", session.id).select("id, company_id").maybeSingle();
  if (error) throw new Error(`update de self_assessments falló: ${error.message}`);
  if (!updated) return; // ya conciliado o lead desconocido: idempotente.

  if (updated.company_id) {
    const { error: companyError } = await admin
      .from("companies")
      .update({ service_paid_at: new Date().toISOString() })
      .eq("id", updated.company_id)
      .is("service_paid_at", null); // idempotente
    if (companyError) {
      console.error(
        `[stripe-webhook] proyectar service_paid_at (company=${updated.company_id}) falló:`,
        companyError.message,
      );
    }
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: null,
    action: "diagnosis_lead.paid",
    entity: "self_assessments",
    entity_id: updated.id,
    detail: {
      stripe_session_id: session.id,
      stripe_event_id: event.id,
    } as never,
  });
  if (auditError) {
    console.error(
      `[stripe-webhook] audit_log (diagnosis_lead.paid, id=${updated.id}) falló:`,
      auditError.message,
    );
  }
}

/** Concilia el pago: marca `payments`/`proposals` como pagados. Idempotente
 * — si `payments.status` ya es 'paid' (reintento de Stripe, o los eventos
 * `checkout.session.completed`/`payment_intent.succeeded` llegan ambos para
 * el mismo pago), no vuelve a mutar ni a auditar. */
async function reconcilePayment(event: Stripe.Event): Promise<void> {
  // El lead público del diagnóstico va por su propia tabla (self_assessments),
  // no por payments/proposals: se distingue por metadata.kind.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.kind === "diagnosis_lead") {
      await reconcileDiagnosisLead(session, event);
      return;
    }
  }

  const lookup = extractLookup(event);
  if (!lookup) return; // tipo de evento no manejado: se ignora.

  const admin = createAdminClient();
  const payment = await findPayment(admin, lookup);
  if (!payment) return; // evento de una sesión/pago que no reconocemos.
  if (payment.status === "paid") return; // idempotente: ya conciliado.

  const { error: paymentError } = await admin
    .from("payments")
    .update({
      status: "paid",
      stripe_payment_intent: lookup.paymentIntentId,
    })
    .eq("id", payment.id);
  if (paymentError) throw new Error(`update de payments falló: ${paymentError.message}`);

  const { error: proposalError } = await admin
    .from("proposals")
    .update({ status: "paid" })
    .eq("id", payment.proposal_id);
  if (proposalError) throw new Error(`update de proposals falló: ${proposalError.message}`);

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: null,
    action: "payment.paid",
    entity: "payments",
    entity_id: payment.id,
    detail: {
      proposal_id: payment.proposal_id,
      stripe_event_id: event.id,
      stripe_event_type: event.type,
    } as never,
  });
  if (auditError) {
    console.error(
      `[stripe-webhook] audit_log (payment.paid, id=${payment.id}) falló:`,
      auditError.message,
    );
  }
}

export async function POST(req: Request): Promise<Response> {
  // Raw body: la verificación de firma de Stripe necesita el cuerpo TAL CUAL
  // llegó (byte a byte); `req.json()` lo parsearía y reserializarlo rompería
  // el HMAC.
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let stripe;
  try {
    stripe = getStripe();
  } catch (cause) {
    if (cause instanceof StripeError) {
      console.error("[stripe-webhook] Stripe deshabilitado:", cause.message);
      return new Response("Stripe no configurado", { status: 503 });
    }
    throw cause;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET no configurada");
    if (!signature) throw new Error("falta el header stripe-signature");
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (cause) {
    console.error("[stripe-webhook] firma inválida:", cause);
    return new Response("firma inválida", { status: 400 });
  }

  try {
    await reconcilePayment(event);
    return new Response("ok", { status: 200 });
  } catch (cause) {
    // Error inesperado (DB caída, etc.): 500 para que Stripe reintente el
    // evento más tarde (no es un problema de firma/idempotencia).
    console.error("[stripe-webhook] error interno procesando evento:", cause);
    return new Response("error interno", { status: 500 });
  }
}
