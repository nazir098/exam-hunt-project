import {
  normalizeMcqOptionText,
  normalizeQuestionStem,
  normalizeSolutionText,
} from "./questionStemNormalize";

export type PyqTextDisplayOpts = {
  /** Mongo text was sanitized at import — skip duplicate frontend pass. */
  contentTextNormalized?: boolean;
  /** pyq | ai_variant */
  sourceType?: string;
  renderMode?: string;
};

function isStructuredPyq(opts?: PyqTextDisplayOpts): boolean {
  if ((opts?.sourceType ?? "pyq") !== "pyq") return false;
  const mode = (opts?.renderMode ?? "").toLowerCase();
  return mode === "structured" || mode === "hybrid";
}

/** Student-facing PYQ stem — skips re-normalize when import already sanitized structured text. */
export function displayPyqStem(text: string, opts?: PyqTextDisplayOpts): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (opts?.contentTextNormalized || isStructuredPyq(opts)) {
    return trimmed;
  }
  return normalizeQuestionStem(trimmed);
}

/** Student-facing PYQ option — structured imports already sanitized option bodies. */
export function displayPyqOption(text: string, opts?: PyqTextDisplayOpts): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (opts?.contentTextNormalized || isStructuredPyq(opts)) {
    return trimmed;
  }
  return normalizeMcqOptionText(trimmed);
}

/** Student-facing official solution — skip when Mongo stores backend-sanitized text. */
export function displayPyqSolution(text: string, opts?: PyqTextDisplayOpts): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (opts?.contentTextNormalized) {
    return trimmed;
  }
  return normalizeSolutionText(trimmed);
}
