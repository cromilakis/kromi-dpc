import { describe, it, expect } from "vitest";
import { generateShareToken, hashShareToken } from "@/lib/share/token";

describe("share token", () => {
  it("generates a url-safe token of decent length", () => {
    const t = generateShareToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(generateShareToken()).not.toBe(t);
  });
  it("hashes to 64 hex chars, deterministically", () => {
    const t = "abc";
    expect(hashShareToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashShareToken(t)).toBe(hashShareToken(t));
  });
});
