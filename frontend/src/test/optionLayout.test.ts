import { describe, expect, it } from "vitest";
import { resolveOptionsLayout } from "../utils/mcqOptionsLayout";

describe("resolveOptionsLayout", () => {
  it("stacks multi-step reagent options that overflow 2-col cards", () => {
    const options = [
      { id: "1", text: "$(i) LiAlH_4, (ii) H^+/H_2O$" },
      { id: "2", text: "$(i) AlH(iBu)_2, (ii) H_2O$" },
      { id: "3", text: "$(i) NaBH_4, (ii) H^+/H_2O$" },
      { id: "4", text: "$H_2/Pd-BaSO_4$" },
    ];
    expect(resolveOptionsLayout("mcq", options)).toBe("stacked");
  });

  it("keeps short numeric options paired", () => {
    const options = [
      { id: "1", text: "$2$" },
      { id: "2", text: "$4$" },
      { id: "3", text: "$6$" },
      { id: "4", text: "$8$" },
    ];
    expect(resolveOptionsLayout("mcq", options)).toBe("paired");
  });
});
