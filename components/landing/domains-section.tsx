import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui";
import { DomainsMesh, type MeshDomain } from "./domains-mesh";

/**
 * Los 14 dominios (prototipo isLanding §DOMINIOS, anchor #dominios): heading +
 * "malla de seguridad" interactiva (WebGL) — la lista de dominios a un lado y
 * una malla de energía que envuelve un núcleo de información al otro. Al elegir
 * un dominio, su color tiñe la escena. Los textos salen de i18n
 * (landing.domains.mesh); el detalle legal completo vive en la plataforma interna.
 */
export async function DomainsSection() {
  const t = await getTranslations("landing.domains");
  const domains = t.raw("mesh.domains") as MeshDomain[];

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

      <DomainsMesh
        domains={domains}
        phrase={t("mesh.phrase")}
        emptyPrompt={t("mesh.emptyPrompt")}
      />
    </section>
  );
}
