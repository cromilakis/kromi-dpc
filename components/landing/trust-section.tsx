import { getTranslations } from "next-intl/server";
import { DocumentIcon, MedalIcon, ShieldCheckIcon } from "./icons";

/**
 * Confianza / respaldo (prototipo isLanding §CONFIANZA, RFC §15): card única
 * #fbfbfc con tres pilares factuales de credibilidad — estándar estructurado,
 * dogfooding y confidencialidad por diseño. El pilar "estándar" se agregó
 * (2026-07-04) como respaldo de autoridad honesto en ausencia de prueba social
 * (aún sin clientes): describe hechos del marco, no testimonios.
 */
export async function TrustSection() {
  const t = await getTranslations("landing.trust");

  return (
    <section className="mx-auto w-full max-w-[1180px] px-32 pb-40 max-sm:px-16">
      <div className="grid grid-cols-1 gap-32 rounded-xl border border-stone bg-[#fbfbfc] p-32 md:grid-cols-3 max-sm:p-20">
        <div className="flex items-start gap-16">
          <span className="flex h-44 w-44 shrink-0 items-center justify-center rounded-buttons bg-ink text-white">
            <DocumentIcon />
          </span>
          <div>
            <div className="mb-[6px] text-body font-semibold tracking-[-0.2px] text-ink">
              {t("standard.title")}
            </div>
            <p className="text-body-sm leading-[1.55] text-metal">
              {t("standard.text")}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-16">
          <span className="flex h-44 w-44 shrink-0 items-center justify-center rounded-buttons bg-ink text-white">
            <MedalIcon size={22} />
          </span>
          <div>
            <div className="mb-[6px] text-body font-semibold tracking-[-0.2px] text-ink">
              {t("dogfooding.title")}
            </div>
            <p className="text-body-sm leading-[1.55] text-metal">
              {t("dogfooding.text")}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-16">
          <span className="flex h-44 w-44 shrink-0 items-center justify-center rounded-buttons border border-slate bg-white text-ink">
            <ShieldCheckIcon />
          </span>
          <div>
            <div className="mb-[6px] text-body font-semibold tracking-[-0.2px] text-ink">
              {t("confidentiality.title")}
            </div>
            <p className="text-body-sm leading-[1.55] text-metal">
              {t("confidentiality.text")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
