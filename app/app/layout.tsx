import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppSidebar, AppTopbar, ShellProvider } from "@/components/app/shell";
import { createClient } from "@/lib/supabase/server";

/**
 * Shell de la plataforma interna (/app) — prototipo §1.4 (isApp):
 * sidebar fija 236px + topbar 56px + main (max-width 1160px, padding
 * 32/32/80). Server component: re-verifica la sesión (defensa en profundidad,
 * el proxy ya protege /app/*) y carga el profile (nombre/rol) para el
 * menú de usuario. Solo los namespaces `app` y `common` viajan al cliente
 * (sidebar/topbar son client components por usePathname/contexto).
 */

/** Iniciales (máx 2) para el avatar del usuario, estilo prototipo ("CD"). */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
  return initials || "·";
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Si el profile no llega (p. ej. usuario auth sin fila en el allowlist),
  // se degrada al email: RLS igual le impide ver datos de negocio.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name ?? user.email ?? "";
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={{
        app: messages.app as AbstractIntlMessages,
        common: messages.common as AbstractIntlMessages,
      }}
    >
      <ShellProvider>
        <div className="flex min-h-screen bg-white">
          <AppSidebar
            userName={displayName}
            userInitials={initialsOf(displayName)}
            userRole={profile?.role ?? null}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppTopbar />
            {/* id="main": destino del skip-link del root layout. */}
            <main id="main" className="flex-1">
              <div className="mx-auto w-full max-w-[1160px] px-32 pb-80 pt-32">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ShellProvider>
    </NextIntlClientProvider>
  );
}
