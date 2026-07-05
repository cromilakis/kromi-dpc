import { afterEach, describe, expect, it, vi } from "vitest";

import type { ControlLike } from "@/lib/interview/questions";

vi.mock("@/lib/llm/deepseek", async () => {
  const actual = await vi.importActual<typeof import("@/lib/llm/deepseek")>(
    "@/lib/llm/deepseek",
  );
  return {
    ...actual,
    chatJSON: vi.fn(),
  };
});

import { chatJSON, LlmError } from "@/lib/llm/deepseek";
import { extractDiagnosis, sanitizeExtraction } from "@/lib/llm/extract-diagnosis";

const controls: ControlLike[] = [
  {
    code: "C1",
    name: "Ctrl 1",
    domain_id: "d",
    verification_criteria: ["a", "b"],
    appliesWhen: {},
  },
];

describe("sanitizeExtraction", () => {
  it("descarta RAT sin evidencia y lo manda a unassigned", () => {
    const out = sanitizeExtraction(
      {
        rat: [{ fields: { name: "X" }, evidence: {} }],
        compliance: [],
        unassigned: [],
      },
      controls,
    );
    expect(out.rat).toHaveLength(0);
    expect(out.unassigned.length).toBeGreaterThan(0);
  });

  it("descarta RAT cuando las llaves de evidence no corresponden a campos presentes", () => {
    const out = sanitizeExtraction(
      {
        rat: [{ fields: { name: "X" }, evidence: { purpose: "cita sobre el propósito" } }],
        compliance: [],
        unassigned: [],
      },
      controls,
    );
    expect(out.rat).toHaveLength(0);
    expect(out.unassigned).toHaveLength(1);
  });

  it("acepta RAT con evidencia que corresponde a los campos presentes", () => {
    const out = sanitizeExtraction(
      {
        rat: [{ fields: { name: "X" }, evidence: { name: "se llama X" } }],
        compliance: [],
        unassigned: [],
      },
      controls,
    );
    expect(out.rat).toHaveLength(1);
    expect(out.unassigned).toHaveLength(0);
  });

  it("descarta compliance con control inexistente o índice fuera de rango", () => {
    const out = sanitizeExtraction(
      {
        rat: [],
        compliance: [
          { controlCode: "NOPE", criterionIndex: 0, answer: "yes", evidence: "cita" },
          { controlCode: "C1", criterionIndex: 5, answer: "no", evidence: "cita" },
          { controlCode: "C1", criterionIndex: 1, answer: "yes", evidence: "cita" },
        ],
        unassigned: [],
      },
      controls,
    );
    expect(out.compliance).toHaveLength(1);
    expect(out.compliance[0]).toMatchObject({ controlCode: "C1", criterionIndex: 1 });
    expect(out.unassigned).toHaveLength(2);
  });

  it("descarta compliance con evidencia en blanco", () => {
    const out = sanitizeExtraction(
      {
        rat: [],
        compliance: [{ controlCode: "C1", criterionIndex: 0, answer: "yes", evidence: "   " }],
        unassigned: [],
      },
      controls,
    );
    expect(out.compliance).toHaveLength(0);
    expect(out.unassigned).toHaveLength(1);
  });
});

describe("extractDiagnosis", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve la extracción sanitizada cuando el LLM responde JSON válido", async () => {
    const validPayload = {
      rat: [{ fields: { name: "X" }, evidence: { name: "se llama X" } }],
      compliance: [{ controlCode: "C1", criterionIndex: 0, answer: "yes", evidence: "cita" }],
      unassigned: [],
    };
    vi.mocked(chatJSON).mockResolvedValueOnce({
      content: JSON.stringify(validPayload),
      usage: undefined,
    });

    const out = await extractDiagnosis({ transcript: "una transcripción", controls });
    expect(out.rat).toHaveLength(1);
    expect(out.compliance).toHaveLength(1);
    expect(chatJSON).toHaveBeenCalledTimes(1);
  });

  it("reintenta una vez ante JSON inválido y luego lanza llm_failed", async () => {
    vi.mocked(chatJSON).mockResolvedValueOnce({ content: "no es json", usage: undefined });
    vi.mocked(chatJSON).mockResolvedValueOnce({ content: "tampoco", usage: undefined });

    await expect(
      extractDiagnosis({ transcript: "una transcripción", controls }),
    ).rejects.toMatchObject({ code: "llm_failed" });
    expect(chatJSON).toHaveBeenCalledTimes(2);
  });

  it("propaga llm_disabled sin reintentar", async () => {
    vi.mocked(chatJSON).mockRejectedValueOnce(new LlmError("llm_disabled"));

    await expect(
      extractDiagnosis({ transcript: "una transcripción", controls }),
    ).rejects.toMatchObject({ code: "llm_disabled" });
    expect(chatJSON).toHaveBeenCalledTimes(1);
  });
});
