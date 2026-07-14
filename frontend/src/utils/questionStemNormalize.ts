/** Mirrors backend AiTextNormalizer for PYQ stems/options from pdf-qa-extractor. */

import { repairMathBody, repairPseudoDollarDelimiters } from "./mathRepairCore";

function normalizeMathContent(latex: string): string {
  return repairMathBody(latex);
}

function ensureMathBoundarySpaces(text: string): string {
  let t = text;
  t = t.replace(/([a-zA-Z])(\$)/g, "$1 $2");
  t = t.replace(/(\$)([a-zA-Z])/g, "$1 $2");
  t = t.replace(/(\$\$)([a-zA-Z])/g, "$1 $2");
  t = t.replace(/([a-zA-Z])(\$\$)/g, "$1 $2");
  return t.replace(/ {2,}/g, " ").trim();
}

function normalizeInlineMath(text: string): string {
  return text.replace(/\$([^$]+)\$/g, (_, inner: string) => `$${normalizeMathContent(inner)}$`);
}

const PAREN_LATEX = /\(\s*([^()]*\\[a-zA-Z][^()]*)\s*\)/g;

function isInsideInlineMath(text: string, index: number): boolean {
  let dollars = 0;
  for (let i = 0; i < index; i++) {
    if (text[i] === "$") dollars++;
  }
  return dollars % 2 === 1;
}

/** Drop duplicated (1)–(4) blocks when options are rendered separately. */
export function trimEmbeddedMcqOptions(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const marker = /\(\s*([1-4])\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = marker.exec(trimmed)) !== null) {
    if (match[1] !== "1" || isInsideInlineMath(trimmed, match.index)) continue;
    const tail = trimmed.slice(match.index);
    if (!/\(\s*2\s*\)/.test(tail) || !/\(\s*3\s*\)/.test(tail) || !/\(\s*4\s*\)/.test(tail)) continue;
    return trimmed.slice(0, match.index).trim();
  }
  return trimmed;
}

function looksLikeLatex(text: string): boolean {
  return /\\|[\^_]\s*\{/.test(text);
}

function isCompactMathLine(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > 100) return false;
  return trimmed.split(/\s+/).length <= 8;
}

/** Wrap individual \\mu_k-style tokens in prose (pdf-qa-extractor math-render.js parity). */
function wrapBareLatexFragments(text: string): string {
  const re =
    /\\(?:[a-zA-Z]+(?:_\{?[a-zA-Z0-9]+\}?|\^\{?[a-zA-Z0-9]+\}?)?(?:\{[^{}]*\})*)/g;
  let last = 0;
  let out = "";
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    out += text.slice(last, match.index);
    out += isInsideInlineMath(text, match.index) ? match[0] : `$${match[0]}$`;
    last = match.index + match[0].length;
  }
  return out + text.slice(last);
}

function processNonMathSegment(segment: string): string {
  if (!segment) return segment;
  return segment.replace(PAREN_LATEX, (full, inner: string) => {
    const body = inner.trim();
    if (body.includes("<<") || body.includes(">>")) return full;
    return `$${body}$`;
  });
}

function normalizeMathSegments(text: string): string {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts
    .map((part) => (part.startsWith("$") && part.endsWith("$") ? part : processNonMathSegment(part)))
    .join("");
}

function sanitizeStructuredMcqText(text: string, optionBody = false): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  let t = repairPseudoDollarDelimiters(trimmed);
  if (!t.includes("$") && looksLikeLatex(t) && (optionBody || isCompactMathLine(t))) {
    const body = t.replace(/\$/g, "").trim();
    return `$${normalizeMathContent(body)}$`;
  }
  // Mixed prose + equation: wrap from first math token through end (avoids $\cos$$\left$ shards).
  if (!t.includes("$") && looksLikeLatex(t) && /=/.test(t)) {
    const wrapped = wrapInlineEquationInProse(t);
    if (wrapped) {
      return normalizeInlineMath(wrapped);
    }
  }
  if (!t.includes("$")) {
    t = wrapBareLatexFragments(t);
  }
  let out = normalizeMathSegments(t);
  out = normalizeInlineMath(out);
  if (optionBody && !out.includes("$") && looksLikeLatex(out)) {
    return `$${normalizeMathContent(out)}$`;
  }
  return out.trim();
}

/**
 * "…given by E_{z} = 60 \\cos\\left(…\\right)\\mathrm{V/m}" →
 * "…given by $E_{z} = 60 \\cos\\left(…\\right)\\mathrm{V/m}$"
 */
function wrapInlineEquationInProse(text: string): string | null {
  const start = text.search(/(?:[A-Za-z]_\{[a-zA-Z0-9]+\}|[A-Za-z]_[a-zA-Z0-9]|\\[a-zA-Z])/);
  if (start < 0) return null;
  const prose = text.slice(0, start);
  const math = text.slice(start).trim();
  if (!/=/.test(math) || !looksLikeLatex(math)) return null;
  // Avoid swallowing long trailing English after a short token like \mu_k mid-sentence.
  if (math.length > 220 && /\b(the|and|with|when|then|which|that)\b/i.test(math)) {
    return null;
  }
  return `${prose}$${normalizeMathContent(math)}$`;
}

/** Preserve extractor $...$ blocks; strip duplicated option lines; repair MinerU OCR. */
export function normalizeQuestionStem(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  // Repair \left$$ before ensureMathBoundarySpaces (which would insert `\left $$`).
  const repaired = repairPseudoDollarDelimiters(trimEmbeddedMcqOptions(trimmed));
  return sanitizeStructuredMcqText(ensureMathBoundarySpaces(repaired));
}

/** Bank / search preview — truncate without breaking open $...$ math delimiters. */
export function truncateStemPreview(text: string, maxLen = 180): string {
  const cleaned = text.replace(/\{\{asset:\d+\}\}/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  let cut = cleaned.slice(0, maxLen);
  const dollars = (cut.match(/\$/g) || []).length;
  if (dollars % 2 === 1) {
    const lastDollar = cut.lastIndexOf("$");
    if (lastDollar > 0) cut = cut.slice(0, lastDollar);
  }
  return `${cut.trimEnd()}…`;
}

/** MCQ option bodies — wrap bare LaTeX and repair \\left$$ typos (pdf-qa-extractor parity). */
export function normalizeMcqOptionText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const withoutMarker = trimmed
    .replace(/^\(\s*\d+\s*\)\s*/, "")
    .replace(/^from\s+the\s+options?\s+given\s+below\s*:?\s*/i, "")
    .trim();
  return sanitizeStructuredMcqText(withoutMarker, true);
}

function looksLikeBareSolutionMath(segment: string): boolean {
  const s = segment.trim();
  if (!s) return false;
  if (/\\begin\{/.test(s) || /\\end\{/.test(s)) return false;
  if (/\\[a-zA-Z]{2,}/.test(s)) return true;
  if (/\\frac|\\sqrt|\\Rightarrow|\\propto|\\text\{|\\mathrm\{/.test(s)) return true;
  if (/[=^_]/.test(s) && /[\\{}]/.test(s)) return true;
  return false;
}

const LATEX_ENV_BLOCK = /\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g;
const LATEX_ENV_FULL =
  /\\begin\{([a-zA-Z*]+)\}(?:\{[^}]*\})?[\s\S]*?\\end\{\1\}/g;

function wrapLatexEnvironmentBlock(env: string, body: string): string {
  return `$$\n\\begin{${env}}${body}\\end{${env}}\n$$`;
}

function repairMalformedEnvironmentOpener(text: string): string {
  return text.replace(/\\begin\{([a-zA-Z*]+)\{([a-zA-Z0-9|]+)\}/g, "\\begin{$1}{$2}");
}

/** Strip $ / $$ around (and inside) multi-line LaTeX environments before display-math wrapping. */
function prepareSolutionForEnvironments(text: string): string {
  let t = text.replace(
    /\${1,2}\s*(\\begin\{[a-zA-Z*]+\}(?:\{[^}]*\})?[\s\S]*?\\end\{[a-zA-Z*]+\})\s*\${1,2}/g,
    "$1"
  );
  t = t.replace(LATEX_ENV_FULL, (block) => block.replace(/\$/g, ""));
  t = t.replace(/^\s*\$+\s*$/gm, "");
  return t;
}

function cleanProseAdjacentToMath(prose: string): string {
  return prose
    .replace(/[\s\n]*\$+[\s\n]*$/g, "")
    .replace(/^[\s\n]*\$+[\s\n]*/g, "")
    .trim();
}

function looksLikeMarkdownTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.includes("|", 1);
}

function normalizeProseSolution(text: string): string {
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && line !== "$" && line !== "$$");
  if (lines.length === 0) return "";

  const blocks: string[] = [];
  let tableRows: string[] = [];
  let proseLines: string[] = [];

  const flushTable = () => {
    if (!tableRows.length) return;
    blocks.push(tableRows.map(normalizeSolutionLine).join("\n"));
    tableRows = [];
  };
  const flushProse = () => {
    if (!proseLines.length) return;
    blocks.push(proseLines.map(normalizeSolutionLine).join("\n\n"));
    proseLines = [];
  };

  for (const line of lines) {
    if (looksLikeMarkdownTableRow(line)) {
      flushProse();
      tableRows.push(line);
    } else {
      flushTable();
      proseLines.push(line);
    }
  }
  flushTable();
  flushProse();
  return blocks.join("\n\n");
}

function normalizeSolutionWithEnvironments(text: string): string {
  const parts: string[] = [];
  let lastIndex = 0;
  let found = false;
  for (const match of text.matchAll(LATEX_ENV_BLOCK)) {
    found = true;
    const index = match.index ?? 0;
    const prose = normalizeProseSolution(cleanProseAdjacentToMath(text.slice(lastIndex, index)));
    if (prose) parts.push(prose);
    parts.push(wrapLatexEnvironmentBlock(match[1], match[2]));
    lastIndex = index + match[0].length;
  }
  if (!found) return normalizeProseSolution(text);
  const tail = normalizeProseSolution(cleanProseAdjacentToMath(text.slice(lastIndex)));
  if (tail) parts.push(tail);
  return parts.join("\n\n");
}

function normalizeSolutionLine(line: string): string {
  let t = line.trim();
  if (!t) return "";
  if (t.startsWith("$$") && t.endsWith("$$") && t.length > 4) {
    t = t.slice(2, -2).trim();
  } else if (t.startsWith("$$")) {
    t = t.slice(2).trim();
    if (t.endsWith("$$")) t = t.slice(0, -2).trim();
  }
  const parts = t.split(/(\$[^$]+\$)/g);
  const out = parts
    .map((part) => {
      if (part.startsWith("$") && part.endsWith("$")) {
        return `$${normalizeMathContent(part.slice(1, -1))}$`;
      }
      const bare = part.trim();
      if (!bare) return "";
      if (looksLikeBareSolutionMath(bare)) {
        return `$${normalizeMathContent(bare)}$`;
      }
      return bare;
    })
    .filter(Boolean);
  return out.join(" ").trim();
}

function hasUnwrappedLatexEnvironment(text: string): boolean {
  if (!/\\begin\{[a-zA-Z*]+}/.test(text)) return false;
  const withoutDisplay = text.replace(/\$\$[\s\S]*?\$\$/g, "");
  return /\\begin\{[a-zA-Z*]+}/.test(withoutDisplay);
}

/** Remove stray $ / $$ hugging \\begin / \\end when line-by-line wrapping broke an environment. */
function dedollarizeEnvironmentFragments(text: string): string {
  return text
    .replace(/^\s*\$+\s*(\\begin\{[a-zA-Z*]+}(?:\{[^}]*\})?)/gm, "$1")
    .replace(/(\\end\{[a-zA-Z*]+\})\s*\$+\s*$/gm, "$1")
    .replace(/^\s*\$+\s*(&.*\\\$?)\s*$/gm, "$1")
    .replace(/^\s*\$+\s*(\\implies\b.*)\s*$/gm, "$1");
}

/** Official PYQ / extractor solution steps — repair broken $$ and wrap bare LaTeX per line. */
export function normalizeSolutionText(text: string): string {
  let t = text.trim();
  if (!t) return "";
  t = t.replace(/\\n(?![a-zA-Z])/g, "\n");
  t = repairMarkdownTableSpacing(t);
  t = repairPseudoDollarDelimiters(t);
  t = repairMalformedEnvironmentOpener(t);
  t = t.replace(/\${4,}/g, "\n\n");
  t = t.replace(/^\s*Sol\.?\s*:?\s*/i, "");
  let result = normalizeSolutionWithEnvironments(prepareSolutionForEnvironments(t));
  if (hasUnwrappedLatexEnvironment(result)) {
    result = normalizeSolutionWithEnvironments(
      prepareSolutionForEnvironments(dedollarizeEnvironmentFragments(result))
    );
  }
  return repairMarkdownTableSpacing(result);
}

/** Collapse blank lines between markdown table rows (legacy sanitizer inserted them). */
export function repairMarkdownTableSpacing(text: string): string {
  return text.replace(/(\|[^\n]*\|)\n(?:[ \t]*\n)+(?=\|)/g, "$1\n");
}
