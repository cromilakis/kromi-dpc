import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DownloadReportButton } from "@/components/documents/download-report-button";
import { buttonClasses, Card } from "@/components/ui";
import { DOCUMENT_TEMPLATES } from "@/lib/documents/templates/registry";
import { loadClientDiagnosis } from "@/lib/portal/load-diagnosis.server";

/**
 * /portal/documentos — biblioteca documental del cliente (mejora de portal
 * 2026-07-21): (1) los documentos del diagnóstico (informe, plan de
 * mitigación, catastro) y (2) los 17 documentos tipo de mitigación,
 * personalizados con los datos de la empresa al descargar. Gated a pagado
 * (mismo criterio que Evaluaciones); cada ruta de descarga re-verifica
 * server-side.
 */
export default async function PortalDocumentsPage() {
  const [{ paid }, t] = await Promise.all([
    loadClientDiagnosis(),
    getTranslations("portal.documents"),
  ]);

  return (
    <div>
      <h1 className="font-serif text-heading-sm font-medium leading-heading-sm tracking-heading-sm text-ink">
        {t("title")}
      </h1>
      <p className="mb-24 mt-8 max-w-[60ch] text-body-sm text-metal">
        {t("description")}
      </p>

      {!paid ? (
        <Card className="flex flex-col items-start gap-12">
          <h2 className="text-body-sm font-semibold text-ink">
            {t("locked.title")}
          </h2>
          <p className="max-w-[52ch] text-body-sm text-metal">{t("locked.body")}</p>
          <Link href="/portal" className={buttonClasses("secondary")}>
            {t("locked.cta")}
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-32">
          <section>
            <h2 className="text-body-sm font-semibold text-ink">
              {t("reports.title")}
            </h2>
            <p className="mt-4 max-w-[60ch] text-caption leading-[1.5] text-carbon">
              {t("reports.hint")}
            </p>
            <div className="mt-12 grid gap-12 sm:grid-cols-3">
              {(
                [
                  { key: "report", href: "/portal/evaluaciones/informe" },
                  { key: "mitigation", href: "/portal/evaluaciones/plan-mitigacion" },
                  { key: "dossier", href: "/portal/evaluaciones/catastro" },
                ] as const
              ).map((doc) => (
                <Card key={doc.key} className="flex flex-col justify-between gap-12">
                  <div>
                    <p className="text-body-sm font-semibold text-ink">
                      {t(`reports.items.${doc.key}.title`)}
                    </p>
                    <p className="mt-4 text-caption leading-[1.5] text-carbon">
                      {t(`reports.items.${doc.key}.summary`)}
                    </p>
                  </div>
                  <DownloadReportButton href={doc.href} label={t("download")} />
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-body-sm font-semibold text-ink">
              {t("templates.title")}
            </h2>
            <p className="mt-4 max-w-[70ch] text-caption leading-[1.5] text-carbon">
              {t("templates.hint")}
            </p>
            <ul className="mt-12 flex flex-col gap-12">
              {DOCUMENT_TEMPLATES.map((template) => (
                <li
                  key={template.id}
                  className="flex flex-wrap items-center justify-between gap-16 rounded-cards border border-stone bg-white p-16"
                >
                  <div className="min-w-0 max-w-[60ch]">
                    <p className="text-body-sm font-semibold text-ink">
                      {template.title}
                    </p>
                    <p className="mt-2 text-caption leading-[1.5] text-carbon">
                      {template.summary}
                    </p>
                  </div>
                  <DownloadReportButton
                    href={`/portal/documentos/${template.id}`}
                    label={t("download")}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
