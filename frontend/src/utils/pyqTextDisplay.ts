import { repairPseudoDollarDelimiters } from "./mathRepairCore";
import {
  normalizeMcqOptionText,
  normalizeQuestionStem,
  normalizeSolutionText,
  repairMarkdownTableSpacing,
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

/** MinerU / export typos that still appear on "already normalized" structured imports. */
function hasPseudoDollarDamage(text: string): boolean {
  return /\\left\s*\$|\\right\s*\$|\\right\)arrow|\\(?:cos|sin|tan|cot|sec|csc)\s*\$\$/.test(text);
}

/** Student-facing PYQ stem — skips full re-normalize when import already sanitized structured text. */
export function displayPyqStem(text: string, opts?: PyqTextDisplayOpts): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (opts?.contentTextNormalized || isStructuredPyq(opts)) {
    // Structured imports can still ship \left$$ OCR damage — full normalize repairs it.
    if (hasPseudoDollarDamage(trimmed)) {
      return normalizeQuestionStem(trimmed);
    }
    // Compact bare-LaTeX statement lines still need $…$ for KaTeX.
    return ensureBareLatexDelimiters(trimmed);
  }
  return normalizeQuestionStem(trimmed);
}

/** Student-facing PYQ option — always repair/wrap (MinerU \left$$ survives contentTextNormalized). */
export function displayPyqOption(text: string, _opts?: PyqTextDisplayOpts): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return normalizeMcqOptionText(trimmed);
}

/** Wrap a whole bare-LaTeX line (or leave text that already has $…$ alone). */
function ensureBareLatexDelimiters(text: string): string {
  let repaired = repairPseudoDollarDelimiters(text);
  // MinerU sometimes emits a single opening `$` on chemistry lines — close it for KaTeX.
  const dollarCount = (repaired.match(/\$/g) || []).length;
  if (dollarCount === 1 && repaired.trimStart().startsWith("$")) {
    repaired = `${repaired.trimEnd()}$`;
  }
  if (!/\\[a-zA-Z]/.test(repaired)) return repaired;
  if (repaired.includes("$") || repaired.includes("\\(")) return repaired;
  // Compact math-only statement/option lines (e.g. \mathrm{K}_{a_1} > …)
  const compact = repaired.length <= 120 && repaired.split(/\s+/).length <= 16;
  if (compact) {
    return `$${repaired}$`;
  }
  return repaired;
}

/** Student-facing official solution — keep tables + ion wraps even when import-normalized. */
export function displayPyqSolution(text: string, opts?: PyqTextDisplayOpts): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (opts?.contentTextNormalized) {
    if (hasPseudoDollarDamage(trimmed)) {
      return normalizeSolutionText(trimmed);
    }
    // Light repair only — full normalize historically destroyed GFM tables with blank lines.
    return repairPseudoDollarDelimiters(repairMarkdownTableSpacing(trimmed));
  }
  return normalizeSolutionText(trimmed);
}
