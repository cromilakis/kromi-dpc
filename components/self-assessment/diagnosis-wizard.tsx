"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { DiagnosisQuestionnaire } from "./diagnosis-questionnaire";
import { DiagnosisResultPanel } from "./diagnosis-result";
import { DiagnosisLeadForm } from "./lead-form";
import { buildPreliminaryPanorama } from "@/lib/self-assessment/panorama";
import { deriveClassification } from "@/lib/diagnosis/derive";
import type { WizardSector } from "@/components/companies/new-company-wizard";

/**
 * Autodiagnóstico de cumplimiento (Ley 21.719) en un solo flujo: al abrir se
 * entra directo a la primera pregunta (delegada a `DiagnosisQuestionnaire`).
 * Al completar el diagnóstico, alterna entre el resultado y la captura del
 * lead.
 */
export function DiagnosisWizard({ sectors }: { sectors: WizardSector[] }) {
  const t = useTranslations("diagnosis");

  const [showLead, setShowLead] = useState(false);

  return (
    <DiagnosisQuestionnaire
      renderComplete={({ result, answers, restart }) => {
        const derived = deriveClassification(answers);
        if (showLead) {
          return (
            <DiagnosisLeadForm
              sectors={sectors}
              sizeTier={derived.sizeTier}
              factors={derived.factors}
              sectorCode={derived.sectorCode}
              diagnosis={{
                riskLevel: result.riskLevel,
                totalBreaches: result.totalBreaches,
              }}
              panorama={buildPreliminaryPanorama(result)}
              answers={answers}
              onBack={() => setShowLead(false)}
            />
          );
        }
        return (
          <>
            <DiagnosisResultPanel
              result={result}
              onGetFullDiagnosis={() => setShowLead(true)}
            />
            <div className="mt-32 text-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowLead(false);
                  restart();
                }}
              >
                {t("nav.restart")}
              </Button>
            </div>
          </>
        );
      }}
    />
  );
}
