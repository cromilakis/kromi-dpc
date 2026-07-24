import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  buildDiagnosisPdfHtml,
  type DiagnosisPdfData,
} from "@/lib/documents/diagnosis-pdf";
import { renderPdf } from "@/lib/documents/render.server";
import { whatsappUrl } from "@/lib/contact";
import QRCode from "qrcode";

/**
 * POST /self-assessment/informe — genera el PDF del diagnóstico (portada +
 * una brecha por página) a partir del resultado calculado en el cliente y lo
 * devuelve como descarga. Requiere servidor (puppeteer-core + @sparticuz/chromium-min):
 * funciona en Vercel con CHROMIUM_REMOTE_EXEC_PATH, NO en el export estático de GitHub Pages.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const actionSchema = z.object({
  title: z.string().max(300),
  detail: z.string().max(3000),
  evidence: z.string().max(1500),
});

const legalRefSchema = z.object({
  norm: z.string().max(200),
  summary: z.string().max(1500),
  url: z.string().url().max(500).optional(),
});

const breachSchema = z.object({
  description: z.string().max(1200),
  severity: z.enum(["critico", "alto", "medio", "bajo"]),
  severityLabel: z.string().max(40),
  legalRefs: z.array(legalRefSchema).max(12).default([]),
  objective: z.string().max(3000),
  actions: z.array(actionSchema).max(20),
});

const payloadSchema = z.object({
  companyName: z.string().trim().max(120).optional(),
  riskLabel: z.string().max(40),
  totalBreaches: z.number().int().min(0).max(200),
  breaches: z.array(breachSchema).min(1).max(60),
});

let cachedLogo: string | null = null;
function logoDataUri(): string {
  if (cachedLogo) return cachedLogo;
  const buf = readFileSync(path.join(process.cwd(), "public", "kpc-logo.png"));
  cachedLogo = `data:image/png;base64,${buf.toString("base64")}`;
  return cachedLogo;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Solicitud inválida", { status: 400 });
  }

  try {
    const contactUrl = whatsappUrl(
      "Hola KPC. Hice la autoevaluación y quiero implementar las mitigaciones de mi diagnóstico con ustedes.",
    );
    const contactQrDataUri = await QRCode.toDataURL(contactUrl, {
      margin: 1,
      width: 220,
      color: { dark: "#1c1d1f", light: "#ffffff" },
    });
    const data: DiagnosisPdfData = {
      ...parsed.data,
      generated: formatDate(new Date()),
      logoDataUri: logoDataUri(),
      contactUrl,
      contactQrDataUri,
    };
    const pdf = await renderPdf(buildDiagnosisPdfHtml(data));
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="diagnostico-kpc.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    console.error("[informe] no se pudo generar el PDF:", cause);
    return new Response("No se pudo generar el PDF", { status: 500 });
  }
}
