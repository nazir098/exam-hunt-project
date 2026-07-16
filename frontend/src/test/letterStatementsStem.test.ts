import { describe, expect, it } from "vitest";
import { parseLetterStatementsStem } from "../utils/letterStatementsStem";

describe("parseLetterStatementsStem", () => {
  it("parses two-statement A/B stems (NEET solar-cell style)", () => {
    const raw = `Consider the following statements A and B and identify the correct answer:
{{asset:0}}
A. For a solar-cell, the I-V characteristics lies in the IV quadrant of the given graph.
B. In a reverse biased pn junction diode, the current measured in ($\\mu$ A), is due to majority charge carriers.
(1) A is incorrect but B is correct
(2) Both A and B are correct
(3) Both A and B are incorrect
(4) A is correct but B is incorrect`;
    const parsed = parseLetterStatementsStem(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.statements).toHaveLength(2);
    expect(parsed!.statements[0].id).toBe("A");
    expect(parsed!.statements[1].id).toBe("B");
    expect(parsed!.intro).toContain("{{asset:0}}");
    expect(parsed!.statements[0].text).toContain("solar-cell");
  });

  it("still parses three-plus letter statements", () => {
    const raw = `Given below are three statements:
A. First
B. Second
C. Third
(1) A only`;
    const parsed = parseLetterStatementsStem(raw);
    expect(parsed?.statements.map((s) => s.id)).toEqual(["A", "B", "C"]);
  });
});
