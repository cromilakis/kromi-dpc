import { describe, it, expect } from "vitest";
import {
  buildProposalPrompt,
  sanitizeProposal,
  type RemediationGap,
} from "@/lib/llm/propose-remediation";

const gaps: RemediationGap[] = [
  {
    controlCode: "DPC-CAL-001",
    controlName: "Calidad",
    criterionIndex: 0,
    criterion: "¿Existe procedimiento de actualización?",
    gapType: "partial",
  },
];

describe("buildProposalPrompt", () => {
  it("incluye system + user y menciona los criterios de los gaps", () => {
    const msgs = buildProposalPrompt(gaps);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
    expect(msgs[1].content).toContain("DPC-CAL-001");
    expect(msgs[1].content).toContain("procedimiento de actualización");
  });
});

describe("sanitizeProposal", () => {
  it("acepta un item válido que calza con un gap", () => {
    const out = sanitizeProposal(
      {
        items: [
          {
            controlCode: "DPC-CAL-001",
            criterionIndex: 0,
            gapType: "partial",
            action: "Definir procedimiento de actualización y rectificación.",
            priority: "media",
            effort: "medio",
            suggestedDueWeeks: 4,
            rationale: "El criterio de actualización está parcial.",
          },
        ],
      },
      gaps,
    );
    expect(out).toHaveLength(1);
    expect(out[0].action).toContain("procedimiento");
  });

  it("descarta un item con action vacía (cero asunciones)", () => {
    const out = sanitizeProposal(
      {
        items: [
          {
            controlCode: "DPC-CAL-001",
            criterionIndex: 0,
            gapType: "partial",
            action: "   ",
            priority: "media",
            effort: "medio",
            suggestedDueWeeks: 4,
            rationale: "x",
          },
        ],
      },
      gaps,
    );
    expect(out).toHaveLength(0);
  });

  it("descarta un item que no corresponde a ningún gap enviado", () => {
    const out = sanitizeProposal(
      {
        items: [
          {
            controlCode: "DPC-XXX-999",
            criterionIndex: 3,
            gapType: "no",
            action: "Algo inventado.",
            priority: "alta",
            effort: "alto",
            suggestedDueWeeks: 2,
            rationale: "x",
          },
        ],
      },
      gaps,
    );
    expect(out).toHaveLength(0);
  });

  it("normaliza priority fuera de enum a un default seguro (no tumba el item)", () => {
    const out = sanitizeProposal(
      {
        items: [
          {
            controlCode: "DPC-CAL-001",
            criterionIndex: 0,
            gapType: "partial",
            action: "Acción válida.",
            priority: "URGENTE",
            effort: "medio",
            suggestedDueWeeks: 4,
            rationale: "x",
          },
        ],
      },
      gaps,
    );
    expect(out).toHaveLength(1);
    expect(out[0].priority).toBe("media");
  });

  it("dedupe por gap: dos items para el mismo criterio -> uno", () => {
    const item = {
      controlCode: "DPC-CAL-001",
      criterionIndex: 0,
      gapType: "partial",
      action: "Acción.",
      priority: "media",
      effort: "medio",
      suggestedDueWeeks: 4,
      rationale: "x",
    };
    const out = sanitizeProposal({ items: [item, { ...item, action: "Otra." }] }, gaps);
    expect(out).toHaveLength(1);
  });
});
