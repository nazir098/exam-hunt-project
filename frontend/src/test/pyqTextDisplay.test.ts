import { describe, expect, it } from "vitest";
import {
  displayPyqOption,
  displayPyqSolution,
  displayPyqStem,
} from "../utils/pyqTextDisplay";

describe("displayPyqStem", () => {
  const raw = "Then field :\n(1) A (2) B (3) C (4) D";

  it("skips normalize when contentTextNormalized", () => {
    expect(displayPyqStem(raw, { contentTextNormalized: true })).toBe(raw);
  });

  it("skips normalize for structured hybrid PYQ", () => {
    expect(displayPyqStem(raw, { sourceType: "pyq", renderMode: "hybrid" })).toBe(raw);
  });

  it("normalizes legacy image-mode PYQ", () => {
    const out = displayPyqStem(raw, { sourceType: "pyq", renderMode: "image" });
    expect(out).toBe("Then field :");
  });
});

describe("displayPyqSolution", () => {
  const raw = "Sol.\n\\begin{array}{l}\n x \n\\end{array}";

  it("skips normalize when contentTextNormalized", () => {
    expect(displayPyqSolution(raw, { contentTextNormalized: true })).toBe(raw);
  });

  it("normalizes when flag unset", () => {
    const out = displayPyqSolution(raw);
    expect(out).toContain("$$");
    expect(out).not.toMatch(/^Sol\./);
  });
});

describe("displayPyqOption", () => {
  const raw = "B_{y} = 2 \\cos\\left$$x\\right)$$";

  it("skips normalize for structured imports", () => {
    expect(displayPyqOption(raw, { renderMode: "structured" })).toBe(raw);
  });

  it("normalizes legacy options", () => {
    const out = displayPyqOption(raw, { renderMode: "image" });
    expect(out).toContain("\\cos\\left(");
  });
});
