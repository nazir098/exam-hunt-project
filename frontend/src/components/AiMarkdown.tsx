import ReactMarkdown from "react-markdown";
import { repairMathBody } from "../utils/mathRepairCore";
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
  t = normalizeSolutionSteps(t);
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

/** Turn inline **Step N** markers into block headings so steps do not merge in one paragraph. */
function normalizeSolutionSteps(text: string): string {
  let t = text.replace(/\*\*Step\s*(\d+)\s*:?\*\*/gi, (_, n: string) => `\n\n### Step ${n}\n\n`);
  t = t.replace(/([^\n])\s+(### Step \d+)/g, "$1\n\n$2");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
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
  let t = repairMathBody(text);
  t = t.replace(/\\(cos|sin|tan)(\d)/g, "\\$1 $2");
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
  /** Stem text already passed through normalizeQuestionStem — skip LLM-oriented fixes. */
  preformatted?: boolean;
};

export default function AiMarkdown({ text, className = "", preformatted = false }: Props) {
  const normalized = preformatted ? text : normalizeAiText(text);
  return (
    <div className={`ai-markdown${className ? ` ${className}` : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
