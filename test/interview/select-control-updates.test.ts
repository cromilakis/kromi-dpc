import { describe, it, expect } from "vitest";
import { selectControlUpdates } from "@/lib/interview/select-control-updates";

describe("selectControlUpdates", () => {
  it("excludes an all-unknown control (pending dropped)", () => {
    expect(selectControlUpdates({ "A.1": ["unknown", "unknown"] })).toEqual([]);
  });

  it("includes a yes/yes control as compliant", () => {
    expect(selectControlUpdates({ "A.1": ["yes", "yes"] })).toEqual([
      { controlCode: "A.1", status: "compliant" },
    ]);
  });

  it("includes a mixed control as partial", () => {
    expect(selectControlUpdates({ "A.1": ["yes", "no"] })).toEqual([
      { controlCode: "A.1", status: "partial" },
    ]);
  });

  it("includes an all-no control as non_compliant", () => {
    expect(selectControlUpdates({ "A.1": ["no", "no"] })).toEqual([
      { controlCode: "A.1", status: "non_compliant" },
    ]);
  });

  it("empty input -> []", () => {
    expect(selectControlUpdates({})).toEqual([]);
  });

  it("mixes evaluated and untouched controls, preserving input key order", () => {
    expect(
      selectControlUpdates({
        "A.1": ["unknown", "unknown"],
        "A.2": ["yes", "yes"],
        "A.3": ["no"],
      }),
    ).toEqual([
      { controlCode: "A.2", status: "compliant" },
      { controlCode: "A.3", status: "non_compliant" },
    ]);
  });
});
