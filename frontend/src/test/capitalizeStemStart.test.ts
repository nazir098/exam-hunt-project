import { describe, expect, it } from "vitest";
import { capitalizeStemStart } from "../utils/variantLabels";

describe("capitalizeStemStart", () => {
  it("capitalizes plain English stems", () => {
    expect(capitalizeStemStart("which of the following")).toBe("Which of the following");
  });

  it("does not break chemistry LaTeX \\mathrm commands", () => {
    const formula = "$[\\mathrm{NiCl4}]^{2-}$";
    expect(capitalizeStemStart(formula)).toBe(formula);
    expect(capitalizeStemStart(formula)).not.toContain("\\Mathrm");
  });

  it("leaves bare bracketed LaTeX alone", () => {
    const formula = "[\\mathrm{NiCl4}]^{2-}$";
    expect(capitalizeStemStart(formula)).toBe(formula);
  });
});
