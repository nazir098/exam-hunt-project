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
  const conceptIdx = t.indexOf("### Concept");
  if (conceptIdx > 0) {
    t = t.slice(conceptIdx);
  }
  t = t.replace(/\bfor a class 11[-–]12 neet student[,]?\s*/gi, "");
  t = t.replace(/\bclass 11[-–]12 neet student[,]?\s*/gi, "");
  return t.trim();
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
