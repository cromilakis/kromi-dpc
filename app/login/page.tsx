import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/ui";

/**
 * /login — login FUNCIONAL del equipo (spec auth, prototipo isLogin): card
 * centrada sobre #fbfbfc con logo + tagline, email + contraseña y server
 * action signInWithPassword (lib/actions/auth.ts). El middleware redirige
 * aquí (/login?next=…) los accesos a /app sin sesión, y de vuelta a /app si
 * ya hay sesión. Acceso discreto desde el footer de la landing (RFC §11).
 *
 * Reparto de strings (documentado): los textos que ya existían en
 * messages/es.json bajo `login.*` (title, subtitle, password*, submit,
 * backToSite, placeholderNote) se reutilizan tal cual; los NUEVOS del flujo
 * real (email*, submitting, errores) viven en messages/app/shell.json bajo
 * `app.auth.*` (este módulo es dueño de ese archivo). `login.userLabel` y
 * `login.userPlaceholder` quedan sin uso (el login real es por email) — no se
 * tocan porque es.json no pertenece a esta spec.
 *
 * Desviaciones normalizadas por .kromi/design.md: H1 serif a 28px (el
 * prototipo usa 26px; serif solo >= 28px) y tagline en Inter itálica.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const [{ next }, t, tAuth, tCommon] = await Promise.all([
    searchParams,
    getTranslations("login"),
    getTranslations("app.auth"),
    getTranslations("common"),
  ]);
  const nextParam = typeof next === "string" ? next : undefined;

  return (
    /* Landmark <main> con id="main" (destino del skip-link del layout). */
    <main
      id="main"
      className="flex min-h-screen flex-1 items-center justify-center bg-[#fbfbfc] p-32 max-sm:p-16"
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-28 flex items-center justify-center gap-[10px]">
          {/* Texto accesible del logo: appName + appFullName (D10). */}
          <Logo
            alt={`${tCommon("appName")} — ${tCommon("appFullName")}`}
            height={40}
            priority
          />
          <span className="text-[17px] font-medium italic tracking-[-0.2px] text-ink">
            {tCommon("tagline")}
          </span>
        </div>

        <div className="rounded-xl border border-stone bg-white p-32 shadow-[rgba(28,40,64,0.1)_0px_12px_32px_-12px,rgba(28,40,64,0.06)_0px_4px_8px_-4px]">
          <h1 className="mb-4 font-serif text-heading-sm font-medium leading-heading-sm tracking-heading-sm text-ink">
            {t("title")}
          </h1>
          <p className="mb-24 text-body-sm tracking-[-0.1px] text-metal">
            {t("subtitle")}
          </p>

          <LoginForm
            next={nextParam}
            labels={{
              email: tAuth("emailLabel"),
              emailPlaceholder: tAuth("emailPlaceholder"),
              password: t("passwordLabel"),
              passwordPlaceholder: t("passwordPlaceholder"),
              submit: t("submit"),
              submitting: tAuth("submitting"),
              errors: {
                validation: tAuth("errors.validation"),
                credentials: tAuth("errors.credentials"),
                unavailable: tAuth("errors.unavailable"),
              },
            }}
          />

          <Link
            href="/"
            className="mt-8 block w-full rounded-buttons p-8 text-center text-[13px] font-medium text-carbon transition-colors hover:bg-ash hover:text-ink"
          >
            {t("backToSite")}
          </Link>
        </div>

        {/* Contraste AA en texto pequeño: carbon (lead no alcanzaba 4.5:1). */}
        <p className="mx-auto mt-16 text-center text-caption text-carbon">
          {t("placeholderNote")}
        </p>
      </div>
    </main>
  );
}
