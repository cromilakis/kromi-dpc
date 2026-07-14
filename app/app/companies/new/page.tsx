import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/shell";
import { AssistedDiagnosisFlow } from "@/components/companies/assisted-diagnosis-flow";

/**
 * /app/companies/new — alta de empresa vía diagnóstico asistido por el
 * consultor: identificación (razón social, RUT, contacto) → encuesta de
 * diagnóstico (`DiagnosisQuestionnaire`, la misma del autodiagnóstico
 * público) → confirmación única que crea la empresa YA clasificada (rubro,
 * tramo, factores derivados de las respuestas) con su diagnóstico
 * persistido (`createCompanyWithDiagnosis`). Ya no hay catálogo de rubros
 * que cargar acá: la clasificación se deriva de la encuesta, server-side.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.companies.meta");
  return { title: t("newTitle") };
}

export default async function NewCompanyPage() {
  const t = await getTranslations("app.companies.wizard");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <AssistedDiagnosisFlow />
    </>
  );
}
