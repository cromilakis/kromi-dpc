import { describe, it, expect } from "vitest";
import {
  buildInterviewGuide,
  buildQuestionQueue,
  computeGuideCoverage,
  type GuideControlInput,
} from "@/lib/interview/guide";

const controls: GuideControlInput[] = [
  {
    code: "DPC-LIC-001",
    name: "Bases de licitud",
    sort: 2,
    questions: ["¿Para qué usan cada dato que piden?"],
    criteria: ["¿Existe registro de bases?"],
    domainCode: "LIC",
    domainName: "Licitud",
    domainSort: 1,
    appliesWhen: null,
  },
  {
    code: "DPC-LIC-000",
    name: "Registro de finalidades",
    sort: 1,
    questions: ["¿Tienen un registro de finalidades?"],
    criteria: ["¿Existe el registro?"],
    domainCode: "LIC",
    domainName: "Licitud",
    domainSort: 1,
    appliesWhen: null,
  },
  {
    code: "DPC-DEC-001",
    name: "Decisiones automatizadas",
    sort: 1,
    questions: ["¿Usan decisiones automatizadas sobre personas?"],
    criteria: ["¿Hay revisión humana?"],
    domainCode: "DEC",
    domainName: "Decisiones automatizadas",
    domainSort: 0,
    appliesWhen: { factors_any: ["automated_decisions"] },
  },
  {
    code: "DPC-SEN-001",
    name: "Datos sensibles",
    sort: 1,
    questions: ["¿Tratan datos sensibles?"],
    criteria: ["¿Hay medidas reforzadas?"],
    domainCode: "SEN",
    domainName: "Datos sensibles",
    domainSort: 2,
    appliesWhen: { factors_any: ["sensitive_data"] },
  },
];

describe("buildInterviewGuide", () => {
  it("excluye controles cuyo appliesWhen no matchea los factores de la empresa", () => {
    const guide = buildInterviewGuide(controls, []);
    const codes = guide.flatMap((d) => d.controls.map((c) => c.code));
    expect(codes).not.toContain("DPC-DEC-001");
    expect(codes).not.toContain("DPC-SEN-001");
    expect(codes).toContain("DPC-LIC-001");
  });

  it("agrupa controles aplicables por dominio", () => {
    const guide = buildInterviewGuide(controls, ["sensitive_data"]);
    const licDomain = guide.find((d) => d.domainCode === "LIC");
    expect(licDomain?.controls).toHaveLength(2);
    const senDomain = guide.find((d) => d.domainCode === "SEN");
    expect(senDomain?.controls).toHaveLength(1);
  });

  it("descarta dominios que quedan sin ningún control aplicable", () => {
    const guide = buildInterviewGuide(controls, []);
    const domainCodes = guide.map((d) => d.domainCode);
    expect(domainCodes).not.toContain("DEC");
    expect(domainCodes).not.toContain("SEN");
  });

  it("ordena dominios por domainSort y controles por sort dentro del dominio", () => {
    const guide = buildInterviewGuide(controls, ["automated_decisions", "sensitive_data"]);
    expect(guide.map((d) => d.domainCode)).toEqual(["DEC", "LIC", "SEN"]);
    const licDomain = guide.find((d) => d.domainCode === "LIC");
    expect(licDomain?.controls.map((c) => c.code)).toEqual([
      "DPC-LIC-000",
      "DPC-LIC-001",
    ]);
  });

  it("mapea GuideControl solo con code/name/questions/criteria (sin campos internos)", () => {
    const guide = buildInterviewGuide(controls, []);
    const control = guide[0]?.controls[0];
    expect(control).toEqual({
      code: "DPC-LIC-000",
      name: "Registro de finalidades",
      questions: ["¿Tienen un registro de finalidades?"],
      criteria: ["¿Existe el registro?"],
    });
  });
});

describe("computeGuideCoverage", () => {
  const guide = buildInterviewGuide(controls, ["automated_decisions"]);
  // guide = [DEC (1 control), LIC (2 controles)]

  it("marca como sin cubrir un control sin respuestas registradas", () => {
    const { total, covered, uncovered } = computeGuideCoverage(guide, {});
    expect(total).toBe(3);
    expect(covered).toBe(0);
    expect(uncovered).toHaveLength(3);
    expect(uncovered).toContainEqual({
      domainCode: "DEC",
      controlCode: "DPC-DEC-001",
      controlName: "Decisiones automatizadas",
    });
  });

  it("marca como sin cubrir un control cuyos criterios están todos 'unknown'", () => {
    const { covered, uncovered } = computeGuideCoverage(guide, {
      "DPC-DEC-001": ["unknown", "unknown"],
    });
    expect(covered).toBe(0);
    expect(uncovered.map((u) => u.controlCode)).toContain("DPC-DEC-001");
  });

  it("marca como cubierto un control con al menos una respuesta distinta de 'unknown'", () => {
    const { total, covered, uncovered } = computeGuideCoverage(guide, {
      "DPC-DEC-001": ["yes"],
    });
    expect(total).toBe(3);
    expect(covered).toBe(1);
    expect(uncovered.map((u) => u.controlCode)).not.toContain("DPC-DEC-001");
    expect(uncovered).toHaveLength(2);
  });
});

describe("buildQuestionQueue", () => {
  const guide = buildInterviewGuide(controls, ["automated_decisions"]);
  // guide = [DEC (1 control, 1 pregunta), LIC (2 controles, 1 pregunta c/u)]

  it("marca answered=false las preguntas de un control sin respuestas y las ubica primero", () => {
    const queue = buildQuestionQueue(guide, {});
    expect(queue.every((q) => q.answered === false)).toBe(true);
    const decQuestion = queue.find((q) => q.controlCode === "DPC-DEC-001");
    expect(decQuestion).toMatchObject({
      domainCode: "DEC",
      domainName: "Decisiones automatizadas",
      controlCode: "DPC-DEC-001",
      controlName: "Decisiones automatizadas",
      question: "¿Usan decisiones automatizadas sobre personas?",
      answered: false,
    });
  });

  it("marca answered=true las preguntas de un control con al menos una respuesta 'yes'", () => {
    const queue = buildQuestionQueue(guide, { "DPC-DEC-001": ["yes"] });
    const decQuestion = queue.find((q) => q.controlCode === "DPC-DEC-001");
    expect(decQuestion?.answered).toBe(true);
  });

  it("marca answered=true un control con una respuesta 'flagged' (alerta cuenta como respuesta)", () => {
    const queue = buildQuestionQueue(guide, { "DPC-DEC-001": ["flagged"] });
    const decQuestion = queue.find((q) => q.controlCode === "DPC-DEC-001");
    expect(decQuestion?.answered).toBe(true);
  });

  it("ordena las preguntas no respondidas antes que las respondidas", () => {
    const queue = buildQuestionQueue(guide, { "DPC-DEC-001": ["yes"] });
    expect(queue).toHaveLength(3);
    expect(queue[0]?.answered).toBe(false);
    expect(queue[1]?.answered).toBe(false);
    expect(queue[2]?.controlCode).toBe("DPC-DEC-001");
    expect(queue[2]?.answered).toBe(true);
    const unansweredCodes = queue.slice(0, 2).map((q) => q.controlCode);
    expect(unansweredCodes.sort()).toEqual(["DPC-LIC-000", "DPC-LIC-001"]);
  });
});
