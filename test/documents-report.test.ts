import { describe, expect, it } from "vitest";
import { REPORT_ERROR_STATUS, reportFilename } from "../lib/documents/report-http";
import { buildDiagnosisReportHtml, type ReportDict } from "../lib/documents/diagnosis-report";
import type { ReportData } from "../lib/documents/report-http";

const dict: ReportDict = {
  title: "Informe de diagnóstico",
  brand: "DPC · Data Protection Compliance",
  summaryTitle: "Resumen",
  riskLabel: "Nivel de riesgo",
  riskLevels: { alto: "Alto", medio: "Medio", bajo: "Bajo" },
  totalBreachesLabel: "Brechas detectadas",
  findingsTitle: "Detalle de brechas",
  tableArea: "Área",
  tableSeverity: "Severidad",
  tableFine: "Multa",
  severityLabels: { critico: "Crítico", alto: "Alto", medio: "Medio", bajo: "Bajo" },
  noFine: "—",
  empty: "No se detectaron brechas en tu diagnóstico.",
  generatedLabel: "Generado el",
  footerNote: "Documento generado automáticamente por la plataforma DPC.",
};

const data: ReportData = {
  companyName: "Clínica Andes SpA",
  rut: "76.086.428-5",
  riskLevel: "alto",
  totalBreaches: 1,
  breaches: [
    {
      id: "b1",
      breachCode: "B-SEG-003",
      area: "SEG",
      areaLabel: "Seguridad de la información",
      severity: "critico",
      articles: ["Art. 14 quáter"],
      fineMinUtm: 100,
      fineMaxUtm: 5000,
      description: "No existen registros de auditoría.",
    },
  ],
};

describe("REPORT_ERROR_STATUS / reportFilename", () => {
  it("mapea cada error a su código HTTP", () => {
    expect(REPORT_ERROR_STATUS.no_paid).toBe(403);
    expect(REPORT_ERROR_STATUS.unauthorized).toBe(403);
    expect(REPORT_ERROR_STATUS.not_found).toBe(404);
    expect(REPORT_ERROR_STATUS.unavailable).toBe(503);
  });

  it("arma un nombre de archivo saneado desde el RUT", () => {
    expect(reportFilename("76.086.428-5")).toBe("informe-diagnostico-76086428-5.pdf");
  });
});

describe("buildDiagnosisReportHtml", () => {
  it("incluye empresa, resumen, fecha y la fila de la brecha con multa", () => {
    const html = buildDiagnosisReportHtml(data, dict, "14 de julio de 2026");
    expect(html).toContain("Clínica Andes SpA");
    expect(html).toContain("Generado el 14 de julio de 2026");
    expect(html).toContain("Seguridad de la información");
    expect(html).toContain("Crítico");
    expect(html).toContain("$6.729.400"); // 100 UTM (UTM_CLP=67294)
    expect(html).toContain("Alto"); // nivel de riesgo
  });

  it("degrada a estado vacío cuando no hay brechas", () => {
    const html = buildDiagnosisReportHtml(
      { ...data, totalBreaches: 0, breaches: [] },
      dict,
      "14 de julio de 2026",
    );
    expect(html).toContain("No se detectaron brechas en tu diagnóstico.");
    expect(html).not.toContain("<table");
  });
});
