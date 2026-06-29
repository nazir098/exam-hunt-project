import { useMemo, useCallback, type ReactNode } from "react";
import AiMarkdown from "./AiMarkdown";
import BookmarkButton from "./BookmarkButton";
import VariantDiagram from "./VariantDiagram";
import type { AssetPlacementView } from "../api";
import { resolveAssetUrl, stemHasInlineAssets } from "../utils/questionRender";
import { formatVariantTypeLabel, needsQuestionPrefix, questionStemBody, capitalizeStemStart, resolveAssertionReasonOptions } from "../utils/variantLabels";
import {
  listRomanLabel,
  resolveMatchingColumns,
  type ParsedMatching,
} from "../utils/matchingVariant";

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
  matchListA?: McqOptionView[];
  matchListB?: McqOptionView[];
  answer?: string;
  questionId?: string;
  questionImageUrl?: string;
  questionDiagramSvg?: string;
  assetPlacements?: AssetPlacementView[];
  /** Dark EduMaster-style card for AI variations. */
  variantTheme?: boolean;
  variantLabel?: string;
};

const OPTION_LABELS = ["1", "2", "3", "4"];

function resolveFormat(
  questionFormat?: string,
  variantType?: string | null,
  assertion?: string,
  reason?: string,
  statements?: McqOptionView[],
  matchListA?: McqOptionView[]
): string {
  const raw = (questionFormat || variantType || "mcq").toLowerCase();
  if (raw.includes("matching") || (matchListA && matchListA.length > 0)) return "matching";
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
  if (format === "assertion_reason" || format === "statement_based" || format === "matching") {
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

function renderStemWithInlineAssets(
  text: string,
  questionId: string,
  placements: AssetPlacementView[] | undefined,
  stemText: (value: string) => string,
  markdownClass: string
) {
  const pattern = /\{\{asset:(\d+)\}\}/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <AiMarkdown
          key={`stem-${lastIndex}`}
          text={stemText(text.slice(lastIndex, match.index))}
          className={markdownClass}
        />
      );
    }
    const assetIndex = Number(match[1]);
    nodes.push(
      <VariantDiagram
        key={`asset-${match.index}`}
        imageUrl={resolveAssetUrl(assetIndex, placements, questionId)}
        svg=""
        alt="Question figure"
        className="text-mcq-paper__diagram text-mcq-paper__diagram--inline"
      />
    );
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(
      <AiMarkdown
        key={`stem-${lastIndex}`}
        text={stemText(text.slice(lastIndex))}
        className={markdownClass}
      />
    );
  }
  return nodes;
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
  matchListA = [],
  matchListB = [],
  questionId = "",
  questionImageUrl = "",
  questionDiagramSvg = "",
  assetPlacements = [],
  variantTheme = false,
  variantLabel,
}: Props) {
  const sorted = useMemo(() => {
    const base = [...options].sort((a, b) => Number(a.id) - Number(b.id));
    const formatKey = resolveFormat(questionFormat, variantType, assertion, reason, statements, matchListA);
    if (formatKey === "assertion_reason") {
      return resolveAssertionReasonOptions(base);
    }
    return base;
  }, [options, questionFormat, variantType, assertion, reason, statements, matchListA]);
  const format = useMemo(
    () => resolveFormat(questionFormat, variantType, assertion, reason, statements, matchListA),
    [questionFormat, variantType, assertion, reason, statements, matchListA]
  );

  const matching = useMemo<ParsedMatching | null>(
    () =>
      resolveMatchingColumns({
        questionId,
        questionTextPreview: questionText,
        variantType,
        questionFormat,
        options: sorted,
        matchListA,
        matchListB,
      }),
    [questionId, questionText, variantType, questionFormat, sorted, matchListA, matchListB]
  );

  const showMatching = format === "matching" && matching !== null;

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
  const variantCard = variantTheme;
  const stemText = useCallback(
    (text: string) => (variantCard ? capitalizeStemStart(text) : text),
    [variantCard]
  );
  const markdownClass = variantCard ? "ai-markdown--variant" : "ai-markdown--paper";
  const displayVariantLabel = variantLabel ?? formatVariantTypeLabel(variantType);
  const effectiveLayout = variantCard ? "stacked" : optionsLayout;
  const effectivePillGrid = variantCard ? false : usePillGrid;
  const inlineStemAssets = stemHasInlineAssets(questionText);

  const plainStemContent = useMemo(() => {
    if (!inlineStemAssets) return null;
    return renderStemWithInlineAssets(
      questionText,
      questionId,
      assetPlacements,
      stemText,
      markdownClass
    );
  }, [inlineStemAssets, questionText, questionId, assetPlacements, stemText, markdownClass]);

  return (
    <div
      className={`text-mcq-paper text-mcq-paper--responsive${
        variantCard ? " text-mcq-paper--variant" : ""
      }${className ? ` ${className}` : ""}`}
    >
      {variantCard && (
        <header className="variant-question-card__head">
          <div className="variant-question-card__head-left">
            <span className="material-symbols-outlined variant-question-card__sparkle" aria-hidden>
              auto_awesome
            </span>
            <span className="variant-question-card__type">{displayVariantLabel}</span>
          </div>
          {questionId ? (
            <BookmarkButton
              questionId={questionId}
              variant="icon"
              className="variant-question-card__bookmark"
            />
          ) : null}
        </header>
      )}
      <div className="text-mcq-paper__stem">
        {showAssertionReason ? (
          <div className="variant-stem variant-stem--assertion-reason">
            {assertion && (
              <section className="variant-stem__block">
                <p className="variant-stem__label">Assertion (A)</p>
                <AiMarkdown text={stemText(assertion)} className={markdownClass} />
              </section>
            )}
            {reason && (
              <section className="variant-stem__block">
                <p className="variant-stem__label">Reason (R)</p>
                <AiMarkdown text={stemText(reason)} className={markdownClass} />
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
                  <AiMarkdown text={stemText(stmt.text)} className={markdownClass} />
                </li>
              ))}
            </ol>
          </div>
        ) : showMatching && matching ? (
          <div className="variant-stem variant-stem--matching">
            {matching.intro && (
              <p className="variant-stem__intro">
                <AiMarkdown text={stemText(matching.intro)} className={markdownClass} />
              </p>
            )}
            <div className="variant-matching-grid">
              <section className="variant-matching-col" aria-label="List-I">
                <p className="variant-matching-col__title">List-I</p>
                <ol className="variant-matching-col__list">
                  {matching.listA.map((item) => (
                    <li key={item.id} className="variant-matching-col__item">
                      <span className="variant-matching-col__label">{item.id}.</span>
                      <AiMarkdown text={stemText(item.text)} className={markdownClass} />
                    </li>
                  ))}
                </ol>
              </section>
              {matching.listB.length > 0 && (
                <section className="variant-matching-col" aria-label="List-II">
                  <p className="variant-matching-col__title">List-II</p>
                  <ol className="variant-matching-col__list">
                    {matching.listB.map((item, idx) => (
                      <li key={item.id} className="variant-matching-col__item">
                        <span className="variant-matching-col__label">
                          ({listRomanLabel(idx)}).
                        </span>
                        <AiMarkdown text={stemText(item.text)} className={markdownClass} />
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          </div>
        ) : showQuestionMarker ? (
          variantCard ? (
            inlineStemAssets ? (
              <div className="variant-stem variant-stem--inline-assets">{plainStemContent}</div>
            ) : (
              <AiMarkdown text={stemText(questionBody)} className={markdownClass} />
            )
          ) : (
            <div className="variant-stem variant-stem--plain-question">
              <span className="variant-stem__q-marker">Q.</span>
              <div className="variant-stem__question-body">
                {inlineStemAssets ? (
                  plainStemContent
                ) : (
                  <AiMarkdown text={questionBody} className={markdownClass} />
                )}
              </div>
            </div>
          )
        ) : inlineStemAssets ? (
          <div className="variant-stem variant-stem--inline-assets">{plainStemContent}</div>
        ) : (
          <AiMarkdown text={stemText(questionText)} className={markdownClass} />
        )}
      </div>

      {!inlineStemAssets ? (
        <VariantDiagram
          imageUrl={questionImageUrl}
          svg={questionDiagramSvg}
          alt="Question diagram"
          className="text-mcq-paper__diagram"
        />
      ) : null}

      {sorted.length > 0 ? (
        <ol
          className={`text-mcq-paper__options text-mcq-paper__options--${effectiveLayout}`}
          aria-label="Answer options"
        >
          {sorted.map((opt, idx) => {
            const label = OPTION_LABELS[idx] ?? opt.id;
            const active = selected === opt.id;
            const isCorrect = showCorrect && correctAnswer === opt.id;
            const isWrong = showWrong && active && correctAnswer !== opt.id;
            const interactive = !!onSelect && !disabled;
            const formula =
              (effectivePillGrid && allShortMath) ||
              (!effectivePillGrid &&
                (effectiveLayout === "horizontal" || effectiveLayout === "paired") &&
                optionHasMath(opt.text));
            const pill = effectivePillGrid;
            return (
              <li key={opt.id} className="text-mcq-paper__option-item">
                <button
                  type="button"
                  className={`text-mcq-paper__option${pill ? " text-mcq-paper__option--pill" : ""}${
                    formula ? " text-mcq-paper__option--formula" : ""
                  }${effectiveLayout === "stacked" ? " text-mcq-paper__option--stacked" : ""}${
                    variantCard ? " text-mcq-paper__option--variant-card" : ""
                  }${active ? " is-selected" : ""}${isCorrect ? " is-correct" : ""}${
                    isWrong ? " is-wrong" : ""
                  }`}
                  disabled={!interactive}
                  aria-pressed={active}
                  onClick={() => onSelect?.(opt.id)}
                >
                  <span className="text-mcq-paper__option-badge">{label}</span>
                  <span className="text-mcq-paper__option-text">
                    <AiMarkdown text={opt.text} className={markdownClass} />
                  </span>
                  {variantCard && isCorrect && (
                    <span
                      className="text-mcq-paper__option-check material-symbols-outlined"
                      aria-hidden
                    >
                      check_circle
                    </span>
                  )}
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
