import { getTranslations } from "next-intl/server";
import { SectionHeading, StatusBadge } from "@/components/ui";
import { DOSSIER_DOCS } from "./data";
import { CheckIcon, FileIcon, MedalIcon } from "./icons";

/**
 * El entregable: expediente de cumplimiento (prototipo isLanding §ENTREGABLE).
 * Izquierda: copy + 3 garantías (RFC §17). Derecha: mock del expediente con
 * los 7 documentos y footer oscuro de certificación privada.
 * Nota: "ARSOP" del prototipo se corrige a "ARCOP" (prototype-analysis §4.3.2).
 */

const DELIVERABLE_BULLETS = ["backup", "traceability", "detail"] as const;

export async function DeliverableSection() {
  const t = await getTranslations("landing.deliverable");

  return (
    <section className="mx-auto w-full max-w-[1180px] px-32 py-80 max-sm:px-16 max-sm:py-60">
      <div className="grid grid-cols-1 items-center gap-48 lg:grid-cols-[1fr_1.05fr] lg:gap-[64px]">
        <div>
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            className="mb-16"
          />
          <p className="mb-24 text-body leading-body tracking-body text-carbon">
            {t("description")}
          </p>
          <ul className="flex flex-col gap-[14px]">
            {DELIVERABLE_BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-start gap-12">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-ash text-ink">
                  <CheckIcon />
                </span>
                <span className="text-body-sm leading-[1.5] text-ink">
                  <b className="font-semibold">{t(`bullets.${bullet}.title`)}</b>
                  {" — "}
                  {t(`bullets.${bullet}.text`)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mock del expediente de cumplimiento */}
        <div
          data-dossier
          className="overflow-hidden rounded-xl border border-stone bg-white shadow-[rgba(28,40,64,0.1)_0px_16px_40px_-16px,rgba(28,40,64,0.05)_0px_4px_8px_-4px]"
        >
          <div className="flex items-center justify-between border-b border-ash bg-[#fbfbfc] px-20 py-16">
            <div className="flex items-center gap-[10px]">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-inputs bg-ink text-white">
                <FileIcon />
              </span>
              <span className="text-body-sm font-semibold tracking-[-0.1px] text-ink">
                {t("dossier.title")}
              </span>
            </div>
            <StatusBadge variant="positive" pill className="px-[10px] py-[3px] text-[11px]">
              {t("dossier.badge")}
            </StatusBadge>
          </div>
          <ul className="px-20 py-[6px]">
            {DOSSIER_DOCS.map((doc) => (
              <li
                key={doc}
                className="flex items-center gap-12 border-b border-ash py-12 last:border-b-0"
              >
                <span
                  data-doc-check
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-[#e9f2ec] text-success-green"
                >
                  <CheckIcon size={11} />
                </span>
                <span className="text-[13px] text-ink">
                  {t(`dossier.docs.${doc}`)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-[14px] bg-ink px-20 py-[18px] text-white">
            <span className="flex h-40 w-40 shrink-0 items-center justify-center rounded-full border-2 border-[#34353a]">
              <MedalIcon className="[stroke-width:1.4]" />
            </span>
            <div>
              <div className="text-[13px] font-semibold">
                {t("dossier.certTitle")}
              </div>
              <div className="text-caption text-overcast">
                {t("dossier.certNote")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
