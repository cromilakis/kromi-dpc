import QRCode from "qrcode";

/**
 * Helper de QR verificable para documentos DPC. `verifyUrl` arma la URL pública
 * de verificación (`/verify/[code]`); `qrDataUri` la codifica como data URI PNG
 * embebible en el HTML del documento. Reutilizable; se usa de verdad en el
 * certificado (#7). No se cablea en el informe de #4.
 */

const DEFAULT_BASE_URL = "https://dpc.kromi.cl";

export function verifyUrl(code: string, baseUrl?: string): string {
  const base = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
  return `${base}/verify/${code}`;
}

export async function qrDataUri(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });
}
