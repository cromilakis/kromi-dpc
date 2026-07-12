import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
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

  const [locale, messages, t] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("portal.shell"),
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
        <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-stone bg-[#fbfbfc] px-24">
          <span className="text-[15px] font-semibold text-ink">
            {company.name}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="cursor-pointer rounded-buttons border border-stone bg-white px-12 py-8 text-[13px] font-medium text-carbon transition-colors hover:bg-ash hover:text-ink"
            >
              {t("signOut")}
            </button>
          </form>
        </header>
        {/* id="main": destino del skip-link del root layout. */}
        <main id="main" className="flex-1">
          <div className="mx-auto w-full max-w-[1160px] px-32 pb-80 pt-32">
            {children}
          </div>
        </main>
      </div>
    </NextIntlClientProvider>
  );
}
