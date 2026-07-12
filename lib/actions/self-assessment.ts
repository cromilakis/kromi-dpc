"use server";

import { headers } from "next/headers";
import { provisionCompany } from "@/lib/companies/provision.server";
import { formatRut } from "@/lib/companies/rut";
import type { SizeTier } from "@/lib/companies/schema";
import {
  diagnosisLeadSchema,
  registrationLeadSchema,
} from "@/lib/self-assessment/lead-schema";
import {
  computeServiceUf,
  serviceChargeClp,
} from "@/lib/self-assessment/pricing";
import { getStripe, StripeError } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { z } from "zod";

type DiagnosisLead = z.infer<typeof diagnosisLeadSchema>;

/**
 * Server action del diagnóstico público (/self-assessment): valida con Zod
 * ESTRICTO e inserta el lead en self_assessments vía service role (la tabla no
 * tiene política de INSERT anon a propósito — RLS). El equipo consultor recoge
 * el lead para preparar el diagnóstico completo y la propuesta.
 *
 * Precio: NO se calcula ni se persiste una cifra aquí. Se guarda el valor base
 * referencial por tamaño (estimated_tier); el precio final se ajusta según la
 * complejidad tras el diagnóstico (modelo tamaño + complejidad, no por brechas).
 *
 * Anti-abuso (D8): honeypot `website` (si viene con valor se responde ok sin
 * insertar), dedupe por correo en una ventana de 10 minutos y límites de tamaño
 * en el schema. Rate limiting por IP → Vercel Firewall (pendiente init.md).
 *
 * Degradación con gracia: si falta el env o el insert falla, se loggea y se
 * devuelve { ok:false, error:"unavailable" } — la UI ofrece reintentar/WhatsApp.
 */

/** Valor base referencial por tamaño (espejo del pricing público de la landing). */
const BASE_TIER_LABEL: Record<SizeTier, string> = {
  micro: "Desde 10 UF + IVA",
  small: "Desde 25 UF + IVA",
  enterprise: "Desde 60 UF (bajo cotización)",
};

/** Ventana de dedupe por correo: mismo email en <10 min no se reinserta. */
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Fila de self_assessments a partir del lead validado. El detalle completo
 * (answers) es de uso interno del equipo consultor; el prospecto no lo ve.
 */
function buildLeadRow(data: DiagnosisLead) {
  return {
    answers: {
      source: "diagnosis_wizard",
      name: data.name,
      rut: formatRut(data.rut),
      factors: [...data.factors],
      diagnosis: {
        risk_level: data.diagnosis.riskLevel,
        total_breaches: data.diagnosis.totalBreaches,
      },
    },
    size_tier: data.sizeTier,
    sector_code: data.sectorCode,
    risk_factors: [...data.factors],
    estimated_tier: BASE_TIER_LABEL[data.sizeTier],
    contact_name: data.contactName,
    contact_email: data.contactEmail ?? null,
    contact_phone: data.contactPhone ?? null,
  };
}

export type SubmitDiagnosisLeadResult =
  | { ok: true }
  | { ok: false; error: "validation" | "unavailable" };

export async function submitDiagnosisLead(
  input: unknown,
): Promise<SubmitDiagnosisLeadResult> {
  const parsed = diagnosisLeadSchema.safeParse(input);
  if (!parsed.success) {
    console.error(
      "[diagnosis-lead] payload inválido:",
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.code}`),
    );
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  // Honeypot: un humano nunca completa el campo oculto. Se responde ok:true
  // SIN insertar para no darle señal al bot de que fue detectado.
  if (data.website) return { ok: true };

  try {
    const supabase = createAdminClient();

    // Dedupe: mismo correo en la ventana → ok sin duplicar. Si la consulta
    // falla, se sigue con el insert (capturar el lead pesa más que el dedupe).
    if (data.contactEmail) {
      const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
      const { data: existing, error: dedupeError } = await supabase
        .from("self_assessments")
        .select("id")
        .eq("contact_email", data.contactEmail)
        .gte("created_at", since)
        .limit(1);
      if (dedupeError) {
        console.error("[diagnosis-lead] dedupe falló:", dedupeError.message);
      } else if (existing && existing.length > 0) {
        return { ok: true };
      }
    }

    const { error } = await supabase
      .from("self_assessments")
      .insert(buildLeadRow(data));

    if (error) {
      console.error("[diagnosis-lead] insert falló:", error.message);
      return { ok: false, error: "unavailable" };
    }
    return { ok: true };
  } catch (cause) {
    console.error("[diagnosis-lead] servicio no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}

/**
 * Origin para las URLs de retorno de Checkout (mismo criterio que
 * lib/actions/proposals.ts): NEXT_PUBLIC_SITE_URL > header origin > host.
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

export type ResumeDiagnosisCheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      error: "unauthorized" | "not_found" | "already_paid" | "disabled" | "unavailable";
    };

/**
 * Re-pago del lead del diagnóstico para un cliente que ya se registró
 * (`registerAndStartCheckout`) pero abandonó/canceló el Checkout de Stripe
 * (spec company-accounts fase 2, tarea 9 — portal estado A "pago pendiente").
 * NO inserta un lead nuevo: reabre una Checkout Session sobre el `self_assessments`
 * ya existente de la empresa del usuario autenticado.
 *
 * Resuelve la empresa con el cliente autenticado (RLS de `company_client_view`
 * acota a `current_company_id()`); el lead en sí se busca con `createAdminClient()`
 * porque el cliente no tiene SELECT sobre `self_assessments` (solo el consultor y
 * el service role la leen).
 *
 * "Ya pagado": si `company_client_view.service_paid_at` ya está fijado (fuente
 * de verdad proyectada por el webhook), se rechaza como 'already_paid' sin
 * tocar Stripe — evita cobrar dos veces por una carrera entre el webhook y un
 * clic tardío en el botón de pago.
 */
export async function resumeDiagnosisCheckout(): Promise<ResumeDiagnosisCheckoutResult> {
  try {
    const supabase = await createClient();
    const { data: company } = await supabase
      .from("company_client_view")
      .select("id,name,service_paid_at")
      .maybeSingle();
    if (!company?.id) return { ok: false, error: "unauthorized" };
    if (company.service_paid_at) return { ok: false, error: "already_paid" };

    const admin = createAdminClient();
    const { data: lead, error: leadError } = await admin
      .from("self_assessments")
      .select("id,amount_clp,contact_email,payment_status")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (leadError) {
      console.error("[resume-checkout] lookup del lead falló:", leadError.message);
      return { ok: false, error: "unavailable" };
    }
    if (!lead) return { ok: false, error: "not_found" };
    if (lead.payment_status === "paid") return { ok: false, error: "already_paid" };
    if (!lead.amount_clp) return { ok: false, error: "not_found" };

    let stripe;
    try {
      stripe = getStripe();
    } catch (cause) {
      if (cause instanceof StripeError) return { ok: false, error: "disabled" };
      throw cause;
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
              product_data: {
                name: `Servicio DPC — ${company.name}`,
                description:
                  "Diagnóstico completo + propuesta de mitigación + certificación (IVA incluido).",
              },
              unit_amount: lead.amount_clp,
            },
            quantity: 1,
          },
        ],
        customer_email: lead.contact_email ?? undefined,
        metadata: { kind: "diagnosis_lead", lead_id: lead.id },
        success_url: `${origin}/portal?paid=1`,
        cancel_url: `${origin}/portal`,
      });
    } catch (cause) {
      console.error("[resume-checkout] checkout.sessions.create falló:", cause);
      return { ok: false, error: "unavailable" };
    }
    if (!session.url) return { ok: false, error: "unavailable" };

    const { error: sessionIdError } = await admin
      .from("self_assessments")
      .update({ stripe_session_id: session.id })
      .eq("id", lead.id);
    if (sessionIdError) {
      console.error(
        "[resume-checkout] persistir stripe_session_id falló:",
        sessionIdError.message,
      );
      return { ok: false, error: "unavailable" };
    }

    return { ok: true, url: session.url };
  } catch (cause) {
    console.error("[resume-checkout] resumeDiagnosisCheckout no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}

export type RegisterAndStartCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: "validation" | "account_exists" | "disabled" | "unavailable" };

/**
 * Registro ANTES de pagar (único camino de pago online para micro/pequeña;
 * enterprise sigue con `submitDiagnosisLead`, bajo cotización). Crea el
 * usuario auth confirmado, aprovisiona la empresa,
 * vincula al usuario como miembro activo, guarda el lead con `company_id` y
 * abre la Checkout Session. El correo es obligatorio (es la identidad de la
 * cuenta): si falta, se rechaza como 'validation' antes de tocar auth/DB.
 *
 * El sign-in automático (cookies) NO es bloqueante: si falla, el usuario
 * puede iniciar sesión manualmente igual (la cuenta y el pago ya quedaron).
 */
/**
 * Compensación best-effort: borra el usuario auth recién creado cuando un paso
 * posterior falla ANTES de insertar su fila en `company_members` (FK
 * company_members.user_id → auth.users impediría el borrado si esa fila ya
 * existe). Nunca lanza: solo loguea si el borrado falla.
 */
async function cleanupAuthUser(
  admin: ReturnType<typeof createAdminClient>,
  authUserId: string,
): Promise<void> {
  try {
    const { error } = await admin.auth.admin.deleteUser(authUserId);
    if (error) {
      console.error("[register] cleanup deleteUser falló:", error.message);
    }
  } catch (cause) {
    console.error("[register] cleanup deleteUser lanzó:", cause);
  }
}

export async function registerAndStartCheckout(
  input: unknown,
): Promise<RegisterAndStartCheckoutResult> {
  const parsed = registrationLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const data = parsed.data;
  if (data.website) return { ok: false, error: "validation" }; // honeypot
  if (data.sizeTier === "enterprise") return { ok: false, error: "validation" };
  if (!data.contactEmail) return { ok: false, error: "validation" }; // identidad de la cuenta

  const amountClp = serviceChargeClp(computeServiceUf(data.sizeTier, data.factors));

  try {
    const admin = createAdminClient();

    // 1) Usuario auth confirmado. Si el email ya existe -> account_exists.
    const created = await admin.auth.admin.createUser({
      email: data.contactEmail,
      password: data.password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      const exists =
        created.error?.code === "email_exists" ||
        /already.*registered|exists/i.test(created.error?.message ?? "");
      if (exists) return { ok: false, error: "account_exists" };
      console.error("[register] createUser falló:", created.error?.message);
      return { ok: false, error: "unavailable" };
    }
    const authUserId = created.data.user.id;

    // 2) Provisiona la empresa (service-role).
    const prov = await provisionCompany(admin, {
      name: data.name,
      rut: data.rut,
      sectorCode: data.sectorCode,
      sizeTier: data.sizeTier,
      factors: [...data.factors],
      contact: {
        name: data.contactName,
        email: data.contactEmail ?? null,
        phone: data.contactPhone ?? null,
      },
      preliminaryPanorama: data.panorama ?? null,
    });
    if (!prov.ok) {
      console.error("[register] provisionCompany falló:", prov.error);
      await cleanupAuthUser(admin, authUserId);
      return {
        ok: false,
        error: prov.error === "rutTaken" ? "unavailable" : prov.error,
      };
    }

    // 3) company_members active (sin invited_by: no hay consultor).
    const { error: memberError } = await admin.from("company_members").insert({
      user_id: authUserId,
      company_id: prov.companyId,
      invited_by: null,
      status: "active",
    });
    if (memberError) {
      console.error("[register] company_members:", memberError.message);
      await cleanupAuthUser(admin, authUserId);
      return { ok: false, error: "unavailable" };
    }

    // 4) Inserta el lead vinculado (reusa buildLeadRow + company_id + amount).
    const { data: lead, error: leadError } = await admin
      .from("self_assessments")
      .insert({ ...buildLeadRow(data), amount_clp: amountClp, company_id: prov.companyId })
      .select("id")
      .single();
    if (leadError || !lead) {
      console.error("[register] lead:", leadError?.message);
      return { ok: false, error: "unavailable" };
    }

    // 5) Inicia sesión (cookies) con el cliente server.
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.contactEmail,
      password: data.password,
    });
    if (signInError) console.warn("[register] auto sign-in falló:", signInError.message);
    // (no bloqueante: el usuario podrá iniciar sesión manualmente igual.)

    // 6) Checkout Session (mismo armado que resumeDiagnosisCheckout).
    let stripe;
    try {
      stripe = getStripe();
    } catch (cause) {
      if (cause instanceof StripeError) return { ok: false, error: "disabled" };
      throw cause;
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
              product_data: {
                name: `Servicio DPC — ${data.name}`,
                description:
                  "Diagnóstico completo + propuesta de mitigación + certificación (IVA incluido).",
              },
              unit_amount: amountClp,
            },
            quantity: 1,
          },
        ],
        customer_email: data.contactEmail ?? undefined,
        metadata: { kind: "diagnosis_lead", lead_id: lead.id },
        success_url: `${origin}/portal?paid=1`,
        cancel_url: `${origin}/portal`,
      });
    } catch (cause) {
      console.error("[register] checkout:", cause);
      return { ok: false, error: "unavailable" };
    }
    if (!session.url) return { ok: false, error: "unavailable" };

    const { error: sessionIdError } = await admin
      .from("self_assessments")
      .update({ stripe_session_id: session.id })
      .eq("id", lead.id);
    if (sessionIdError) {
      console.error("[register] persistir stripe_session_id falló:", sessionIdError.message);
      return { ok: false, error: "unavailable" };
    }

    return { ok: true, url: session.url };
  } catch (cause) {
    console.error("[register] registerAndStartCheckout no disponible:", cause);
    return { ok: false, error: "unavailable" };
  }
}
