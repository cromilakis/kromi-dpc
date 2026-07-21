import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui";
import { DomainsMesh, type MeshDomain } from "./domains-mesh";

/**
 * Los 14 dominios (prototipo isLanding §DOMINIOS, anchor #dominios): heading +
 * "malla de seguridad" interactiva (WebGL) visible de inmediato. La carga
 * pesada igual es diferida: el canvas 3D solo monta cuando la sección entra en
 * viewport (IntersectionObserver dentro de DomainsMesh), que cumple el objetivo
 * de lazy-load de la spec UX 2026-07-20 sin esconder el contenido tras un clic
 * (el gate "Aprender más" se probó y se descartó: ocultaba el estándar y
 * desestabilizaba la altura de la página bajo el smooth-scroll).
 * Textos en i18n (landing.domains.mesh).
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
        groupLabels={[t("groups.principles"), t("groups.operational")]}
        phrase={t("mesh.phrase")}
        emptyPrompt={t("mesh.emptyPrompt")}
      />
    </section>
  );
}
