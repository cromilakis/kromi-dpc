import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui";
import { CertificateCard } from "./certificate-card";
import { DeliveryDocs, type DeliveryGroup } from "./delivery-docs";

/**
 * El entregable (prototipo isLanding §ENTREGABLE, anchor implícito): la entrega
 * final = el certificado verificable + su documentación. Arriba, encabezado y el
 * certificado privado DPC (con fecha + hash). Abajo, el expediente de
 * cumplimiento en 3D y el detalle de qué contiene en dos ejes (qué datos maneja
 * la empresa / cómo trata y protege cada uno) — la prueba de tratamiento que
 * agiliza la fiscalización. Textos desde i18n (landing.deliverable).
 */
export async function DeliverableSection() {
  const t = await getTranslations("landing.deliverable");
  const groups = t.raw("docs.groups") as DeliveryGroup[];

  return (
    <section className="mx-auto w-full max-w-[1180px] px-32 py-80 max-sm:px-16 max-sm:py-60">
      <div className="grid grid-cols-1 items-center gap-48 lg:grid-cols-[1fr_1.05fr] lg:gap-[64px]">
        <div>
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            className="mb-16"
          />
          <p className="text-body leading-body tracking-body text-carbon">
            {t("description")}
          </p>
        </div>

        <CertificateCard
          eyebrow={t("certificate.eyebrow")}
          title={t("certificate.title")}
          subtitle={t("certificate.subtitle")}
          issued={t("certificate.issued")}
          hash={t("certificate.hash")}
          status={t("certificate.status")}
        />
      </div>

      <div className="mt-48 border-t border-ash pt-40 max-sm:mt-32 max-sm:pt-28">
        <DeliveryDocs
          intro={t("docs.intro")}
          docTitle={t("docs.docTitle")}
          docSubtitle={t("docs.docSubtitle")}
          groups={groups}
        />
      </div>
    </section>
  );
}
