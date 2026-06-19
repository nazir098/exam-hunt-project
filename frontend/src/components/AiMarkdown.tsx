import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/** Fix common LLM math typos before KaTeX render. */
export function normalizeAiText(text: string): string {
  let t = text.trim();
  // Stray "S" when a leading $ was dropped before v_{rms}
  t = t.replace(/\bSv_\{rms\}/gi, "v_{rms}");
  // Drop LLM meta preambles that echo internal prompts
  t = t.replace(
    /^\s*(?:(?:let me (?:break down|analyze|explain)|based on the given question)[^.!?]*[.!?]\s*)+/i,
    ""
  );
  t = t.replace(/\bfor a class 11[-–]12 neet student[,]?\s*/gi, "");
  t = t.replace(/\bclass 11[-–]12 neet student[,]?\s*/gi, "");
  t = normalizeBasicsStructure(t);
  const conceptIdx = t.search(/^###\s+Concept/m);
  if (conceptIdx > 0) {
    t = t.slice(conceptIdx);
  }
  t = stripModePreamble(t);
  t = normalizeAiSectionHeaders(t);
  t = normalizeInlineFormulaEquations(t);
  t = normalizeLatexDelimiters(t);
  t = wrapBareLatexSegments(t);
  t = normalizeInlineMath(t);
  return t.trim();
}

/** Fix malformed LaTeX inside "**Equation:** $...$" lines from pre-baked formula cards. */
function normalizeInlineFormulaEquations(text: string): string {
  return text.replace(
    /(\*\*Equation:\*\*\s*\$)([^$]+)(\$)/g,
    (_, prefix: string, latex: string, suffix: string) =>
      `${prefix}${normalizeMathContent(latex)}${suffix}`
  );
}

/** Fix LLM basics/revision text: **Concept** and inline ### → proper markdown headings. */
function normalizeBasicsStructure(text: string): string {
  let t = text;
  const sections = [
    "Concept",
    "Key Formula(s)",
    "How to Approach This Question",
    "Common Mistake",
  ];
  for (const title of sections) {
    const esc = title.replace(/[()]/g, "\\$&");
    t = t.replace(new RegExp(`\\*\\*\\s*${esc}\\s*\\*\\*`, "gi"), `\n\n### ${title}\n\n`);
  }
  t = t.replace(
    /([.!?])\s*(###\s+(?:Concept|Key Formula\(s\)|How to Approach This Question|Common Mistake))/gi,
    "$1\n\n$2\n\n"
  );
  t = t.replace(
    /(\S)\s+(###\s+(?:Concept|Key Formula\(s\)|How to Approach This Question|Common Mistake))/g,
    "$1\n\n$2\n\n"
  );
  t = t.replace(/(\n###[^\n]+)\s+(?=\d+\.\s)/g, "$1\n\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

/** Drop echoed "Mode: …" lines and content before the first markdown heading. */
function stripModePreamble(text: string): string {
  let t = text.replace(/^\s*mode:\s*.*$/gim, "");
  t = t.replace(/^\s*task:\s*.*$/gim, "");
  const headingMatch = t.match(/^###? /im);
  if (headingMatch && headingMatch.index != null && headingMatch.index > 0) {
    t = t.slice(headingMatch.index);
  }
  return t;
}

/** Plain labels from revision/explain prompts → markdown headings. */
function normalizeAiSectionHeaders(text: string): string {
  return text
    .replace(/^Key Facts:\s*$/gim, "### Key facts\n")
    .replace(/^Traps:\s*$/gim, "### Common mistakes\n")
    .replace(/^Memory Hook:\s*$/gim, "### Memory hook\n");
}

/** Repair common enrichment LaTeX typos before KaTeX. */
function normalizeMathContent(text: string): string {
  let t = text.trim();
  while (t.startsWith("$")) t = t.slice(1).trim();
  while (t.endsWith("$")) t = t.slice(0, -1).trim();
  t = collapseOverEscapedBackslashes(t);
  t = repairJsonEscapedLatex(t);
  t = t.replace(/\\{/g, "{");
  t = t.replace(/\\}/g, "}");
  t = t.replace(/\\left\s*\\frac/g, "\\left(\\frac");
  t = t.replace(/\\right(?![)\]|.|])/g, "\\right)");
  t = t.replace(/\\(cos|sin|tan)(\d)/g, "\\$1 $2");
  return t.trim();
}

/** Manifest / JSON double-escaping: \\frac → \frac */
function collapseOverEscapedBackslashes(text: string): string {
  let t = text;
  let prev = "";
  while (t !== prev) {
    prev = t;
    t = t.replace(/\\\\([a-zA-Z])/g, "\\$1");
  }
  return t;
}

/** JSON control-char escapes break LaTeX commands (\\frac → form-feed + rac). */
function repairJsonEscapedLatex(text: string): string {
  let t = text.replace(/\u000C/g, "");
  t = t.replace(/-rac\{/g, "-\\frac{");
  t = t.replace(/-rac(?=\{)/g, "-\\frac");
  t = t.replace(/(?<![\\a-zA-Z])rac\{/g, "\\frac{");
  t = t.replace(/\u0009imes/g, "\\times");
  t = t.replace(/\u0009ext\{/g, "\\text{");
  t = t.replace(/\u0009heta/g, "\\theta");
  t = t.replace(/\u0009au/g, "\\tau");
  t = t.replace(/\u0009o/g, "\\to");
  t = t.replace(/\u0008eta/g, "\\beta");
  t = t.replace(/\u0008ar\{/g, "\\bar{");
  t = t.replace(/\u0008inom/g, "\\binom");
  t = t.replace(/\u0008egin\{/g, "\\begin{");
  t = t.replace(/\nu/g, "\\nu");
  t = t.replace(/\nabla/g, "\\nabla");
  t = t.replace(/\rho/g, "\\rho");
  return t;
}

function looksLikeBareLatex(segment: string): boolean {
  const s = segment.trim();
  if (!s || s.startsWith("$")) return false;
  if (/\\[a-zA-Z]{2,}/.test(s)) return true;
  if (/\\cos|\\sin|\\tan|\\Delta|\\theta|\\times|\\cdot|\\frac|\\sqrt|\\circ/.test(s)) return true;
  if (/\^\{[^}]+\}/.test(s) && /\\/.test(s)) return true;
  if (/=\s*[^=]*\\times/.test(s)) return true;
  if (/[=+\-*/^]/.test(s) && /\\[a-zA-Z]/.test(s)) return true;
  return false;
}

/** Wrap hint / LLM lines that use LaTeX commands without $ delimiters. */
function wrapBareLatexSegments(text: string): string {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts
    .map((part) => {
      if (part.startsWith("$") && part.endsWith("$")) return part;
      return part
        .split(/(?<=[.!?])\s+/)
        .map((clause) => {
          const trimmed = clause.trim();
          if (!looksLikeBareLatex(trimmed)) return clause;
          const transition = trimmed.match(/^(Thus|So|Hence|Therefore),?\s+/i);
          if (transition) {
            const body = trimmed.slice(transition[0].length);
            return `${transition[0]}$${normalizeMathContent(body)}$`;
          }
          return `$${normalizeMathContent(trimmed)}$`;
        })
        .join(" ");
    })
    .join("");
}

function normalizeInlineMath(text: string): string {
  return text.replace(/\$([^$]+)\$/g, (_, inner: string) => `$${normalizeMathContent(inner)}$`);
}

/** Convert LLM pseudo-LaTeX `( \\frac{a}{b} )` and `\\( ... \\)` to `$...$` for KaTeX. */
function normalizeLatexDelimiters(text: string): string {
  let t = text;
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner: string) => `$${normalizeMathContent(inner)}$`);
  t = t.replace(/\(\s*([^()]*\\[a-zA-Z][^()]*)\s*\)/g, (_, inner: string) => `$${normalizeMathContent(inner)}$`);
  return t;
}

type Props = {
  text: string;
  className?: string;
};

export default function AiMarkdown({ text, className = "" }: Props) {
  const normalized = normalizeAiText(text);
  return (
    <div className={`ai-markdown${className ? ` ${className}` : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
