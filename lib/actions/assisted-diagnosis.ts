"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { identificationSchema } from "@/lib/companies/schema";
import { deriveClassification } from "@/lib/diagnosis/derive";
import { persistDiagnosis } from "@/lib/diagnosis/persist.server";
import { provisionCompany } from "@/lib/companies/provision.server";
import { createClient } from "@/lib/supabase/server";

const answersSchema = z.object({
  screening: z
    .array(z.strictObject({ nodeId: z.string().max(200), value: z.string().max(200) }))
    .max(200),
  deepDive: z
    .array(
      z.strictObject({
        questionId: z.string().max(200),
        branchId: z.string().max(200),
        value: z.string().max(200),
      }),
    )
    .max(200),
});

const inputSchema = z.strictObject({
  ...identificationSchema.shape,
  answers: answersSchema,
});

export type CreateCompanyWithDiagnosisError =
  | "validation"
  | "unauthorized"
  | "rutTaken"
  | "unavailable";

export type CreateCompanyWithDiagnosisResult = {
  ok: false;
  error: CreateCompanyWithDiagnosisError;
};

export async function createCompanyWithDiagnosis(
  input: unknown,
): Promise<CreateCompanyWithDiagnosisResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("[assisted-diagnosis] lectura de profile falló:", profileError.message);
    return { ok: false, error: "unavailable" };
  }
  if (!profile || (profile.role !== "consultant" && profile.role !== "admin")) {
    return { ok: false, error: "unauthorized" };
  }

  // Clasificación autoritativa recomputada en servidor desde las respuestas.
  const classification = deriveClassification(data.answers);

  const prov = await provisionCompany(supabase, {
    name: data.name,
    rut: data.rut,
    sectorCode: classification.sectorCode,
    sizeTier: classification.sizeTier,
    factors: classification.factors,
    contact: {
      name: data.contactName,
      email: data.contactEmail ?? null,
      phone: data.contactPhone ?? null,
    },
  });
  if (!prov.ok) return { ok: false, error: prov.error === "validation" ? "validation" : prov.error };

  const persisted = await persistDiagnosis(
    prov.companyId,
    data.answers,
    "consultant_assisted",
    user.id,
  );
  if (!persisted.ok) {
    console.error("[assisted-diagnosis] persistDiagnosis falló para company", prov.companyId);
    // La empresa ya se creó; el diagnóstico se puede re-persistir. No se aborta.
  }

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "company.created_with_diagnosis",
    entity: "companies",
    entity_id: prov.companyId,
    detail: {
      source: "consultant_assisted",
      size_tier: classification.sizeTier,
      sector_code: classification.sectorCode,
      diagnosis_persisted: persisted.ok,
    } as never,
  });
  if (auditError) {
    console.error("[assisted-diagnosis] audit falló:", auditError.message);
  }

  redirect(`/app/companies/${prov.companyId}`);
}
