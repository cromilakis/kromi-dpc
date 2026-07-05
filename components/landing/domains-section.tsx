import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui";
import { COMPLEMENTARY_DOMAINS, PRINCIPLE_DOMAINS, type DomainRef } from "./data";

/**
 * Los 14 dominios (prototipo isLanding §DOMINIOS, anchor #dominios): dos grupos
 * con divisor de sección (label uppercase + línea flexible) y cards compactas
 * con nombre + una frase simple (clave i18n "simple", 2026-07-04). Reemplaza la
 * versión original con código + descripción legal por card, que abrumaba al
 * usuario no técnico; el detalle legal completo vive en la plataforma interna.
 */

interface DomainDividerProps {
  label: string;
  note: string;
}

function DomainDivider({ label, note }: DomainDividerProps) {
  return (
    <div className="mb-16 flex items-center gap-12">
      <span className="text-caption font-semibold uppercase tracking-[0.4px] text-ink">
        {label}
      </span>
      {/* Contraste AA en texto pequeño: carbon (≤13px). */}
      <span className="text-caption font-medium text-carbon">{note}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-stone" />
    </div>
  );
}

interface DomainCardsProps {
  domains: DomainRef[];
  /** Traductor del namespace landing.domains (firma mínima, ver page.tsx). */
  t: (key: string) => string;
}

function DomainCards({ domains, t }: DomainCardsProps) {
  return (
    <ul className="grid grid-cols-1 gap-12 md:grid-cols-2 xl:grid-cols-3">
      {domains.map((domain) => (
        <li
          key={domain.code}
          className="rounded-cards border border-stone bg-white p-[16px]"
        >
          <div className="mb-[6px] text-[15px] font-semibold tracking-[-0.2px] text-ink">
            {t(`items.${domain.key}.name`)}
          </div>
          <p className="text-[13px] leading-[1.5] text-metal">
            {t(`items.${domain.key}.simple`)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export async function DomainsSection() {
  const t = await getTranslations("landing.domains");

  return (
    <section
      id="dominios"
      className="mx-auto w-full max-w-[1180px] scroll-mt-[64px] border-t border-ash px-32 py-80 max-sm:px-16 max-sm:py-60"
    >
      <SectionHeading
        align="center"
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        className="mb-48"
      />

      <DomainDivider label={t("principlesLabel")} note={t("principlesNote")} />
      <div className="mb-40">
        <DomainCards domains={PRINCIPLE_DOMAINS} t={t} />
      </div>

      <DomainDivider
        label={t("complementaryLabel")}
        note={t("complementaryNote")}
      />
      <DomainCards domains={COMPLEMENTARY_DOMAINS} t={t} />
    </section>
  );
}
