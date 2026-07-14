import "server-only";
import { getTranslations } from "next-intl/server";
import type { ReportDict } from "./diagnosis-report";

/**
 * Arma el diccionario del informe (namespace i18n `documents.report`) y la
 * fecha de generación formateada (es-CL, zona de Chile). Compartido por las
 * rutas del cliente y del consultor.
 */
export async function buildReportContext(): Promise<{ dict: ReportDict; generated: string }> {
  const t = await getTranslations("documents.report");
  const dict: ReportDict = {
    title: t("title"),
    brand: t("brand"),
    summaryTitle: t("summaryTitle"),
    riskLabel: t("riskLabel"),
    riskLevels: t.raw("riskLevels") as Record<string, string>,
    totalBreachesLabel: t("totalBreachesLabel"),
    findingsTitle: t("findingsTitle"),
    tableArea: t("tableArea"),
    tableSeverity: t("tableSeverity"),
    tableFine: t("tableFine"),
    severityLabels: t.raw("severityLabels") as Record<string, string>,
    noFine: t("noFine"),
    empty: t("empty"),
    generatedLabel: t("generatedLabel"),
    footerNote: t("footerNote"),
  };
  const generated = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date());
  return { dict, generated };
}
