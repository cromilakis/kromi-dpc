import { z } from "zod";
import { respondWithCertificatePdf } from "@/lib/documents/respond-with-certificate.server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /app/companies/[id]/certificado — descarga del certificado vigente en
 * PDF con QR, lado consultor (sub-proyecto #7). La RLS de staff autoriza la
 * lectura de companies/certificates; sin sesión de consultor no hay filas.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const companyIdSchema = z.uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!companyIdSchema.safeParse(id).success) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 403 });

  const { data: company } = await supabase
    .from("companies")
    .select("name, rut, sectors ( name )")
    .eq("id", id)
    .maybeSingle();
  if (!company) return Response.json({ error: "not_found" }, { status: 404 });

  const { data: certificate } = await supabase
    .from("certificates")
    .select("code, status, issued_at, valid_until, revalidated_at, sha256_hash")
    .eq("company_id", id)
    .order("issued_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!certificate) return Response.json({ error: "not_found" }, { status: 404 });

  return respondWithCertificatePdf({
    companyName: company.name,
    rut: company.rut ?? "",
    sectorName: company.sectors?.name ?? null,
    code: certificate.code,
    issuedAt: certificate.issued_at,
    validUntil: certificate.valid_until,
    revalidatedAt: certificate.revalidated_at,
    sha256Hash: certificate.sha256_hash,
  });
}
