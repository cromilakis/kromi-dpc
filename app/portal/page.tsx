import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

/**
 * /portal — placeholder de la home del cliente (spec company-accounts fase 0,
 * tarea 5). El dashboard real de cumplimiento llega en Fase 1; acá solo se
 * confirma el ruteo por rol y se saluda con el nombre de la empresa (vía
 * `company_client_view`, ya resuelta por `app/portal/layout.tsx` — se vuelve
 * a leer acá porque el layout no expone la empresa a las páginas hijas).
 */
export default async function PortalPage() {
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("company_client_view")
    .select("name")
    .maybeSingle();

  const t = await getTranslations("portal.home");

  return (
    <div>
      <p className="mb-8 text-caption font-semibold uppercase tracking-[0.4px] text-carbon">
        {t("eyebrow")}
      </p>
      <h1 className="mb-8 font-serif text-heading-sm font-medium leading-heading-sm tracking-heading-sm text-ink">
        {t("title", { company: company?.name ?? "" })}
      </h1>
      <p className="text-body-sm text-metal">{t("description")}</p>
    </div>
  );
}
