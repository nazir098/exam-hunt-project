import type { McqOptionView } from "../api";

/** Estimate rendered option width for layout heuristics (do not collapse `$…$` to one char). */
export function plainOptionLength(text: string): number {
  return text
    .replace(/\$([^$]*)\$/g, (_full, body: string) => {
      const stripped = String(body)
        .replace(/\\mathrm|\\text|\\mathbf|\\mathsf|\\operatorname/gi, "")
        .replace(/\\[a-zA-Z]+/g, "X")
        .replace(/[{}^_\\]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return stripped || "M";
    })
    .replace(/\s+/g, " ")
    .trim().length;
}

export function optionHasMath(text: string): boolean {
  return /(\$[^$]+\$)|\\frac|\\sqrt|\\mu|\\\(|\\\[/.test(text);
}

/** Multi-step reagents / wide chemistry lines need a full-width row. */
export function optionLooksWide(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/\(i\)[\s\S]*\(ii\)/i.test(t)) return true;
  if (/\\rightarrow|\\xrightarrow|\\Rightarrow/.test(t)) return true;
  if ((t.match(/\$/g) || []).length >= 4) return true;
  return false;
}

export type OptionsLayout = "stacked" | "paired";

/** Prefer 2×2 under the stem; fall back to 4×1 when options are long or math-heavy. */
export function resolveOptionsLayout(format: string, options: McqOptionView[]): OptionsLayout {
  if (format === "assertion_reason" || format === "statement_based" || format === "matching") {
    return "stacked";
  }
  if (options.length < 2 || options.length > 4) return "stacked";
  const lengths = options.map((o) => plainOptionLength(o.text));
  const maxLen = lengths.length ? Math.max(...lengths) : 0;
  const avgLen = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const hasMultiline = options.some((o) => o.text.includes("\n"));
  const hasFigure = options.some(
    (o) => /\{\{asset:\d+\}\}/i.test(o.text) || /!\[[^\]]*]\([^)]+\)/.test(o.text)
  );
  const hasWideMath = options.some((o) => optionLooksWide(o.text));
  const mathCount = options.filter((o) => optionHasMath(o.text)).length;
  // Chemistry / LaTeX reagents look short in source but render wide in 2-col cards.
  if (hasWideMath) return "stacked";
  if (mathCount >= 3 && maxLen > 14) return "stacked";
  if (hasMultiline || hasFigure || maxLen > 28 || avgLen > 20) return "stacked";
  return "paired";
}
