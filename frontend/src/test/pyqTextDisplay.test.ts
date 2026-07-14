import { describe, expect, it } from "vitest";
import {
  displayPyqOption,
  displayPyqSolution,
  displayPyqStem,
} from "../utils/pyqTextDisplay";
import { normalizeSolutionText } from "../utils/questionStemNormalize";

describe("displayPyqStem", () => {
  const raw = "Then field :\n(1) A (2) B (3) C (4) D";

  it("skips normalize when contentTextNormalized", () => {
    expect(displayPyqStem(raw, { contentTextNormalized: true })).toBe(raw);
  });

  it("skips normalize for structured hybrid PYQ", () => {
    expect(displayPyqStem(raw, { sourceType: "pyq", renderMode: "hybrid" })).toBe(raw);
  });

  it("wraps bare LaTeX statement lines on structured imports", () => {
    const bare = "\\mathrm{K}_{a_{1}} > K_{a_{2}} > K_{a_{3}}";
    expect(displayPyqStem(bare, { contentTextNormalized: true, renderMode: "hybrid" })).toBe(
      `$${bare}$`
    );
  });

  it("closes a dangling opening $ on chemistry statement lines", () => {
    const broken = "${\\mathrm{Ni}} ( {\\mathrm{CO}} ) _{4}";
    expect(displayPyqStem(broken, { contentTextNormalized: true, renderMode: "hybrid" })).toBe(
      "${\\mathrm{Ni}} ( {\\mathrm{CO}} ) _{4}$"
    );
  });

  it("repairs MinerU \\left$$ damage on structured stems", () => {
    const broken =
      "given by E_{z} = 60 \\cos\\left$$5x + 1.5 \\times 10^{9} t \\right)\\mathrm{V/m}";
    const out = displayPyqStem(broken, { contentTextNormalized: true, renderMode: "hybrid" });
    expect(out).toContain("\\cos\\left(");
    expect(out).not.toContain("\\left$$");
    expect(out).not.toMatch(/\$\\cos\$\$\\left\$/);
    expect(out).toMatch(/\$E_\{z\}[\s\S]*\\mathrm\{V\/m\}\$/);
  });

  it("repairs mangled \\right)arrow back to \\rightarrow", () => {
    const mangled =
      "$C(s) + 2H_{2}(g) \\right)arrow CH_{4}(g); \\Delta H = -74.8 \\, \\text{kJ mol}^{-1}.$";
    const out = displayPyqStem(mangled, { contentTextNormalized: true, renderMode: "hybrid" });
    expect(out).toContain("\\rightarrow");
    expect(out).not.toContain("\\right)arrow");
  });

  it("leaves intact \\rightarrow alone", () => {
    const good =
      "$C(s) + 2H_{2}(g) \\rightarrow CH_{4}(g); \\Delta H = -74.8 \\, \\text{kJ mol}^{-1}.$";
    const out = displayPyqStem(good, { contentTextNormalized: true, renderMode: "hybrid" });
    expect(out).toContain("\\rightarrow");
    expect(out).not.toContain("\\right)arrow");
  });

  it("normalizes legacy image-mode PYQ", () => {
    const out = displayPyqStem(raw, { sourceType: "pyq", renderMode: "image" });
    expect(out).toBe("Then field :");
  });
});

describe("displayPyqSolution", () => {
  const raw = "Sol.\n\\begin{array}{l}\n x \n\\end{array}";

  it("skips normalize when contentTextNormalized", () => {
    expect(displayPyqSolution(raw, { contentTextNormalized: true })).toContain("\\begin{array}{l}");
  });

  it("repairs blank-line-split markdown solution tables and wraps ions", () => {
    const broken = `|  | Ion | Group number in Cation Analysis |

| --- | --- | --- |

| A. | Co2+ | Group-IV |

| B. | Mg2+ | Group-VI |

| C. | Pb2+ | Group-I |

| D. | Al3+ | Group-III |`;
    const out = displayPyqSolution(broken, { contentTextNormalized: true });
    expect(out).not.toMatch(/\|\n\n\|/);
    expect(out).toContain("| A. | $Co^{2+}$ | Group-IV |");
    expect(out).toContain("| D. | $Al^{3+}$ | Group-III |");
    expect(normalizeSolutionText(broken)).not.toMatch(/\|\n\n\|/);
  });

  it("normalizes when flag unset", () => {
    const out = displayPyqSolution(raw);
    expect(out).toContain("$$");
    expect(out).not.toMatch(/^Sol\./);
  });
});

describe("displayPyqOption", () => {
  const raw = "B_{y} = 2 \\cos\\left$$x\\right)$$";

  it("repairs \\left$$ for structured imports", () => {
    const out = displayPyqOption(raw, { renderMode: "structured" });
    expect(out).toContain("\\cos\\left(");
    expect(out).not.toContain("\\left$$");
    expect(out.startsWith("$")).toBe(true);
  });

  it("normalizes legacy options", () => {
    const out = displayPyqOption(raw, { renderMode: "image" });
    expect(out).toContain("\\cos\\left(");
  });

  it("repairs EM-wave option bodies", () => {
    const broken =
      "B_{y} = 2 \\times 10^{-7} \\cos\\left$$5x + 1.5 \\times 10^{9} t \\right)$$T";
    const out = displayPyqOption(broken, { contentTextNormalized: true, renderMode: "hybrid" });
    expect(out).toContain("\\cos\\left(");
    expect(out).not.toContain("$$");
    expect(out.startsWith("$")).toBe(true);
    expect(out.endsWith("$")).toBe(true);
  });
});
