import { describe, it, expect } from "vitest";
import { mapAnswersToControlStatus } from "@/lib/interview/auto-map";
import { criterionAnswerSchema } from "@/lib/interview/answers-schema";

describe("mapAnswersToControlStatus", () => {
  it("all yes -> compliant", () => {
    expect(mapAnswersToControlStatus(["yes", "yes"])).toBe("compliant");
  });
  it("all no -> non_compliant", () => {
    expect(mapAnswersToControlStatus(["no", "no"])).toBe("non_compliant");
  });
  it("mix of yes and no -> partial", () => {
    expect(mapAnswersToControlStatus(["yes", "no"])).toBe("partial");
  });
  it("any partial -> partial", () => {
    expect(mapAnswersToControlStatus(["yes", "partial"])).toBe("partial");
  });
  it("empty or all unknown -> pending", () => {
    expect(mapAnswersToControlStatus([])).toBe("pending");
    expect(mapAnswersToControlStatus(["unknown", "unknown"])).toBe("pending");
  });
  it("unknown is ignored alongside real answers", () => {
    expect(mapAnswersToControlStatus(["yes", "unknown"])).toBe("compliant");
  });

  it("flagged (requiere aclaración) is ignored like unknown", () => {
    expect(mapAnswersToControlStatus(["yes", "flagged"])).toBe("compliant");
    expect(mapAnswersToControlStatus(["flagged"])).toBe("pending");
    expect(mapAnswersToControlStatus(["no", "flagged"])).toBe("non_compliant");
    expect(mapAnswersToControlStatus(["unknown", "flagged"])).toBe("pending");
  });
});

describe("criterionAnswerSchema", () => {
  it("accepts 'flagged'", () => {
    expect(criterionAnswerSchema.parse("flagged")).toBe("flagged");
  });
});
