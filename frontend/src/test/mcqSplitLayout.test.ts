import { describe, expect, it } from "vitest";
import {
  estimateStemLineCount,
  optionsEmbedFigures,
  shouldUseMcqSplitLayout,
} from "../utils/mcqSplitLayout";

const shortOptions = [
  { id: "1", text: "$\\vec{E}$ perpendicular to $B$" },
  { id: "2", text: "Same direction as $B$" },
  { id: "3", text: "Opposite to $B$" },
  { id: "4", text: "Zero field" },
];

describe("shouldUseMcqSplitLayout", () => {
  it("is disabled — options stay under the stem (2×2 or 4×1)", () => {
    expect(
      shouldUseMcqSplitLayout({
        viewportWideEnough: true,
        format: "mcq",
        questionText:
          "An electron moves in magnetic and electric fields. Which statement is correct?",
        options: shortOptions,
        hasStemDiagram: false,
        hasInlineStemAssets: false,
        optionsHaveFigures: false,
      })
    ).toBe(false);
  });

  it("rejects diagram stems even if re-enabled later", () => {
    expect(
      shouldUseMcqSplitLayout({
        viewportWideEnough: true,
        format: "mcq",
        questionText: "Short stem?",
        options: shortOptions,
        hasStemDiagram: true,
        hasInlineStemAssets: false,
        optionsHaveFigures: false,
      })
    ).toBe(false);
  });
});

describe("estimateStemLineCount", () => {
  it("counts soft-wrapped length", () => {
    expect(estimateStemLineCount("a".repeat(120))).toBeGreaterThan(1);
  });
});

describe("optionsEmbedFigures", () => {
  it("detects asset markers", () => {
    expect(optionsEmbedFigures([{ id: "1", text: "{{asset:0}}" }])).toBe(true);
    expect(optionsEmbedFigures([{ id: "1", text: "plain" }])).toBe(false);
  });
});
