import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewCompanyWizard } from "@/components/companies/new-company-wizard";
import { PageHeader } from "@/components/app/shell";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

/**
 * /app/empresas/nueva — alta de empresa (prototipo §1.4.3 isRegistro,
 * "Paso 1 de 4"; los pasos 2-4 no estaban diseñados y acá se completan
 * coherentes con el prototipo): 1) Identificación → 2) Clasificación
 * (rubro del catálogo con sus leyes + tramo + dotación) → 3) Factores de
 * complejidad (RFC §14.3) → 4) Confirmación. El Complexity Score NO se
 * muestra en vivo: se calcula server-only en createCompany (los pesos no
 * viajan al cliente — por eso tampoco se envía sectors.complexity_multiplier).
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.companies.meta");
  return { title: t("newTitle") };
}

export default async function NewCompanyPage() {
  const t = await getTranslations("app.companies.wizard");

  const supabase = await createClient();
  // Catálogo de rubros para el paso 2 (nombre + leyes; SIN multiplicador).
  const { data: sectors, error } = await supabase
    .from("sectors")
    .select("code, name, laws")
    .order("sort", { ascending: true });
  if (error) {
    throw new Error(
      `No fue posible cargar el catálogo de rubros: ${error.message}`,
    );
  }

  if (!sectors || sectors.length === 0) {
    /* Sin catálogo no hay clasificación posible: estado de error explícito. */
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        <Card className="flex flex-col items-center gap-12 py-48 text-center">
          <h2 className="text-body font-semibold text-ink">
            {t("catalogEmpty.title")}
          </h2>
          <p className="max-w-[440px] text-body-sm leading-body-sm tracking-body-sm text-metal">
            {t("catalogEmpty.text")}
          </p>
        </Card>
      </>
    );
  }

  return <NewCompanyWizard sectors={sectors} />;
}
