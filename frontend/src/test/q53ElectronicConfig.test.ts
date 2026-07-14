import { describe, expect, it } from "vitest";
import { repairMineruPhysicsOcr, repairPseudoDollarDelimiters } from "../utils/mathRepairCore";
import { normalizeMcqOptionText } from "../utils/questionStemNormalize";
import { displayPyqStem } from "../utils/pyqTextDisplay";

describe("Q53 electronic config OCR repairs", () => {
  it("rewrites orbital \\alpha^ back to d", () => {
    const raw = "$[\\mathrm{Ar}] 3 \\alpha^{3} 4 \\mathrm{s}^{2}$";
    expect(repairMineruPhysicsOcr(raw)).toContain("3 d^{3}");
    expect(repairPseudoDollarDelimiters(raw)).toContain("3 d^{3}");
  });

  it("strips singular choose boilerplate from options", () => {
    expect(
      normalizeMcqOptionText("from the option given below :\nB and E only")
    ).toBe("B and E only");
  });

  it("repairs statement lines under contentTextNormalized", () => {
    const out = displayPyqStem("$[\\mathrm{Ar}] 3 \\alpha^{10} 4 \\mathrm{s}^{1}$", {
      contentTextNormalized: true,
      sourceType: "pyq",
      renderMode: "structured",
    });
    expect(out).toContain("3 d^{10}");
    expect(out).not.toContain("\\alpha");
  });
});
