import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { DownloadReportButton } from "../components/documents/download-report-button";

const messages = {
  common: {
    downloadReport: {
      label: "Descargar informe",
      downloading: "Generando informe…",
      errors: {
        no_paid: "Completa tu pago para descargar el informe.",
        not_found: "Aún no hay un diagnóstico para generar el informe.",
        unauthorized: "Tu sesión no tiene acceso a este informe.",
        unavailable: "No se pudo generar el informe. Intenta nuevamente.",
      },
    },
  },
};

function renderButton() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <DownloadReportButton href="/portal/evaluaciones/informe" />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DownloadReportButton", () => {
  it("muestra la etiqueta de descarga", () => {
    renderButton();
    expect(screen.getByRole("button", { name: "Descargar informe" })).toBeTruthy();
  });

  it("muestra el mensaje de error cuando la respuesta no es ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "no_paid" }),
      }),
    );
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(
        screen.getByText("Completa tu pago para descargar el informe."),
      ).toBeTruthy(),
    );
  });
});
