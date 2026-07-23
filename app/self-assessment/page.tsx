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
  return { title: t("title"), description: t("description") };
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
      <main
        id="main"
        className="mx-auto w-full max-w-[1080px] flex-1 px-32 pb-80 pt-[56px] max-sm:px-16 max-sm:pt-32"
      >
        <header className="mb-40 text-center max-sm:mb-28">
          <h1 className="mx-auto max-w-[720px] font-serif text-[40px] font-medium leading-[1.1] tracking-[-0.7px] text-ink max-sm:text-[30px]">
            {tDiag("splash.title")}
          </h1>
          <p className="mx-auto mt-16 max-w-[600px] text-[17px] leading-[1.5] text-metal">
            {tDiag("splash.subtitle")}
          </p>
        </header>

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
