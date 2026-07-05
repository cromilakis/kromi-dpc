import { getTranslations } from "next-intl/server";

/**
 * Estado de carga de la ficha de control: skeleton del header + grid
 * principal/lateral, con anuncio accesible (role status + sr-only).
 */
export default async function ControlLoading() {
  const t = await getTranslations("app.checklist.control");
  return (
    <div role="status" className="flex flex-col gap-16">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="h-16 w-[180px] animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="h-36 w-[520px] max-w-full animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="grid grid-cols-[1fr_340px] gap-24 max-lg:grid-cols-1">
        <div className="h-[420px] animate-pulse rounded-cards bg-ash" />
        <div className="flex flex-col gap-16">
          <div className="h-[120px] animate-pulse rounded-cards bg-ash" />
          <div className="h-[180px] animate-pulse rounded-cards bg-ash" />
        </div>
      </div>
    </div>
  );
}
