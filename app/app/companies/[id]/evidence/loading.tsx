import { getTranslations } from "next-intl/server";

/**
 * Estado de carga del repositorio documental: skeleton de header +
 * summary-cards + tabla mientras el server component resuelve las consultas.
 */
export default async function EvidencesLoading() {
  const t = await getTranslations("app.evidences");
  return (
    <div role="status" className="flex flex-col gap-16">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="h-40 w-[360px] max-w-full animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="grid grid-cols-4 gap-16 max-lg:grid-cols-2">
        <div className="h-[86px] animate-pulse rounded-cards bg-ash" />
        <div className="h-[86px] animate-pulse rounded-cards bg-ash" />
        <div className="h-[86px] animate-pulse rounded-cards bg-ash" />
        <div className="h-[86px] animate-pulse rounded-cards bg-ash" />
      </div>
      <div aria-hidden="true" className="h-[320px] animate-pulse rounded-cards bg-ash" />
    </div>
  );
}
