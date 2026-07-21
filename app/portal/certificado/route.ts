import { respondWithCertificatePdf } from "@/lib/documents/respond-with-certificate.server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /portal/certificado — descarga el certificado DPC vigente del cliente en
 * PDF con QR de verificación (sub-proyecto #7). Gated a pagado; RLS acota
 * certificates a su empresa. Se regenera on-demand.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 403 });

  const { data: company } = await supabase
    .from("company_client_view")
    .select("name, rut, service_paid_at")
    .maybeSingle();
  if (!company) return Response.json({ error: "unauthorized" }, { status: 403 });
  if (!company.service_paid_at) {
    return Response.json({ error: "no_paid" }, { status: 403 });
  }

  const { data: certificate } = await supabase
    .from("certificates")
    .select("code, status, issued_at, valid_until, revalidated_at, sha256_hash")
    .order("issued_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!certificate) return Response.json({ error: "not_found" }, { status: 404 });

  return respondWithCertificatePdf({
    companyName: company.name ?? "",
    rut: company.rut ?? "",
    sectorName: null,
    code: certificate.code,
    issuedAt: certificate.issued_at,
    validUntil: certificate.valid_until,
    revalidatedAt: certificate.revalidated_at,
    sha256Hash: certificate.sha256_hash,
  });
}
