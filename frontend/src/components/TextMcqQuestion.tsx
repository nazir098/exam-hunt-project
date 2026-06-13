import { useMemo } from "react";
import AiMarkdown from "./AiMarkdown";
import VariantDiagram from "./VariantDiagram";
import { needsQuestionPrefix, questionStemBody } from "../utils/variantLabels";

export type McqOptionView = {
  id: string;
  text: string;
};

type Props = {
  questionText: string;
  options: McqOptionView[];
  selected?: string;
  onSelect?: (id: string) => void;
  disabled?: boolean;
  className?: string;
  correctAnswer?: string;
  showCorrect?: boolean;
  showWrong?: boolean;
  questionFormat?: string;
  variantType?: string | null;
  assertion?: string;
  reason?: string;
  statements?: McqOptionView[];
  questionImageUrl?: string;
  questionDiagramSvg?: string;
};

const OPTION_LABELS = ["1", "2", "3", "4"];

function resolveFormat(
  questionFormat?: string,
  variantType?: string | null,
  assertion?: string,
  reason?: string,
  statements?: McqOptionView[]
): string {
  const raw = (questionFormat || variantType || "mcq").toLowerCase();
  if (raw.includes("assertion") || (assertion && reason)) return "assertion_reason";
  if (raw.includes("statement") || (statements && statements.length > 0)) return "statement_based";
  return raw;
}

function statementLabel(index: number, total: number): string {
  if (total <= 3) {
    return ["I", "II", "III", "IV"][index] ?? String(index + 1);
  }
  return String(index + 1);
}

/** Strip LaTeX delimiters for length heuristics. */
function plainOptionLength(text: string): number {
  return text
    .replace(/\$[^$]+\$/g, "M")
    .replace(/\s+/g, " ")
    .trim().length;
}

function optionHasMath(text: string): boolean {
  return /(\$[^$]+\$)|\\frac|\\sqrt|\\mu|\\\(|\\\[/.test(text);
}

type OptionsLayout = "stacked" | "paired" | "horizontal";

function resolveOptionsLayout(format: string, options: McqOptionView[]): OptionsLayout {
  if (format === "assertion_reason" || format === "statement_based") {
    return "stacked";
  }
  const lengths = options.map((o) => plainOptionLength(o.text));
  const maxLen = lengths.length ? Math.max(...lengths) : 0;
  const avgLen = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const hasMultiline = options.some((o) => o.text.includes("\n"));

  const allShortMath =
    options.length >= 2 && options.every((o) => optionHasMath(o.text) && plainOptionLength(o.text) < 32);

  const allShortWords =
    options.length >= 2 && options.every((o) => plainOptionLength(o.text) <= 18 && !optionHasMath(o.text));

  if (hasMultiline || maxLen > 46 || avgLen > 30) return "stacked";
  if (allShortWords && maxLen <= 9) return "horizontal";
  if (allShortWords || allShortMath || maxLen > 20 || avgLen > 14) return "paired";
  return "horizontal";
}

export default function TextMcqQuestion({
  questionText,
  options,
  selected = "",
  onSelect,
  disabled = false,
  className = "",
  correctAnswer = "",
  showCorrect = false,
  showWrong = false,
  questionFormat,
  variantType,
  assertion = "",
  reason = "",
  statements = [],
  questionImageUrl = "",
  questionDiagramSvg = "",
}: Props) {
  const sorted = [...options].sort((a, b) => Number(a.id) - Number(b.id));
  const format = useMemo(
    () => resolveFormat(questionFormat, variantType, assertion, reason, statements),
    [questionFormat, variantType, assertion, reason, statements]
  );

  const showAssertionReason = format === "assertion_reason" && (assertion || reason);
  const showStatements = format === "statement_based" && statements.length > 0;
  const sortedStatements = [...statements].sort((a, b) => Number(a.id) - Number(b.id));
  const optionsLayout = useMemo(
    () => resolveOptionsLayout(format, sorted),
    [format, sorted]
  );

  const gridHasMath = useMemo(() => sorted.some((o) => optionHasMath(o.text)), [sorted]);
  const allShortMath = useMemo(
    () =>
      sorted.length >= 2 &&
      sorted.every((o) => optionHasMath(o.text) && plainOptionLength(o.text) < 32),
    [sorted]
  );
  const usePillGrid =
    optionsLayout !== "stacked" &&
    !sorted.some((o) => o.text.includes("\n")) &&
    (!gridHasMath || allShortMath);

  const showQuestionMarker = useMemo(
    () => needsQuestionPrefix(variantType, questionFormat, format),
    [variantType, questionFormat, format]
  );
  const questionBody = useMemo(() => questionStemBody(questionText), [questionText]);

  return (
    <div className={`text-mcq-paper text-mcq-paper--responsive${className ? ` ${className}` : ""}`}>
      <div className="text-mcq-paper__stem">
        {showAssertionReason ? (
          <div className="variant-stem variant-stem--assertion-reason">
            {assertion && (
              <section className="variant-stem__block">
                <p className="variant-stem__label">Assertion (A)</p>
                <AiMarkdown text={assertion} className="ai-markdown--paper" />
              </section>
            )}
            {reason && (
              <section className="variant-stem__block">
                <p className="variant-stem__label">Reason (R)</p>
                <AiMarkdown text={reason} className="ai-markdown--paper" />
              </section>
            )}
          </div>
        ) : showStatements ? (
          <div className="variant-stem variant-stem--statements">
            <p className="variant-stem__intro muted">Consider the following statements:</p>
            <ol className="variant-stem__statement-list">
              {sortedStatements.map((stmt, idx) => (
                <li key={stmt.id} className="variant-stem__block">
                  <span className="variant-stem__label">
                    {statementLabel(idx, sortedStatements.length)}.
                  </span>
                  <AiMarkdown text={stmt.text} className="ai-markdown--paper" />
                </li>
              ))}
            </ol>
          </div>
        ) : showQuestionMarker ? (
          <div className="variant-stem variant-stem--plain-question">
            <span className="variant-stem__q-marker">Q.</span>
            <div className="variant-stem__question-body">
              <AiMarkdown text={questionBody} className="ai-markdown--paper" />
            </div>
          </div>
        ) : (
          <AiMarkdown text={questionText} className="ai-markdown--paper" />
        )}
      </div>

      <VariantDiagram
        imageUrl={questionImageUrl}
        svg={questionDiagramSvg}
        alt="Question diagram"
        className="text-mcq-paper__diagram"
      />

      {sorted.length > 0 ? (
        <ol
          className={`text-mcq-paper__options text-mcq-paper__options--${optionsLayout}`}
          aria-label="Answer options"
        >
          {sorted.map((opt, idx) => {
            const label = OPTION_LABELS[idx] ?? opt.id;
            const active = selected === opt.id;
            const isCorrect = showCorrect && correctAnswer === opt.id;
            const isWrong = showWrong && active && correctAnswer !== opt.id;
            const interactive = !!onSelect && !disabled;
            const formula =
              (usePillGrid && allShortMath) ||
              (!usePillGrid &&
                (optionsLayout === "horizontal" || optionsLayout === "paired") &&
                optionHasMath(opt.text));
            const pill = usePillGrid;
            return (
              <li key={opt.id} className="text-mcq-paper__option-item">
                <button
                  type="button"
                  className={`text-mcq-paper__option${pill ? " text-mcq-paper__option--pill" : ""}${
                    formula ? " text-mcq-paper__option--formula" : ""
                  }${optionsLayout === "stacked" ? " text-mcq-paper__option--stacked" : ""}${
                    active ? " is-selected" : ""
                  }${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}`}
                  disabled={!interactive}
                  aria-pressed={active}
                  onClick={() => onSelect?.(opt.id)}
                >
                  <span className="text-mcq-paper__option-badge">{label}</span>
                  <span className="text-mcq-paper__option-text">
                    <AiMarkdown text={opt.text} className="ai-markdown--paper" />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-mcq-paper__empty-options muted">
          Options are not loaded yet. Refresh the page or re-sync the pack from Admin.
        </p>
      )}
    </div>
  );
}
