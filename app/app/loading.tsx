import { getTranslations } from "next-intl/server";

/**
 * Estado de carga del shell interno: skeleton neutro (título + subtítulo +
 * bloque de contenido) mientras Next resuelve la vista de destino. El shell
 * (sidebar/topbar) permanece visible.
 */
export default async function AppLoading() {
  const t = await getTranslations("app.shell");
  return (
    <div role="status" className="flex flex-col gap-12">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="h-40 w-[320px] animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="h-16 w-[440px] max-w-full animate-pulse rounded-cards bg-ash" />
      <div aria-hidden="true" className="mt-16 h-[240px] animate-pulse rounded-cards bg-ash" />
    </div>
  );
}
