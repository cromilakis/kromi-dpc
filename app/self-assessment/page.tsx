import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { PublicTopbar } from "@/components/self-assessment/public-topbar";
import { DiagnosisWizard } from "@/components/self-assessment/diagnosis-wizard";

/**
 * /self-assessment — diagnóstico gratuito de cumplimiento en protección de
 * datos personales (Ley 21.719). Sin registro, sin compromiso: el cuestionario
 * adaptativo entrega un diagnóstico + propuesta de mitigación como entregable.
 * Si el cliente quiere apoyo para implementarla, el CTA lleva a WhatsApp.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("selfAssessment.meta");
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    alternates: { canonical: "/self-assessment" },
    openGraph: {
      type: "website",
      url: "/self-assessment",
      title,
      description,
      images: ["/og.png"],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default async function SelfAssessmentPage() {
  const [locale, messages, t, tCommon, tDiag] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("selfAssessment"),
    getTranslations("common"),
    getTranslations("diagnosis"),
  ]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#fbfbfc]">
      <PublicTopbar
        logoAlt={`${tCommon("appName")} — ${tCommon("appFullName")}`}
        backLabel={t("topbar.backToSite")}
      />
      {/* Banda superior oscura con patrón de puntos sutil: da profundidad y
          hace que el formulario "flote" por encima (sube con margen negativo). */}
      <div className="relative overflow-hidden bg-ink">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <header className="relative z-10 mx-auto w-full max-w-[1080px] px-32 pb-[104px] pt-[56px] text-center max-sm:px-16 max-sm:pb-[88px] max-sm:pt-40">
          <h1 className="mx-auto max-w-[720px] font-serif text-[40px] font-medium leading-[1.1] tracking-[-0.7px] text-white max-sm:text-[30px]">
            {tDiag("splash.title")}
          </h1>
          <p className="mx-auto mt-16 max-w-[600px] text-[17px] leading-[1.5] text-white/65">
            {tDiag("splash.subtitle")}
          </p>
        </header>
      </div>

      <main
        id="main"
        className="relative z-10 mx-auto w-full max-w-[1080px] flex-1 px-32 pb-80 max-sm:px-16"
      >
        <NextIntlClientProvider
          locale={locale}
          messages={{
            selfAssessment: messages.selfAssessment,
            diagnosis: messages.diagnosis,
            common: messages.common,
          }}
        >
          <DiagnosisWizard />
        </NextIntlClientProvider>
      </main>
    </div>
  );
}
