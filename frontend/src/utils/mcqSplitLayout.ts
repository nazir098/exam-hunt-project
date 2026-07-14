export type McqSplitOption = {
  id: string;
  text: string;
};

export type McqSplitLayoutInput = {
  /** CSS px — typically from matchMedia min-width. */
  viewportWideEnough: boolean;
  format: string;
  questionText: string;
  options: McqSplitOption[];
  hasStemDiagram: boolean;
  hasInlineStemAssets: boolean;
  /** True when any option embeds {{asset:N}} / figure. */
  optionsHaveFigures: boolean;
};

/** Prefer split for most classic text MCQs; hard-exclude only awkward layouts. */
export const MCQ_SPLIT = {
  /** Soft-wrap estimate for stem column (~tablet). */
  charsPerStemLine: 56,
  maxStemLines: 12,
  maxStemChars: 640,
  maxOptionChars: 110,
} as const;

/** Strip LaTeX / markdown noise for length heuristics. */
export function plainMcqTextLength(text: string): number {
  return text
    .replace(/\{\{asset:\d+\}\}/gi, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, "M")
    .replace(/\$[^$]+\$/g, "M")
    .replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, "M")
    .replace(/\s+/g, " ")
    .trim().length;
}

export function estimateStemLineCount(text: string): number {
  const plain = text
    .replace(/\{\{asset:\d+\}\}/gi, "\n")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$]+\$/g, "x")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!plain) return 0;
  const hardLines = plain.split("\n").filter((l) => l.trim()).length;
  const chars = plain.replace(/\s+/g, " ").trim().length;
  const softLines = Math.ceil(chars / MCQ_SPLIT.charsPerStemLine);
  return Math.max(hardLines, softLines);
}

export function optionsEmbedFigures(options: McqSplitOption[]): boolean {
  return options.some(
    (o) =>
      /\{\{asset:\d+\}\}/i.test(o.text) ||
      /!\[[^\]]*]\([^)]+\)/.test(o.text) ||
      /\.(webp|png|jpe?g|svg)(\?|$)/i.test(o.text)
  );
}

/**
 * Stem | options side-by-side layout is disabled.
 * Options always render under the stem as 2×2 (paired) or 4×1 (stacked).
 */
export function shouldUseMcqSplitLayout(_input: McqSplitLayoutInput): boolean {
  return false;
}
