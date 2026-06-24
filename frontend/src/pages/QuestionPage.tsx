import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchQuestion, fetchQuestionFamily, fetchQuestions, QuestionDetail, QuestionFamily, QuestionPublic } from "../api";
import { difficultyLabel, examDisplayName, marksLabel, questionHeadingTitle } from "../utils/labels";
import QuestionSecondaryActions from "../components/QuestionSecondaryActions";
import QuestionFeedbackPanel from "../components/QuestionFeedbackPanel";
import QuestionVariantSwitcher from "../components/QuestionVariantSwitcher";
import AiMarkdown from "../components/AiMarkdown";
import TextMcqQuestion from "../components/TextMcqQuestion";
import VariantSwitchLoader from "../components/VariantSwitchLoader";
import AppLoader from "../components/AppLoader";
import PracticeStudyAssistant from "../components/PracticeStudyAssistant";
import ZoomableImage from "../components/ZoomableImage";
import ProductModeBanner from "../components/ProductModeBanner";
import { applySeoConfig, type QuestionSchemaData } from "../components/Seo";
import { browsePathFromPack, filterQuestionsForPractice } from "../utils/practice";
import { hasDistinctSolution } from "../utils/questionSolution";
import { familyParentId, isAiVariantQuestionId, isSamePaperQuestion, variantSwitchLoaderForTarget } from "../utils/questionFamily";
import { formatVariantTypeLabel } from "../utils/variantLabels";

const OPTIONS = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
];

function imageSrc(url: string, questionId: string) {
  if (!url) return "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(questionId)}`;
}

function usesTextVariantLayout(q: QuestionDetail) {
  if (q.options && q.options.length > 0) return true;
  if (q.questionDiagramSvg?.trim()) return true;
  if (q.assertion?.trim() || q.reason?.trim()) return true;
  if (q.statements && q.statements.length > 0) return true;
  if (q.matchListA && q.matchListA.length > 0) return true;
  if (q.sourceType === "ai_variant" && q.questionTextPreview?.trim()) return true;
  return false;
}

function isImageQuestion(q: QuestionDetail) {
  return Boolean(q.questionImageUrl?.trim()) && !usesTextVariantLayout(q);
}

function optionLabel(value: string) {
  return `Option ${value}`;
}

function seoExcerpt(text?: string | null) {
  const clean = (text || "")
    .replace(/\s+/g, " ")
    .replace(/[{}\\]/g, "")
    .trim();
  if (!clean) return "";
  return clean.length > 135 ? `${clean.slice(0, 132)}...` : clean;
}

export default function QuestionPage() {
  const { questionId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState<QuestionDetail | null>(null);
  const [siblings, setSiblings] = useState<QuestionPublic[] | null>(null);
  const [siblingsLoading, setSiblingsLoading] = useState(false);
  const lastNavTotalRef = useRef(0);
  const siblingsLoadRef = useRef<Promise<QuestionPublic[]> | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [checked, setChecked] = useState(false);
  const [answerPeek, setAnswerPeek] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [family, setFamily] = useState<QuestionFamily | null>(null);
  const returnQs = searchParams.toString();
  const familyParent = familyParentId(questionId, q?.parentQuestionId);

  useEffect(() => {
    setError("");
    setChecked(false);
    setAnswerPeek(false);
    setSolutionOpen(false);
    setSelected("");
    if (!questionId) return;

    const samePaper = isSamePaperQuestion(questionId, q);
    if (!samePaper) {
      setQ(null);
      setContentLoading(false);
    } else {
      setContentLoading(true);
    }

    let cancelled = false;
    fetchQuestion(questionId)
      .then((data) => {
        if (!cancelled) setQ(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  useEffect(() => {
    if (!questionId) {
      setFamily(null);
      return;
    }
    let cancelled = false;
    fetchQuestionFamily(questionId)
      .then((data) => {
        if (!cancelled) setFamily(data);
      })
      .catch(() => {
        if (!cancelled) setFamily(null);
      });
    return () => {
      cancelled = true;
    };
  }, [familyParent]);

  useEffect(() => {
    if (!checked) setSolutionOpen(false);
  }, [checked, questionId]);

  useEffect(() => {
    setFeedbackOpen(false);
  }, [questionId]);

  useEffect(() => {
    setSiblings(null);
    siblingsLoadRef.current = null;
  }, [q?.packId, returnQs]);

  const loadSiblings = useCallback(async (): Promise<QuestionPublic[]> => {
    if (!q?.packId) return [];
    if (siblings !== null) return siblings;
    if (siblingsLoadRef.current) return siblingsLoadRef.current;
    setSiblingsLoading(true);
    const promise = fetchQuestions(q.packId, {
      subject: searchParams.get("subject") || undefined,
      chapter: searchParams.get("chapter") || undefined,
      size: 300,
    })
      .then((res) =>
        filterQuestionsForPractice(res.content, {
          topic: searchParams.get("topic") || undefined,
          difficulty: searchParams.get("difficulty") || undefined,
          q: searchParams.get("q") || undefined,
        })
      )
      .then((filtered) => {
        setSiblings(filtered);
        return filtered;
      })
      .catch(() => {
        setSiblings([]);
        return [] as QuestionPublic[];
      })
      .finally(() => {
        setSiblingsLoading(false);
        siblingsLoadRef.current = null;
      });
    siblingsLoadRef.current = promise;
    return promise;
  }, [q?.packId, returnQs, siblings, searchParams]);

  useEffect(() => {
    if (!q) return;
    const exam = examDisplayName(q.exam, q.year);
    const topic = q.topic || q.chapter || q.subject || "NEET";
    const variantLabel = isVariant
      ? `${formatVariantTypeLabel(q.variantType, q.variantNo)}`
      : `Question ${q.questionNo}`;
    const preview = seoExcerpt(q.questionTextPreview);
    // Build title: include question text excerpt for SEO relevance
    const questionSnippet = preview
      ? preview.length > 60
        ? `${preview.slice(0, 57)}...`
        : preview
      : variantLabel;
    const title = `${exam} ${q.year} ${q.subject} ${questionSnippet} - ${topic} Solution | EduMaster AI`;
    const description =
      preview ||
      `Practice ${exam} ${q.subject} question ${q.questionNo} from ${topic} with answer checking, solution support, and AI study guidance.`;

    // Build Question schema for Google rich results
    const questionSchema: QuestionSchemaData = {
      questionText: q.questionTextPreview || `${exam} ${q.year} ${q.subject} ${variantLabel}`,
      options: q.options?.map((opt, i) => ({
        label: String.fromCharCode(65 + i), // A, B, C, D
        text: opt.text,
      })),
      correctAnswer: q.answer,
      correctAnswerText: q.solutionTextPreview || undefined,
      exam: examDisplayName(q.exam, q.year),
      year: q.year,
      subject: q.subject,
      chapter: q.chapter,
      questionNo: q.questionNo,
      solutionImageUrl: q.solutionImageUrl || undefined,
    };

    applySeoConfig({
      title,
      description,
      path: `/solve/${questionId}`,
      type: "article",
      questionSchema,
    });
  }, [q, questionId]);

  const goToQuestion = useCallback(
    (id: string) => {
      if (id !== questionId && isSamePaperQuestion(id, q)) {
        setContentLoading(true);
      }
      navigate(`/solve/${id}?${new URLSearchParams(searchParams).toString()}`);
    },
    [navigate, searchParams, questionId, q]
  );

  const nav = useMemo(() => {
    if (!siblings) {
      return { idx: -1, prev: null, next: null, total: 0, loaded: false };
    }
    const idx = siblings.findIndex((p) => p.questionId === questionId);
    return {
      idx,
      prev: idx > 0 ? siblings[idx - 1] : null,
      next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
      total: siblings.length,
      loaded: true,
    };
  }, [siblings, questionId]);

  if (nav.loaded && nav.total > 0) {
    lastNavTotalRef.current = nav.total;
  }

  const pyqSiblingNav = !isAiVariantQuestionId(questionId) && !q?.parentQuestionId;

  const navPositionLabel = useMemo(() => {
    if (!pyqSiblingNav || !q) return String(q?.questionNo ?? "");
    const current = nav.loaded && nav.idx >= 0 ? nav.idx + 1 : q.questionNo;
    const total = nav.loaded ? nav.total : lastNavTotalRef.current;
    if (total > 0) return `${current} / ${total}`;
    return `${current} / …`;
  }, [pyqSiblingNav, nav, q]);

  const goToSibling = useCallback(
    async (direction: "prev" | "next") => {
      if (isAiVariantQuestionId(questionId) || q?.parentQuestionId) return;
      const list = await loadSiblings();
      const idx = list.findIndex((p) => p.questionId === questionId);
      if (idx < 0) return;
      const target = direction === "prev" ? list[idx - 1] : list[idx + 1];
      if (target) goToQuestion(target.questionId);
    },
    [loadSiblings, questionId, q?.parentQuestionId, goToQuestion]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") void goToSibling("prev");
      if (e.key === "ArrowRight") void goToSibling("next");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToSibling]);

  useEffect(() => {
    if (!q?.packId) return;
    if (isAiVariantQuestionId(questionId) || q.parentQuestionId) return;
    void loadSiblings();
  }, [q?.packId, questionId, q?.parentQuestionId, loadSiblings]);

  function backHref() {
    if (q) return browsePathFromPack(q.packId, returnQs);
    return "/practice?exam=NEET#question-bank";
  }

  const correctAnswer = q?.answer?.trim() ?? "";
  const isCorrect = checked && selected === correctAnswer;
  const isWrong = checked && selected !== "" && selected !== correctAnswer;
  const showCorrect = (answerPeek || checked) && Boolean(correctAnswer);
  const showWrong = checked && isWrong;

  const hasSolution =
    Boolean(q?.hasSolution) ||
    Boolean(q?.solutionImageUrl?.trim()) ||
    Boolean(q?.solutionTextPreview?.trim());
  const distinctSolution = q ? hasDistinctSolution(q) : false;
  const showSolutionPanel = solutionOpen && hasSolution && distinctSolution && checked;

  const assistantProps = {
    questionId,
    selectedAnswer: selected,
    submitted: checked,
    correct: checked ? isCorrect : null,
    formulaRelevant: q?.formulaRelevant ?? true,
    hasSolution: distinctSolution,
  };

  const variantLoader = useMemo(() => {
    if (!contentLoading) return null;
    return variantSwitchLoaderForTarget(questionId, family);
  }, [contentLoading, questionId, family]);

  const questionPending = Boolean(q && contentLoading && q.questionId !== questionId);

  function renderImageOptions() {
    return (
      <section className="practice-run-options" aria-label="Answer options">
        <p className="practice-run-options__label">Select one option</p>
        <div className="practice-run-options__list">
          {OPTIONS.map((opt) => {
            const active = selected === opt.value;
            const isOptCorrect = showCorrect && correctAnswer === opt.value;
            const isOptWrong = showWrong && active;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={checked && isCorrect}
                onClick={() => setSelected(opt.value)}
                className={`practice-run-option${active ? " is-selected" : ""}${
                  isOptCorrect ? " is-correct" : ""
                }${isOptWrong ? " is-wrong" : ""}`}
                aria-label={optionLabel(opt.label)}
                aria-pressed={active}
              >
                <span className="practice-run-option__badge">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <main className="solve-page pt-24">
        <p className="text-error">{error}</p>
        <Link to={backHref()} className="practice-run-header__back solve-page__back glass-card inline-flex mt-md">
          <span className="material-symbols-outlined">arrow_back</span>
          Back to question bank
        </Link>
      </main>
    );
  }

  if (!q) {
    return (
      <main className="solve-page pt-24">
        <Link to={backHref()} className="practice-run-header__back solve-page__back">
          <span className="material-symbols-outlined">arrow_back</span>
          Back to question bank
        </Link>
        <section className="glass-card content-loader-panel">
          <AppLoader
            variant="inline"
            label="Loading question…"
            hint="Fetching question details"
            icon="menu_book"
          />
        </section>
      </main>
    );
  }

  const diff = difficultyLabel(q.difficulty);
  const isVariant = q.sourceType === "ai_variant" && (q.variantNo ?? 0) > 0;
  const imageMode = isImageQuestion(q);

  return (
    <main className="solve-page lg:pt-4">
      <ProductModeBanner mode="solve" compact />

      <div className="solve-page__meta">
        <Link to={backHref()} className="practice-run-header__back solve-page__back">
          <span className="material-symbols-outlined">arrow_back</span>
          Back to question bank
        </Link>
        <div className="solve-page__breadcrumb hidden md:flex flex-wrap items-center gap-xs text-on-surface-variant font-label-md">
          <span>{q.subject}</span>
          {q.chapter && (
            <>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span>{q.chapter}</span>
            </>
          )}
          {q.topic && (
            <>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="text-primary font-bold">{q.topic}</span>
            </>
          )}
        </div>
        <div className="solve-page__meta-chips">
          <span className="practice-run-chip practice-run-chip--meta">
            {examDisplayName(q.exam, q.year)} {q.year}
          </span>
          <span className="practice-run-chip practice-run-chip--meta">{diff}</span>
          <span className="practice-run-chip practice-run-chip--meta practice-run-chip--muted">
            {marksLabel(q.difficulty, q.questionNo)}
          </span>
        </div>
      </div>

      <div className="practice-run-layout">
        <div className="practice-run-main">
          <section key={questionId} className="practice-run-question glass-card">
            <div className="practice-run-question__head">
              <div className="practice-run-question__titles">
                <h1 className="practice-run-question__title">
                  {questionPending
                    ? "Loading question…"
                    : questionHeadingTitle(
                        q.exam,
                        q.questionNo,
                        q.topic || q.chapter,
                        isVariant ? formatVariantTypeLabel(q.variantType, q.variantNo) : null
                      )}
                </h1>
              </div>
            </div>

            {!questionPending && (
              <QuestionVariantSwitcher
                questionId={questionId}
                family={family}
                onSelect={goToQuestion}
              />
            )}

            <div
              className={`practice-run-question__media${
                variantLoader || questionPending
                  ? variantLoader?.mode === "ai" || questionPending
                    ? " practice-run-question__media--variant-generating"
                    : " practice-run-question__media--variant-loading"
                  : ""
              }`}
            >
              {variantLoader || questionPending ? (
                <VariantSwitchLoader
                  mode={variantLoader?.mode ?? "normal"}
                  label={variantLoader?.label ?? ""}
                />
              ) : imageMode ? (
                <ZoomableImage
                  src={imageSrc(q.questionImageUrl, questionId)}
                  alt={`Question ${q.questionNo}`}
                />
              ) : (
                <TextMcqQuestion
                  questionText={q.questionTextPreview || "No question text"}
                  options={q.options ?? []}
                  selected={selected}
                  onSelect={setSelected}
                  disabled={checked && isCorrect}
                  correctAnswer={correctAnswer}
                  showCorrect={showCorrect}
                  showWrong={showWrong}
                  questionFormat={q.questionFormat}
                  variantType={q.variantType}
                  assertion={q.assertion}
                  reason={q.reason}
                  statements={q.statements}
                  matchListA={q.matchListA}
                  matchListB={q.matchListB}
                  questionId={q.questionId}
                  questionImageUrl={q.questionImageUrl}
                  questionDiagramSvg={q.questionDiagramSvg}
                />
              )}
            </div>
          </section>

          {!questionPending && imageMode && renderImageOptions()}

          {!questionPending && (
          <>
          <div className="solve-page__actions">
            <button
              type="button"
              className={`practice-submit-btn solve-page__check-btn${
                checked && isCorrect ? " practice-run-result--correct" : ""
              }`}
              disabled={!selected || (checked && isCorrect)}
              onClick={() => setChecked(true)}
            >
              <span className="material-symbols-outlined">
                {checked && isCorrect ? "check_circle" : "done"}
              </span>
              {checked ? (isCorrect ? "Correct" : "Checked") : "Check answer"}
            </button>
          </div>

          <QuestionSecondaryActions
            questionId={questionId}
            hasSolution={distinctSolution}
            solutionAllowed={checked}
            solutionOpen={solutionOpen}
            onToggleSolution={() => {
              if (!checked) return;
              setSolutionOpen((v) => !v);
            }}
            onReport={() => {
              setFeedbackOpen(true);
              requestAnimationFrame(() => {
                const target =
                  window.matchMedia("(min-width: 1024px)").matches
                    ? document.querySelector(".practice-run-aside .solve-page__feedback")
                    : document.getElementById("question-report");
                target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              });
            }}
          />

          {!checked && (
            <p className="solve-page__submit-hint muted">
              Answer will be revealed after you check.
            </p>
          )}

          {answerPeek && !checked && correctAnswer && (
            <p className="solve-page__answer-banner" role="status">
              Correct answer: <strong>{optionLabel(correctAnswer)}</strong>
            </p>
          )}

          {showSolutionPanel && (
            <section className="solve-page__solution glass-card" aria-label="Official solution">
              <div className="solve-page__solution-head">
                <span className="material-symbols-outlined">menu_book</span>
                <h2 className="solve-page__solution-title">Official solution</h2>
              </div>
              {q.solutionImageUrl?.trim() ? (
                <div className="practice-run-question__media solve-page__solution-media">
                  <ZoomableImage
                    src={imageSrc(q.solutionImageUrl, questionId)}
                    alt={`Solution for question ${q.questionNo}`}
                  />
                </div>
              ) : q.solutionDiagramSvg?.trim() ? (
                <div className="solve-page__solution-text text-mcq-paper">
                  <div
                    className="variant-diagram__svg"
                    dangerouslySetInnerHTML={{ __html: q.solutionDiagramSvg }}
                  />
                </div>
              ) : q.solutionTextPreview?.trim() ? (
                <div className="solve-page__solution-text text-mcq-paper">
                  <AiMarkdown text={q.solutionTextPreview} className="ai-markdown--paper" />
                </div>
              ) : (
                <p className="muted">Solution is marked available but not loaded — try re-syncing the pack.</p>
              )}
            </section>
          )}

          {checked && (
            <section
              className={`practice-run-result practice-run-result--compact glass-card is-revealed${
                isCorrect ? " practice-run-result--correct" : " practice-run-result--wrong"
              }`}
            >
              <div className="practice-run-result__banner practice-run-result__banner--compact">
                <span className="practice-run-result__icon-wrap" aria-hidden>
                  <span
                    className="material-symbols-outlined practice-run-result__icon"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {isCorrect ? "check_circle" : "cancel"}
                  </span>
                </span>
                <div className="practice-run-result__content">
                  <h2 className="practice-run-result__title">
                    {isCorrect ? "Correct" : "Incorrect"}
                  </h2>
                  {!isCorrect && correctAnswer && (
                    <p className="practice-run-result__answer-line practice-run-result__answer-line--key">
                      Correct answer: {optionLabel(correctAnswer)}
                    </p>
                  )}
                  {selected && !isCorrect && (
                    <p className="practice-run-result__answer-line practice-run-result__answer-line--yours">
                      You chose {optionLabel(selected)}
                    </p>
                  )}
                  {isCorrect && selected && (
                    <p className="practice-run-result__answer-line practice-run-result__answer-line--yours">
                      You chose {optionLabel(selected)}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          <footer className="solve-page__footer-nav solve-page__footer-nav--desktop" aria-label="Question navigation">
            <button
              type="button"
              className="practice-run-nav-btn solve-page__nav-btn"
              disabled={!pyqSiblingNav || siblingsLoading || (nav.loaded && !nav.prev)}
              onClick={() => void goToSibling("prev")}
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="solve-page__nav-label">Prev</span>
            </button>
            <span className="solve-page__nav-pos">{navPositionLabel}</span>
            <button
              type="button"
              className="practice-run-nav-btn solve-page__nav-btn"
              disabled={!pyqSiblingNav || siblingsLoading || (nav.loaded && !nav.next)}
              onClick={() => void goToSibling("next")}
            >
              <span className="solve-page__nav-label">Next</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </footer>
          </>
          )}
        </div>

        <aside className="practice-run-aside hidden lg:flex">
          {!questionPending && feedbackOpen && (
            <QuestionFeedbackPanel
              questionId={questionId}
              context="solve"
              compact
              hideToggle
              expanded={feedbackOpen}
              onExpandedChange={setFeedbackOpen}
              className="solve-page__feedback"
            />
          )}
          {!questionPending && <PracticeStudyAssistant {...assistantProps} layout="sidebar" />}
        </aside>
      </div>

      <div className="solve-page__mobile-rail">
        {!questionPending && feedbackOpen && (
          <div id="question-report">
            <QuestionFeedbackPanel
              questionId={questionId}
              context="solve"
              compact
              hideToggle
              expanded={feedbackOpen}
              onExpandedChange={setFeedbackOpen}
              className="solve-page__feedback"
            />
          </div>
        )}
        {!questionPending && (
        <div className="practice-run-ai-inline">
          <PracticeStudyAssistant {...assistantProps} layout="inline" />
        </div>
        )}
      </div>

      <footer className="solve-page__footer-nav solve-page__footer-nav--fixed" aria-label="Question navigation">
        <button
          type="button"
          className="practice-run-nav-btn solve-page__nav-btn"
          disabled={!pyqSiblingNav || siblingsLoading || (nav.loaded && !nav.prev)}
          onClick={() => void goToSibling("prev")}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="solve-page__nav-label">Prev</span>
        </button>
        <span className="solve-page__nav-pos">{navPositionLabel}</span>
        <button
          type="button"
          className="practice-run-nav-btn solve-page__nav-btn"
          disabled={!pyqSiblingNav || siblingsLoading || (nav.loaded && !nav.next)}
          onClick={() => void goToSibling("next")}
        >
          <span className="solve-page__nav-label">Next</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </footer>
    </main>
  );
}
