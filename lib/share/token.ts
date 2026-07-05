import { createHash, randomBytes } from "node:crypto";

export function generateShareToken(): string {
  return randomBytes(24).toString("base64url"); // 32 url-safe chars
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
