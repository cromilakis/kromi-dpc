import { getTranslations } from "next-intl/server";

/**
 * Estado de carga del checklist: skeleton del header + resumen + dos
 * secciones de dominio, con anuncio accesible (role status + sr-only).
 */
export default async function ChecklistLoading() {
  const t = await getTranslations("app.checklist");
  return (
    <div role="status" className="flex flex-col gap-16">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="h-40 w-[340px] max-w-full animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="h-16 w-[460px] max-w-full animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="mt-8 h-[96px] animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="h-[220px] animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="h-[220px] animate-pulse rounded-cards bg-ash" />
    </div>
  );
}
