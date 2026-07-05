import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { PublicDiagnosisManager } from "@/components/interview/public-diagnosis-manager";
import { PublicTopbar } from "@/components/self-assessment/public-topbar";
import { loadPublicDiagnosis } from "@/lib/actions/diagnosis-public";

/**
 * /diagnosis/[token] — autodiagnóstico self-service por enlace (RFC "modo
 * self", sin cuenta). Fuera del shell interno (`/app/*`): sin sidebar/topbar
 * de la plataforma, sin login — `proxy.ts` no cubre esta ruta (matcher
 * acotado a `/app/:path*` y `/login`, igual que `/verify/[code]` y
 * `/self-assessment`).
 *
 * `loadPublicDiagnosis` corre con el cliente ANON: el token resuelve la
 * sesión vía RPC `SECURITY DEFINER` (`open_diagnosis` + `diagnosis_questions`,
 * migración de entrevista) — nunca acceso directo a tablas. Solo se
 * renderizan `companyName`, `status`, `answers` (RAT + cumplimiento) y las
 * preguntas del catálogo: jamás complexity_score ni ningún otro dato de la
 * empresa u otras empresas.
 */
export const dynamic = "force-dynamic";

interface DiagnosisTokenPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.diagnosis.public.meta");
  return { title: t("title") };
}

export default async function DiagnosisTokenPage({ params }: DiagnosisTokenPageProps) {
  const { token: rawToken } = await params;
  let token = rawToken;
  try {
    token = decodeURIComponent(rawToken);
  } catch {
    // Token con escapes malformados: se consulta tal cual llegó.
  }

  const [t, tCommon, state, locale, messages] = await Promise.all([
    getTranslations("app.diagnosis.public"),
    getTranslations("common"),
    loadPublicDiagnosis(token),
    getLocale(),
    getMessages(),
  ]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#fbfbfc]">
      <PublicTopbar
        logoAlt={`${tCommon("appName")} — ${tCommon("appFullName")}`}
        tagline={tCommon("tagline")}
        backLabel={t("topbar.backToSite")}
      />
      <main
        id="main"
        className="mx-auto w-full max-w-[760px] flex-1 px-32 pb-80 pt-[56px] max-sm:px-16 max-sm:pt-32"
      >
        {!state.ok ? (
          <>
            <header className="mb-32 text-center">
              <p className="mb-12 text-[13px] font-semibold text-ink">{t("meta.title")}</p>
              <h1 className="font-serif text-heading font-medium leading-heading tracking-heading text-ink">
                {t("invalid.title")}
              </h1>
            </header>
            <section
              role="status"
              className="rounded-xl border border-danger-red/25 bg-[#f6e9e8] p-28 max-sm:p-20"
            >
              <p className="text-body-sm leading-[1.55] text-ink">{t("invalid.text")}</p>
            </section>
          </>
        ) : (
          <>
            <header className="mb-32">
              <p className="mb-12 text-[13px] font-semibold text-ink">
                {t("eyebrow", { company: state.companyName })}
              </p>
              <h1 className="font-serif text-heading font-medium leading-heading tracking-heading text-ink">
                {t("title")}
              </h1>
              <p className="mt-12 max-w-[560px] text-body-sm leading-[1.55] text-metal">
                {t("description")}
              </p>
            </header>
            {/* La ruta self está fuera del shell interno → provee el contexto
                i18n al manager cliente (mismo patrón que /self-assessment).
                Solo viajan los namespaces necesarios. */}
            <NextIntlClientProvider
              locale={locale}
              messages={{ app: messages.app, common: messages.common }}
            >
              <PublicDiagnosisManager
                token={token}
                initialStatus={state.status}
                questions={state.questions}
                initialAnswers={state.answers}
              />
            </NextIntlClientProvider>
          </>
        )}
      </main>
    </div>
  );
}
