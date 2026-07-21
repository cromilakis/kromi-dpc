import "server-only";
import { getTranslations } from "next-intl/server";
import {
  buildCertificateHtml,
  type CertificateDocData,
  type CertificateDict,
} from "./certificate-doc";
import { renderDocument } from "./layout";
import { qrDataUri, verifyUrl } from "./qr";
import { renderPdf } from "./render.server";

/**
 * Respuesta HTTP del certificado PDF (sub-proyecto #7), compartida por la ruta
 * del cliente (/portal/certificado) y del consultor
 * (/app/companies/[id]/certificado). Cablea por fin lib/documents/qr.ts:
 * el PDF incluye el código y el QR a /verify/[code].
 */
export async function respondWithCertificatePdf(
  data: CertificateDocData,
): Promise<Response> {
  const t = await getTranslations("documents.certificate");
  const dict: CertificateDict = {
    grantedTo: t("grantedTo"),
    scopeText: t("scopeText"),
    codeLabel: t("codeLabel"),
    issuedLabel: t("issuedLabel"),
    validUntilLabel: t("validUntilLabel"),
    revalidatedLabel: t("revalidatedLabel"),
    sectorLabel: t("sectorLabel"),
    hashLabel: t("hashLabel"),
    disclaimer: t("disclaimer"),
  };
  const generated = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date());

  try {
    const url = verifyUrl(data.code);
    const html = renderDocument({
      title: t("title"),
      brand: t("brand"),
      bodyHtml: buildCertificateHtml(data, dict),
      meta: { generated: t("generatedLabel", { date: generated }), folio: data.code },
      code: data.code,
      qrDataUri: await qrDataUri(url),
      verifyLabel: t("verifyLabel"),
    });
    const pdf = await renderPdf(html);
    const safeCode = data.code.replace(/[^0-9A-Za-z-]/g, "");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificado-${safeCode}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    console.error("[documents] render del certificado falló:", cause);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
