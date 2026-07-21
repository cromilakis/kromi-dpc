import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalNav } from "@/components/portal/portal-nav";
import { Logo } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Shell del portal del cliente (/portal) — spec company-accounts fase 0,
 * tarea 5. Shell MÍNIMO (el dashboard real es Fase 1): header con el nombre
 * de la empresa (leído de `company_client_view`, filtrada en la base por
 * `current_company_id()`) + botón "Cerrar sesión" (reusa la server action de
 * /app). Server component: re-verifica la sesión y el rol en cada carga
 * (defensa en profundidad, análoga a app/app/layout.tsx).
 *
 * Ruteo por rol: sin sesión → /login; staff (fila en `profiles`) → /app (el
 * consultor no tiene lugar en el portal del cliente); sin `profiles` y sin
 * membresía activa en `company_members` → /login (sin acceso reconocido).
 * Solo llega a renderizar el cliente activo de una empresa.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile) redirect("/app");

  const { data: company } = await supabase
    .from("company_client_view")
    .select("name")
    .maybeSingle();
  if (!company) redirect("/login");

  const [locale, messages, t, tCommon] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("portal.shell"),
    getTranslations("common"),
  ]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={{
        portal: messages.portal as AbstractIntlMessages,
        common: messages.common as AbstractIntlMessages,
        // ServiceStatus (estado "preparing") reutiliza las labels de severidad
        // del diagnóstico público (diagnosis.severity.label) para no duplicar
        // el catálogo de textos.
        diagnosis: messages.diagnosis as AbstractIntlMessages,
      }}
    >
      <div className="flex min-h-screen flex-col bg-white">
        {/* Header con la identidad de marca (mismo lockup que la landing):
            el portal debe sentirse continuación del sitio que vendió el
            servicio, no otra aplicación (feedback 2026-07-21). */}
        <header className="sticky top-0 z-50 border-b border-stone bg-white/85 backdrop-blur-[12px]">
          <div className="mx-auto flex h-[64px] w-full max-w-[1160px] items-center justify-between gap-16 px-24 max-sm:px-16">
            <div className="flex min-w-0 items-center gap-16">
              <Link href="/portal" className="flex shrink-0 items-center gap-[10px]">
                <Logo
                  alt={`${tCommon("appName")} — ${tCommon("appFullName")}`}
                  height={40}
                />
                {/* Excepción de marca del lockup (serif 15px, .kromi/design.md). */}
                <span className="font-serif text-[15px] font-medium tracking-[-0.2px] text-ink max-md:hidden">
                  {tCommon("tagline")}
                </span>
              </Link>
              <span aria-hidden className="h-[22px] w-px shrink-0 bg-stone max-sm:hidden" />
              <span className="truncate text-[14px] font-semibold text-ink max-sm:hidden">
                {company.name}
              </span>
            </div>
            <div className="flex items-center gap-12">
              <PortalNav />
              <form action={signOut}>
                <button
                  type="submit"
                  className="cursor-pointer rounded-buttons border border-stone bg-white px-12 py-8 text-[13px] font-medium text-carbon transition-colors hover:bg-ash hover:text-ink"
                >
                  {t("signOut")}
                </button>
              </form>
            </div>
          </div>
        </header>
        {/* id="main": destino del skip-link del root layout. */}
        <main id="main" className="flex-1">
          <div className="mx-auto w-full max-w-[1160px] px-32 pb-80 pt-32 max-sm:px-16">
            {children}
          </div>
        </main>
        {/* Footer sobrio de marca: cierra el shell como el sitio público. */}
        <footer className="border-t border-stone bg-[#fbfbfc]">
          <div className="mx-auto flex w-full max-w-[1160px] flex-wrap items-center justify-between gap-12 px-24 py-20 max-sm:px-16">
            <div className="flex items-center gap-[10px]">
              <Logo alt="" height={28} />
              <span className="text-caption text-carbon">
                {t("footerBrand")}
              </span>
            </div>
            <p className="text-caption text-metal">{t("footerLegal")}</p>
          </div>
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
