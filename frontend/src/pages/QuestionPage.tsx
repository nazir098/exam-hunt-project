import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchQuestion, fetchQuestions, QuestionDetail, QuestionPublic } from "../api";
import { difficultyLabel, examDisplayName, marksLabel } from "../utils/labels";
import BookmarkButton from "../components/BookmarkButton";
import QuestionFeedbackPanel from "../components/QuestionFeedbackPanel";
import QuestionVariantSwitcher from "../components/QuestionVariantSwitcher";
import AiMarkdown from "../components/AiMarkdown";
import TextMcqQuestion from "../components/TextMcqQuestion";
import VariantSwitchLoader from "../components/VariantSwitchLoader";
import AppLoader from "../components/AppLoader";
import PracticeStudyAssistant from "../components/PracticeStudyAssistant";
import ProductModeBanner from "../components/ProductModeBanner";
import { applySeoConfig } from "../components/Seo";
import { browsePathFromPack, filterQuestionsForPractice } from "../utils/practice";
import { hasDistinctSolution } from "../utils/questionSolution";
import { formatVariantTypeLabel, VARIANT_SWITCH_IDLE, type VariantSwitchState } from "../utils/variantLabels";

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
  const siblingsLoadRef = useRef<Promise<QuestionPublic[]> | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [checked, setChecked] = useState(false);
  const [answerPeek, setAnswerPeek] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [variantSwitch, setVariantSwitch] = useState<VariantSwitchState>(VARIANT_SWITCH_IDLE);
  const returnQs = searchParams.toString();

  useEffect(() => {
    setQ(null);
    setError("");
    setChecked(false);
    setAnswerPeek(false);
    setSolutionOpen(false);
    setVariantSwitch(VARIANT_SWITCH_IDLE);
    setSelected("");
    if (!questionId) return;
    let cancelled = false;
    fetchQuestion(questionId)
      .then((data) => {
        if (!cancelled) setQ(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
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
    const title = `${exam} ${q.subject} ${variantLabel} - ${topic} Solution | EduMaster AI by Techmuzzle`;
    const preview = seoExcerpt(q.questionTextPreview);
    const description =
      preview ||
      `Practice ${exam} ${q.subject} question ${q.questionNo} from ${topic} with answer checking, solution support, and AI study guidance.`;
    applySeoConfig({
      title,
      description,
      path: `/solve/${questionId}`,
      type: "article",
    });
  }, [q, questionId]);

  const goToQuestion = useCallback(
    (id: string) => {
      navigate(`/solve/${id}?${new URLSearchParams(searchParams).toString()}`);
    },
    [navigate, searchParams]
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

  const goToSibling = useCallback(
    async (direction: "prev" | "next") => {
      const list = await loadSiblings();
      const idx = list.findIndex((p) => p.questionId === questionId);
      if (idx < 0) return;
      const target = direction === "prev" ? list[idx - 1] : list[idx + 1];
      if (target) goToQuestion(target.questionId);
    },
    [loadSiblings, questionId, goToQuestion]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") void goToSibling("prev");
      if (e.key === "ArrowRight") void goToSibling("next");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToSibling]);

  function backHref() {
    if (q) return browsePathFromPack(q.packId, returnQs);
    return "/bank?exam=NEET";
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
  const showSolutionPanel = solutionOpen && hasSolution && distinctSolution;

  const assistantProps = {
    questionId,
    selectedAnswer: selected,
    submitted: checked,
    correct: checked ? isCorrect : null,
    formulaRelevant: q?.formulaRelevant ?? true,
    hasSolution: distinctSolution,
  };

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
        <Link to={backHref()} className="glass-card inline-block px-md py-sm rounded-xl mt-md">
          ← Back
        </Link>
      </main>
    );
  }

  if (!q) {
    return (
      <main className="solve-page pt-24">
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
      <ProductModeBanner mode="solve" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-lg">
        <div className="flex flex-wrap items-center gap-xs text-on-surface-variant font-label-md">
          <Link to={backHref()} className="hover:text-primary transition-colors">
            {q.subject}
          </Link>
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
        <div className="flex flex-wrap gap-sm">
          <span className="practice-run-chip">
            {examDisplayName(q.exam, q.year)} {q.year}
          </span>
          <span className="practice-run-chip">{diff}</span>
          <span className="practice-run-chip practice-run-chip--muted">
            {marksLabel(q.difficulty, q.questionNo)}
          </span>
        </div>
      </div>

      <div className="practice-run-layout">
        <div className="practice-run-main">
          <section key={questionId} className="practice-run-question glass-card">
            <div className="practice-run-question__head">
              <div className="practice-run-question__titles">
                <p className="practice-run-question__eyebrow">Study mode · Question Bank</p>
                <h1 className="practice-run-question__title">
                  {isVariant
                    ? `${formatVariantTypeLabel(q.variantType, q.variantNo)} · Paper Q${q.questionNo}`
                    : `NEET Paper · Question ${q.questionNo}`}
                  {q.topic ? ` · ${q.topic}` : ""}
                </h1>
              </div>
            </div>

            <QuestionVariantSwitcher
              questionId={questionId}
              onSelect={goToQuestion}
              onSwitchStateChange={setVariantSwitch}
            />

            <div
              className={`practice-run-question__media${
                variantSwitch.active
                  ? variantSwitch.mode === "ai"
                    ? " practice-run-question__media--variant-generating"
                    : " practice-run-question__media--variant-loading"
                  : ""
              }`}
            >
              {variantSwitch.active && variantSwitch.mode ? (
                <VariantSwitchLoader mode={variantSwitch.mode} label={variantSwitch.label} />
              ) : imageMode ? (
                <img
                  src={imageSrc(q.questionImageUrl, questionId)}
                  alt={`Question ${q.questionNo}`}
                  draggable={false}
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

          {imageMode && renderImageOptions()}

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
            <button
              type="button"
              className="practice-run-nav-btn solve-page__peek-btn"
              onClick={() => setAnswerPeek((v) => !v)}
              aria-pressed={answerPeek}
            >
              <span className="material-symbols-outlined">
                {answerPeek ? "visibility_off" : "visibility"}
              </span>
              {answerPeek ? "Hide answer" : "Show answer"}
            </button>
            {distinctSolution && (
              <button
                type="button"
                className="practice-run-nav-btn solve-page__peek-btn"
                onClick={() => setSolutionOpen((v) => !v)}
                aria-pressed={solutionOpen}
              >
                <span className="material-symbols-outlined">
                  {solutionOpen ? "menu_book" : "auto_stories"}
                </span>
                {solutionOpen ? "Hide solution" : "View solution"}
              </button>
            )}
            <BookmarkButton
              questionId={questionId}
              className="practice-run-nav-btn"
            />
          </div>

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
                  <img
                    src={imageSrc(q.solutionImageUrl, questionId)}
                    alt={`Solution for question ${q.questionNo}`}
                    draggable={false}
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
                <span
                  className="material-symbols-outlined practice-run-result__icon"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isCorrect ? "check_circle" : "cancel"}
                </span>
                <div>
                  <h2 className="practice-run-result__title">
                    {isCorrect ? "Correct" : "Incorrect"}
                  </h2>
                  {!isCorrect && (
                    <p className="practice-run-result__answer-line">
                      Correct answer: {optionLabel(correctAnswer)}
                    </p>
                  )}
                  {selected && (
                    <p className="practice-run-result__answer-line muted">
                      You chose {optionLabel(selected)}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          <QuestionFeedbackPanel
            questionId={questionId}
            context="solve"
            className="glass-card solve-page__feedback"
          />

          <footer className="solve-page__footer-nav">
            <button
              type="button"
              className="practice-run-nav-btn"
              disabled={siblingsLoading || (nav.loaded && !nav.prev)}
              onClick={() => void goToSibling("prev")}
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Previous
            </button>
            <span className="text-caption text-outline">
              {nav.loaded && nav.idx >= 0 ? nav.idx + 1 : q.questionNo}
              {nav.loaded ? ` / ${nav.total}` : siblingsLoading ? " · …" : ""}
            </span>
            <button
              type="button"
              className="practice-run-nav-btn"
              disabled={siblingsLoading || (nav.loaded && !nav.next)}
              onClick={() => void goToSibling("next")}
            >
              Next
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </footer>
        </div>

        <aside className="practice-run-aside hidden lg:flex">
          <PracticeStudyAssistant {...assistantProps} layout="sidebar" />
        </aside>
      </div>

      <div className="practice-run-ai-inline lg:hidden">
        <PracticeStudyAssistant {...assistantProps} layout="inline" />
      </div>
    </main>
  );
}
