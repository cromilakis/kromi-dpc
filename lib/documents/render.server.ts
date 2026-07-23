import "server-only";
import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/**
 * Render HTML→PDF con Chromium headless. Único módulo con navegador.
 * Resolución del ejecutable, en orden:
 *   1. PUPPETEER_EXECUTABLE_PATH (dev/CI explícito).
 *   2. Chrome/Edge instalado en Windows (desarrollo local).
 *   3. Binario de @sparticuz/chromium (Vercel / serverless Linux).
 */

const WINDOWS_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

function localExecutablePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.platform === "win32") {
    for (const candidate of WINDOWS_CANDIDATES) {
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

export async function renderPdf(html: string): Promise<Buffer> {
  const executablePath = localExecutablePath() ?? (await chromium.executablePath());
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
