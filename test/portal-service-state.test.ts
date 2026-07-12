import { describe, expect, it } from "vitest";
import { portalServiceState } from "../lib/portal/service-state";

describe("portalServiceState", () => {
  it("sin pago => pending", () => {
    expect(portalServiceState({ servicePaidAt: null, clientReadyAt: null })).toBe("pending");
  });
  it("pagado sin publicar => preparing", () => {
    expect(portalServiceState({ servicePaidAt: "2026-07-12T00:00:00Z", clientReadyAt: null })).toBe("preparing");
  });
  it("pagado y publicado => ready", () => {
    expect(
      portalServiceState({ servicePaidAt: "2026-07-12T00:00:00Z", clientReadyAt: "2026-07-13T00:00:00Z" }),
    ).toBe("ready");
  });
  it("publicado sin pago (caso consultor manual) => ready", () => {
    expect(portalServiceState({ servicePaidAt: null, clientReadyAt: "2026-07-13T00:00:00Z" })).toBe("ready");
  });
});
