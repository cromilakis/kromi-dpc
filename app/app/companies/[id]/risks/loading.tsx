import { getTranslations } from "next-intl/server";

/**
 * Estado de carga de Riesgos & Gap: skeleton de header + grid matriz/form +
 * tabla, siguiendo el patrón del shell (app/app/loading.tsx).
 */
export default async function RisksLoading() {
  const t = await getTranslations("app.risks");
  return (
    <div role="status" className="flex flex-col gap-16">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="h-40 w-[360px] max-w-full animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="h-[320px] animate-pulse rounded-cards bg-ash" />
        <div className="h-[320px] animate-pulse rounded-cards bg-ash" />
      </div>
      <div aria-hidden="true" className="h-[260px] animate-pulse rounded-cards bg-ash" />
    </div>
  );
}
