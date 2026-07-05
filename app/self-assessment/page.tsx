import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { PublicTopbar } from "@/components/self-assessment/public-topbar";
import { RiskValueCards } from "@/components/self-assessment/risk-value-cards";
import { SelfAssessmentWizard } from "@/components/self-assessment/wizard";

/**
 * /self-assessment — autoevaluador público gratuito (RFC §13, prototipo
 * isCotizador): cuestionario multi-paso que estima el tramo y la orientación
 * de valor ("desde X UF + IVA" / "bajo cotización"), pone en perspectiva el
 * riesgo de no certificarse y captura un lead opcional.
 * El Complexity Score numérico es INTERNO y jamás se muestra (RFC §11/§14).
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("selfAssessment.meta");
  return { title: t("title"), description: t("description") };
}

export default async function SelfAssessmentPage() {
  const [locale, messages, t, tCommon] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("selfAssessment"),
    getTranslations("common"),
  ]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#fbfbfc]">
      <PublicTopbar
        logoAlt={`${tCommon("appName")} — ${tCommon("appFullName")}`}
        tagline={tCommon("tagline")}
        backLabel={t("topbar.backToSite")}
      />
      {/* pt-[56px]: `pt-56` resolvía a 224px por la escala dinámica de spacing. */}
      <main
        id="main"
        className="mx-auto w-full max-w-[1080px] flex-1 px-32 pb-80 pt-[56px] max-sm:px-16 max-sm:pt-32"
      >
        <header className="mb-44 text-center max-sm:mb-32">
          {/* Eyebrow canónico ink — accent default del prototipo; overcast fallaba AA. */}
          <p className="mb-12 text-[13px] font-semibold text-ink">
            {t("header.eyebrow")}
          </p>
          <h1 className="mx-auto max-w-[720px] font-serif text-[48px] font-medium leading-[1.05] tracking-[-0.9px] text-ink max-sm:text-[34px]">
            {t("header.title")}
          </h1>
          <p className="mx-auto mt-16 max-w-[600px] text-[17px] tracking-[-0.24px] text-metal">
            {t("header.intro")}
          </p>
        </header>

        {/* Solo los namespaces del autoevaluador y common viajan al cliente
            (common: texto sr-only de los enlaces target="_blank"). */}
        <NextIntlClientProvider
          locale={locale}
          messages={{
            selfAssessment: messages.selfAssessment,
            common: messages.common,
          }}
        >
          <SelfAssessmentWizard />
        </NextIntlClientProvider>

        <RiskValueCards />
      </main>
    </div>
  );
}
