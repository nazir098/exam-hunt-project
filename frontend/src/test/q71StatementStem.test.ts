import { describe, expect, it } from "vitest";
import {
  repairPseudoDollarDelimiters,
  unwrapProseMathDelimiters,
  repairStrayDisplayDollars,
  wrapBareIonSuperscripts,
} from "../utils/mathRepairCore";
import { displayPyqStem } from "../utils/pyqTextDisplay";
import { parseAssertionReasonStem } from "../utils/assertionReasonStem";

describe("statement stem math repair", () => {
  it("unwraps English prose wrongly wrapped in $...$", () => {
    expect(unwrapProseMathDelimiters("$Given below are two statements :$")).toBe(
      "Given below are two statements :"
    );
  });

  it("repairs mid-sentence $$ that breaks remark-math", () => {
    const broken =
      "electrons in a $Cr^{2+}$ ion (Z = 24) is the same as that of a$$\\mathrm{Nd}^{3+} \\mathrm{ion} \\left( \\mathrm{Z} = 60 \\right)$";
    const fixed = repairPseudoDollarDelimiters(broken);
    expect(fixed).not.toContain("$$");
    expect(fixed).toContain("$Cr^{2+}$");
    expect(fixed).toContain("$\\mathrm{Nd}^{3+}$");
    expect(fixed).toContain(" ion ");
    expect((fixed.match(/\$/g) || []).length % 2).toBe(0);
  });

  it("renders Q71-style statement parts cleanly", () => {
    const stem = `Given below are two statements :
Statement I : Ferromagnetism is considered as an extreme form of paramagnetism.
Statement II : The number of unpaired electrons in a Cr^{2+} ion (Z = 24) is the same as that of a $\\mathrm{Nd}^{3+} \\mathrm{ion} \\left( \\mathrm{Z} = 60 \\right)$
In the light of the above statements, choose the correct answer from the options given below :`;
    const parsed = parseAssertionReasonStem(stem)!;
    const opts = { contentTextNormalized: true, renderMode: "structured", sourceType: "pyq" };
    expect(displayPyqStem(parsed.intro, opts)).toBe("Given below are two statements :");
    const second = displayPyqStem(parsed.second, opts);
    expect(second).toContain("$Cr^{2+}$");
    expect(second).not.toContain("$$");
    expect(second).toContain(" ion ");
    expect(second).not.toMatch(/\\mathrm\{ion\}/);
  });

  it("keeps real math delimiters", () => {
    expect(repairStrayDisplayDollars("$$\nE=mc^2\n$$")).toContain("$$");
    expect(unwrapProseMathDelimiters("$Cr^{2+}$")).toBe("$Cr^{2+}$");
  });

  it("wraps plain ASCII ion charges like Co2+", () => {
    expect(wrapBareIonSuperscripts("Co2+")).toBe("$Co^{2+}$");
    expect(wrapBareIonSuperscripts("Al3+")).toBe("$Al^{3+}$");
    expect(wrapBareIonSuperscripts("already $Mg^{2+}$ ok")).toBe("already $Mg^{2+}$ ok");
  });
});
