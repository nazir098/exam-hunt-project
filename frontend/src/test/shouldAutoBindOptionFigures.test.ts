import { describe, expect, it } from "vitest";
import { shouldAutoBindOptionFigures } from "../utils/questionRender";

const placements = [0, 1, 2, 3, 4].map((index) => ({
  index,
  marker: `{{asset:${index}}}`,
  path: `fig_${index}.webp`,
  url: `https://cdn.example/fig_${index}.webp`,
}));

describe("shouldAutoBindOptionFigures", () => {
  it("does not auto-bind when stem already embeds {{asset:0}}", () => {
    expect(
      shouldAutoBindOptionFigures(
        "Predict the major product\n{{asset:0}}",
        placements,
        "NEET_2025_Q49"
      )
    ).toBe(false);
  });

  it("auto-binds asset:1–4 when stem has no inline assets", () => {
    expect(
      shouldAutoBindOptionFigures("Choose the correct option", placements, "Q1")
    ).toBe(true);
  });

  it("requires all four option assets when stem has no markers", () => {
    expect(
      shouldAutoBindOptionFigures("Choose", placements.slice(0, 3), "Q2")
    ).toBe(false);
  });
});
