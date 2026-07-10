import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  normalizeMcqOptionText,
  normalizeQuestionStem,
  normalizeSolutionText,
} from "../utils/questionStemNormalize";
import { repairMathBody } from "../utils/mathRepairCore";

type GoldenFixture = {
  id: string;
  pipeline: string;
  input: string;
  expectedContains?: string[];
  expectedExcludes?: string[];
  expectedEquals?: string;
};

const repoRoot = dirname(fileURLToPath(import.meta.url));
const fixtures: GoldenFixture[] = JSON.parse(
  readFileSync(
    join(repoRoot, "../../../backend/src/test/resources/normalizer/golden-fixtures.json"),
    "utf8"
  )
);

function runPipeline(pipeline: string, input: string): string {
  switch (pipeline) {
    case "stem":
      return normalizeQuestionStem(input);
    case "option":
      return normalizeMcqOptionText(input);
    case "solution":
      return normalizeSolutionText(input);
    case "math":
      return repairMathBody(input);
    default:
      throw new Error(`unknown pipeline: ${pipeline}`);
  }
}

describe("golden normalizer fixtures", () => {
  for (const fixture of fixtures) {
    it(fixture.id, () => {
      const actual = runPipeline(fixture.pipeline, fixture.input);
      if (fixture.expectedEquals !== undefined) {
        expect(actual).toBe(fixture.expectedEquals);
      }
      for (const fragment of fixture.expectedContains ?? []) {
        expect(actual).toContain(fragment);
      }
      for (const fragment of fixture.expectedExcludes ?? []) {
        expect(actual).not.toContain(fragment);
      }
    });
  }
});
