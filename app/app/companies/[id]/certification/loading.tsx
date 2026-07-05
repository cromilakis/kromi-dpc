import { getTranslations } from "next-intl/server";

/**
 * Estado de carga de la vista de certificación: skeleton de header + grid
 * 2 columnas (elegibilidad / card del certificado) mientras el server
 * component resuelve elegibilidad e historial.
 */
export default async function CertificationLoading() {
  const t = await getTranslations("app.certification");
  return (
    <div role="status" className="flex flex-col gap-16">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="h-40 w-[360px] max-w-full animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="grid grid-cols-2 gap-16 max-lg:grid-cols-1">
        <div className="h-[360px] animate-pulse rounded-cards bg-ash" />
        <div className="h-[360px] animate-pulse rounded-cards bg-ash" />
      </div>
      <div aria-hidden="true" className="h-[180px] animate-pulse rounded-cards bg-ash" />
    </div>
  );
}
