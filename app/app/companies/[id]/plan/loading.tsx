import { getTranslations } from "next-intl/server";

/**
 * Estado de carga del plan de adecuación: skeleton de header + summary-cards +
 * progreso + tabla, siguiendo el patrón del shell (app/app/loading.tsx).
 */
export default async function PlanLoading() {
  const t = await getTranslations("app.plan");
  return (
    <div role="status" className="flex flex-col gap-16">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="h-40 w-[360px] max-w-full animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="grid grid-cols-2 gap-16 md:grid-cols-4">
        <div className="h-80 animate-pulse rounded-cards bg-ash" />
        <div className="h-80 animate-pulse rounded-cards bg-ash" />
        <div className="h-80 animate-pulse rounded-cards bg-ash" />
        <div className="h-80 animate-pulse rounded-cards bg-ash" />
      </div>
      <div aria-hidden="true" className="h-[72px] animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="h-[280px] animate-pulse rounded-cards bg-ash" />
    </div>
  );
}
