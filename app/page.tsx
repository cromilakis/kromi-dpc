import { AgenciesCloud } from "@/components/landing/agencies-cloud";
import { CtaBand } from "@/components/landing/cta-band";
import { CycleSection } from "@/components/landing/cycle-section";
import { DeliverableSection } from "@/components/landing/deliverable-section";
import { DomainsSection } from "@/components/landing/domains-section";
import { FaqSection } from "@/components/landing/faq-section";
import { Hero } from "@/components/landing/hero";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { ModelSection } from "@/components/landing/model-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { SupportSection } from "@/components/landing/support-section";
import { TrustSection } from "@/components/landing/trust-section";

/**
 * Landing pública DPC — réplica de la sección isLanding del prototipo
 * (design/prototype.dc.html), en el orden exacto de sus secciones:
 * nav sticky → hero + banda Ley 21.719 → 14 dominios → logo cloud →
 * ciclo de servicio → entregable → confianza → CTA intermedio →
 * acompañamiento → modelo de servicio → FAQ → inversión/CTA final → footer Abyss.
 * Todo server components; los textos salen de messages/es.json (next-intl).
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip bg-white">
      <LandingNav />
      <main id="main" className="flex-1">
        <Hero />
        <DomainsSection />
        <AgenciesCloud />
        <CycleSection />
        <DeliverableSection />
        <TrustSection />
        <CtaBand />
        <SupportSection />
        <ModelSection />
        <FaqSection />
        <PricingSection />
      </main>
      <LandingFooter />
    </div>
  );
}
