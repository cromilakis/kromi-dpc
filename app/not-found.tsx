import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";

/**
 * Página 404 de marca (reemplaza el not-found por defecto de Next): usa el nav
 * y el footer de la landing, y ofrece rutas de recuperación (inicio, recursos,
 * autoevaluación) para que el usuario no quede en un callejón sin salida.
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <LandingNav />
      <main
        id="main"
        className="mx-auto flex w-full max-w-[720px] flex-1 flex-col items-center justify-center px-32 py-[96px] text-center max-sm:px-16 max-sm:py-[64px]"
      >
        <p className="text-caption font-semibold uppercase tracking-[0.6px] text-metal">
          {t("eyebrow")}
        </p>
        <h1 className="mt-8 text-balance font-serif text-heading-sm font-medium leading-[1.15] tracking-[-0.5px] text-ink">
          {t("title")}
        </h1>
        <p className="mt-12 max-w-[52ch] text-body leading-[1.55] text-carbon">
          {t("body")}
        </p>
        <div className="mt-28 flex flex-wrap items-center justify-center gap-12">
          <Link
            href="/"
            className="inline-flex items-center rounded-buttons bg-ink px-24 py-12 text-body-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("backHome")}
          </Link>
          <Link
            href="/self-assessment"
            className="inline-flex items-center rounded-buttons border border-slate bg-white px-24 py-12 text-body-sm font-medium text-ink transition-colors hover:bg-ash"
          >
            {t("selfAssessment")}
          </Link>
          <Link
            href="/recursos"
            className="inline-flex items-center text-body-sm font-medium text-ink underline decoration-slate underline-offset-4 hover:decoration-ink"
          >
            {t("resources")}
          </Link>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
