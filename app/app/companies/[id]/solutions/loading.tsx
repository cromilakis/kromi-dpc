import { getTranslations } from "next-intl/server";

/**
 * Estado de carga del catálogo de soluciones: skeleton de header + filtro +
 * stack de cards, siguiendo el patrón del shell (app/app/loading.tsx).
 */
export default async function SolutionsLoading() {
  const t = await getTranslations("app.solutions");
  return (
    <div role="status" className="flex flex-col gap-16">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="h-40 w-[360px] max-w-full animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="h-40 w-[380px] max-w-full animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="flex flex-col gap-12">
        <div className="h-[140px] animate-pulse rounded-cards bg-ash" />
        <div className="h-[140px] animate-pulse rounded-cards bg-ash" />
        <div className="h-[140px] animate-pulse rounded-cards bg-ash" />
      </div>
    </div>
  );
}
