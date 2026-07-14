import { describe, expect, it } from "vitest";
import {
  listBDisplayLabel,
  parseMatchingTableStem,
  resolveMatchingColumns,
} from "../utils/matchingVariant";
import { wrapBareIonSuperscripts } from "../utils/mathRepairCore";
import { displayPyqStem } from "../utils/pyqTextDisplay";

describe("parseMatchingTableStem", () => {
  it("parses 4-column MinerU tables (vitamins-style)", () => {
    const stem = `Match List-I with List-II.
| | List-I(Name of Vitamin) | | List-II(Deficiency disease) |
| --- | --- | --- | --- |
| A. | Vitamin $B_{12}$ | I. | Cheilosis |
| B. | Vitamin D | II. | Convulsions |
| C. | Vitamin $B_{2}$ | III. | Rickets |
| D. | Vitamin $B_{6}$ | IV. | Pernicious anaemia |`;
    const parsed = parseMatchingTableStem(stem);
    expect(parsed?.intro).toBe("Match List-I with List-II");
    expect(parsed?.listA.map((x) => x.text)).toEqual([
      "Vitamin $B_{12}$",
      "Vitamin D",
      "Vitamin $B_{2}$",
      "Vitamin $B_{6}$",
    ]);
    expect(parsed?.listB.map((x) => x.text)).toEqual([
      "Cheilosis",
      "Convulsions",
      "Rickets",
      "Pernicious anaemia",
    ]);
  });

  it("parses cation-analysis table with plain ASCII ions (Q48)", () => {
    const stem = `Match List I with List II
| | List-I (Ion) | | List-II (Group Number in Cation Analysis) |
| --- | --- | --- | --- |
| A. | Co2+ | I. | Group-I |
| B. | Mg2+ | II. | Group-III |
| C. | Pb2+ | III. | Group-IV |
| D. | Al3+ | IV. | Group-VI |`;
    const parsed = parseMatchingTableStem(stem);
    expect(parsed?.listA.map((x) => x.text)).toEqual(["Co2+", "Mg2+", "Pb2+", "Al3+"]);
    expect(parsed?.listB.map((x) => x.id)).toEqual(["I", "II", "III", "IV"]);
    expect(listBDisplayLabel(parsed!.listB[2], 2)).toBe("III.");
    const opts = { contentTextNormalized: true, renderMode: "hybrid", sourceType: "pyq" };
    expect(displayPyqStem(parsed!.listA[0].text, opts)).toBe("$Co^{2+}$");
    expect(displayPyqStem(parsed!.listA[3].text, opts)).toBe("$Al^{3+}$");
  });

  it("parses 2-column MinerU tables (Q66-style)", () => {
    const stem = `Match List-I with List-II.
| List-I | List-II |
|------------|-------------|
| (Example) | (Type of Solution)|
| A. Humidity | I. Solid in solid |
| B. Alloys | II. Liquid in gas |
| C. Amalgams | III. Solid in gas |
| D. Smoke | IV. Liquid in solid |`;
    const parsed = parseMatchingTableStem(stem);
    expect(parsed?.intro).toBe("Match List-I with List-II");
    expect(parsed?.listA.map((x) => x.text)).toEqual([
      "Humidity",
      "Alloys",
      "Amalgams",
      "Smoke",
    ]);
    expect(parsed?.listB.map((x) => ({ id: x.id, text: x.text }))).toEqual([
      { id: "I", text: "Solid in solid" },
      { id: "II", text: "Liquid in gas" },
      { id: "III", text: "Solid in gas" },
      { id: "IV", text: "Liquid in solid" },
    ]);
  });
});

describe("resolveMatchingColumns", () => {
  it("prefers 2-column table parse over corrupt API list columns", () => {
    const stem = `Match List-I with List-II.
| A. Humidity | I. Solid in solid |
| B. Alloys | II. Liquid in gas |
| C. Amalgams | III. Solid in gas |
| D. Smoke | IV. Liquid in solid |`;
    const resolved = resolveMatchingColumns({
      questionFormat: "matching",
      questionTextPreview: stem,
      matchListA: [{ id: "A", text: "Humidity | I. Solid in solid" }],
      matchListB: [{ id: "1", text: "I" }],
      options: [{ id: "1", text: "A-II, B-IV, C-I, D-III" }],
    });
    expect(resolved?.listA[0].text).toBe("Humidity");
    expect(resolved?.listB[0].text).toBe("Solid in solid");
  });
});
