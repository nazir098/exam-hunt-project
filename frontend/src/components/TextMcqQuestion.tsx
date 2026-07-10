import { useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import AiMarkdown from "./AiMarkdown";
import InlineAssetMarkdown from "./InlineAssetMarkdown";
import BookmarkButton from "./BookmarkButton";
import VariantDiagram from "./VariantDiagram";
import type { AssetPlacementView } from "../api";
import { displayPyqOption, displayPyqStem, type PyqTextDisplayOpts } from "../utils/pyqTextDisplay";
import { stemHasInlineAssets } from "../utils/questionRender";
import { formatVariantTypeLabel, needsQuestionPrefix, questionStemBody, capitalizeStemStart, resolveAssertionReasonOptions } from "../utils/variantLabels";
import {
  listRomanLabel,
  resolveMatchingColumns,
  stemLooksLikeMatchingTable,
  type ParsedMatching,
} from "../utils/matchingVariant";
import { parseAssertionReasonStem } from "../utils/assertionReasonStem";
import {
  parseLetterStatementsStem,
  sortStatements,
  statementDisplayLabel,
  statementsLookValid,
} from "../utils/letterStatementsStem";

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
  renderMode?: string;
  sourceType?: string;
  contentTextNormalized?: boolean;
  /** Dark EduMaster-style card for structured PYQs and AI variations. */
  variantTheme?: boolean;
  variantLabel?: string;
  /** Admin-only link to question editor (shown in card header). */
  adminEditHref?: string;
};

const OPTION_LABELS = ["1", "2", "3", "4"];

function resolveFormat(
  questionFormat?: string,
  variantType?: string | null,
  assertion?: string,
  reason?: string,
  statements?: McqOptionView[],
  matchListA?: McqOptionView[],
  questionText?: string
): string {
  const raw = (questionFormat || variantType || "mcq").toLowerCase();
  if (raw.includes("matching") || (matchListA && matchListA.length > 0)) return "matching";
  if (stemLooksLikeMatchingTable(questionText)) return "matching";
  if (raw.includes("assertion") || (assertion && reason)) return "assertion_reason";
  if (raw.includes("statement") || (statements && statements.length > 0)) return "statement_based";
  return raw;
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
  return (
    <InlineAssetMarkdown
      text={text}
      questionId={questionId}
      assetPlacements={placements}
      formatText={stemText}
      markdownClass={markdownClass}
      diagramAlt="Question figure"
      tailClassName={(tail) => (/^\s*\(/.test(tail) ? "text-mcq-paper__stem-note" : undefined)}
      preformatted
    />
  );
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
  renderMode,
  sourceType,
  contentTextNormalized,
  variantTheme = false,
  variantLabel,
  adminEditHref = "",
}: Props) {
  const parsedLetterStatements = useMemo(
    () => parseLetterStatementsStem(questionText),
    [questionText]
  );

  const parsedAssertionReason = useMemo(() => {
    if (assertion?.trim() || reason?.trim() || statements.length > 0) return null;
    if (parsedLetterStatements) return null;
    return parseAssertionReasonStem(questionText);
  }, [assertion, reason, statements.length, questionText, parsedLetterStatements]);

  const effectiveStatements = useMemo(() => {
    if (statements.length > 0 && statementsLookValid(statements)) {
      return sortStatements(statements);
    }
    return parsedLetterStatements?.statements ?? [];
  }, [statements, parsedLetterStatements]);

  const sorted = useMemo(() => {
    const base = [...options].sort((a, b) => Number(a.id) - Number(b.id));
    const formatKey = resolveFormat(
      questionFormat,
      variantType,
      assertion,
      reason,
      statements,
      matchListA,
      questionText
    );
    const effectiveFormat =
      formatKey === "mcq" && parsedAssertionReason ? "assertion_reason" : formatKey;
    if (effectiveFormat === "assertion_reason") {
      return resolveAssertionReasonOptions(base);
    }
    return base;
  }, [options, questionFormat, variantType, assertion, reason, statements, matchListA, parsedAssertionReason]);

  const format = useMemo(() => {
    const base = resolveFormat(
      questionFormat,
      variantType,
      assertion,
      reason,
      statements,
      matchListA,
      questionText
    );
    if (base === "mcq" && parsedAssertionReason) return "assertion_reason";
    if (base === "mcq" && parsedLetterStatements) return "statement_based";
    return base;
  }, [
    questionFormat,
    variantType,
    assertion,
    reason,
    statements,
    matchListA,
    parsedAssertionReason,
    parsedLetterStatements,
  ]);

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

  const showAssertionReason =
    (format === "assertion_reason" && (assertion || reason)) || Boolean(parsedAssertionReason);
  const displayAssertion = assertion?.trim() || parsedAssertionReason?.first || "";
  const displayReason = reason?.trim() || parsedAssertionReason?.second || "";
  const assertionLabel = parsedAssertionReason?.firstLabel ?? "Assertion (A)";
  const reasonLabel = parsedAssertionReason?.secondLabel ?? "Reason (R)";
  const showStatements =
    effectiveStatements.length >= 3 &&
    (format === "statement_based" || Boolean(parsedLetterStatements));
  const sortedStatements = effectiveStatements;
  const statementIntro =
    parsedLetterStatements?.intro?.trim() ||
    (showStatements && format === "statement_based" ? "Consider the following statements:" : "");
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
  const pyqDisplayOpts = useMemo<PyqTextDisplayOpts>(
    () => ({ contentTextNormalized, renderMode, sourceType }),
    [contentTextNormalized, renderMode, sourceType]
  );
  const stemText = useCallback(
    (text: string) => {
      const normalized = displayPyqStem(text, pyqDisplayOpts);
      return variantCard ? capitalizeStemStart(normalized) : normalized;
    },
    [variantCard, pyqDisplayOpts]
  );
  const markdownClass = variantCard ? "ai-markdown--variant" : "ai-markdown--paper";
  const optionText = useCallback((text: string) => displayPyqOption(text, pyqDisplayOpts), [pyqDisplayOpts]);
  const displayVariantLabel = variantLabel ?? formatVariantTypeLabel(variantType);
  const cardIcon = displayVariantLabel === "Original PYQ" ? "menu_book" : "auto_awesome";
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
              {cardIcon}
            </span>
            <span className="variant-question-card__type">{displayVariantLabel}</span>
          </div>
          <div className="variant-question-card__head-actions">
            {adminEditHref ? (
              <Link
                to={adminEditHref}
                className="variant-question-card__edit"
                title="Edit question (admin)"
              >
                <span className="material-symbols-outlined" aria-hidden>
                  edit_square
                </span>
                <span className="variant-question-card__edit-label">Edit</span>
              </Link>
            ) : null}
            {questionId ? (
              <BookmarkButton
                questionId={questionId}
                variant="icon"
                className="variant-question-card__bookmark"
              />
            ) : null}
          </div>
        </header>
      )}
      <div className="text-mcq-paper__stem">
        {showAssertionReason ? (
          <div className="variant-stem variant-stem--assertion-reason">
            {parsedAssertionReason?.intro ? (
              <p className="variant-stem__intro muted">
                <AiMarkdown
                  text={stemText(parsedAssertionReason.intro)}
                  className={markdownClass}
                  preformatted
                />
              </p>
            ) : null}
            {displayAssertion && (
              <section className="variant-stem__block">
                <p className="variant-stem__label">{assertionLabel}</p>
                <AiMarkdown text={stemText(displayAssertion)} className={markdownClass} preformatted />
              </section>
            )}
            {displayReason && (
              <section className="variant-stem__block">
                <p className="variant-stem__label">{reasonLabel}</p>
                <AiMarkdown text={stemText(displayReason)} className={markdownClass} preformatted />
              </section>
            )}
            {parsedAssertionReason?.outro ? (
              <p className="variant-stem__outro muted">
                <AiMarkdown
                  text={stemText(parsedAssertionReason.outro)}
                  className={markdownClass}
                  preformatted
                />
              </p>
            ) : null}
          </div>
        ) : showStatements ? (
          <div className="variant-stem variant-stem--statements">
            {statementIntro ? (
              <p className="variant-stem__intro muted">
                <AiMarkdown
                  text={stemText(statementIntro)}
                  className={markdownClass}
                  preformatted
                />
              </p>
            ) : null}
            <ol className="variant-stem__statement-list">
              {sortedStatements.map((stmt, idx) => (
                <li key={stmt.id} className="variant-stem__block">
                  <span className="variant-stem__label">
                    {statementDisplayLabel(stmt, idx, sortedStatements.length)}.
                  </span>
                  <AiMarkdown text={stemText(stmt.text)} className={markdownClass} preformatted />
                </li>
              ))}
            </ol>
          </div>
        ) : showMatching && matching ? (
          <div className="variant-stem variant-stem--matching">
            {matching.intro && (
              <p className="variant-stem__intro">
                <AiMarkdown text={stemText(matching.intro)} className={markdownClass} preformatted />
              </p>
            )}
            <div className="variant-matching-grid">
              <section className="variant-matching-col" aria-label="List-I">
                <p className="variant-matching-col__title">List-I</p>
                <ol className="variant-matching-col__list">
                  {matching.listA.map((item) => (
                    <li key={item.id} className="variant-matching-col__item">
                      <span className="variant-matching-col__label">{item.id}.</span>
                      <AiMarkdown text={stemText(item.text)} className={markdownClass} preformatted />
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
                        <AiMarkdown text={stemText(item.text)} className={markdownClass} preformatted />
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
              <AiMarkdown text={stemText(questionBody)} className={markdownClass} preformatted />
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
          <AiMarkdown text={stemText(questionText)} className={markdownClass} preformatted />
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
            const displayLabel = label;
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
                  <span className="text-mcq-paper__option-badge">{displayLabel}</span>
                  <span className="text-mcq-paper__option-text">
                    <AiMarkdown
                      text={optionText(opt.text)}
                      className={markdownClass}
                      preformatted
                    />
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
