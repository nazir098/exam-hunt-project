import AiMarkdown from "./AiMarkdown";
import { normalizeQuestionStem, truncateStemPreview } from "../utils/questionStemNormalize";

type Props = {
  text?: string | null;
  maxLen?: number;
  fallback: string;
  className?: string;
};

/** Compact stem excerpt with inline KaTeX — safe for question-bank card grids. */
export default function QuestionStemPreview({ text, maxLen = 180, fallback, className = "" }: Props) {
  const raw = text?.trim() ?? "";
  if (!raw) {
    return <span className={className}>{fallback}</span>;
  }
  const preview = truncateStemPreview(normalizeQuestionStem(raw), maxLen);
  return (
    <AiMarkdown
      text={preview}
      preformatted
      className={`ai-markdown--stem-preview${className ? ` ${className}` : ""}`}
    />
  );
}
