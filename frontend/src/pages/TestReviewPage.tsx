import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  fetchPracticeQuestionFresh,
  fetchSessionResult,
  PracticeQuestion,
  SessionQuestionReview,
  SessionResultView,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import PracticeStudyAssistant from "../components/PracticeStudyAssistant";
import PageLoadShell from "../components/PageLoadShell";
import ReviewSolutionSection from "../components/ReviewSolutionSection";
import SessionQuestionNav from "../components/SessionQuestionNav";
import TestResultRetakeActions from "../components/TestResultRetakeActions";
import TestReviewAnswerCompare from "../components/TestReviewAnswerCompare";
import TextMcqQuestion from "../components/TextMcqQuestion";
import ZoomableImage from "../components/ZoomableImage";
import { useScrollQuestionIntoView } from "../hooks/useScrollQuestionIntoView";
import { sessionResultRoute, testReviewRoute } from "../navigation/modes";
import { difficultyLabel } from "../utils/labels";
import {
  cacheBustImageUrl,
  hybridDiagramUrl,
  isImageQuestion,
  textMcqDisplayProps,
} from "../utils/questionRender";
import {
  filterReviews,
  filterTiles,
  parseReviewFilter,
  reviewFilterCount,
  reviewFilterToRetakeFilter,
  TEST_REVIEW_FILTERS,
  type TestReviewFilter,
} from "../utils/testReview";

function variantMcqProps(q: PracticeQuestion) {
  return {
    questionFormat: q.questionFormat,
    variantType: q.variantType,
    assertion: q.assertion,
    reason: q.reason,
    statements: q.statements,
    matchListA: q.matchListA,
    matchListB: q.matchListB,
    questionId: q.questionId,
    questionImageUrl: hybridDiagramUrl(q),
    questionDiagramSvg: q.questionDiagramSvg,
    assetPlacements: q.assetPlacements,
    renderMode: q.renderMode,
    contentTextNormalized: q.contentTextNormalized,
    sourceType: q.sourceType,
    ...textMcqDisplayProps(q),
  };
}

function statusLabel(status: string): string {
  if (status === "correct") return "Correct";
  if (status === "wrong") return "Wrong";
  if (status === "skipped") return "Skipped";
  if (status === "unattempted") return "Unanswered";
  return status;
}

export default function TestReviewPage() {
  const { sessionId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const filter = parseReviewFilter(searchParams.get("filter"));
  const qParam = searchParams.get("q") ?? "";

  const [result, setResult] = useState<SessionResultView | null>(null);
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [error, setError] = useState("");
  const [loadTick, setLoadTick] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(testReviewRoute(sessionId, filter))}`);
      return;
    }
    setError("");
    fetchSessionResult(sessionId)
      .then(setResult)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load test"));
  }, [user, authLoading, sessionId, navigate, filter, loadTick]);

  const filtered = useMemo(
    () => (result ? filterReviews(result.questionReviews, filter) : []),
    [result, filter]
  );

  const activeReview: SessionQuestionReview | null = useMemo(() => {
    if (!filtered.length) return null;
    if (qParam) {
      return filtered.find((r) => r.questionId === qParam) ?? filtered[0];
    }
    return filtered[0];
  }, [filtered, qParam]);

  useEffect(() => {
    if (!activeReview) {
      setQuestion(null);
      return;
    }
    setShowSolution(false);
    fetchPracticeQuestionFresh(activeReview.questionId)
      .then(setQuestion)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load question"));
  }, [activeReview?.questionId]);

  useScrollQuestionIntoView(
    activeReview?.questionId,
    Boolean(question && activeReview && question.questionId === activeReview.questionId)
  );

  useEffect(() => {
    if (!activeReview || qParam === activeReview.questionId) return;
    if (filtered.length && !qParam) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("q", activeReview.questionId);
          return next;
        },
        { replace: true }
      );
    }
  }, [activeReview, qParam, filtered.length, setSearchParams]);

  const tiles = useMemo(() => {
    if (!result) return [];
    return filterTiles(result.session.questionTiles ?? [], result.questionReviews, filter);
  }, [result, filter]);

  const activeIdx = activeReview ? filtered.findIndex((r) => r.questionId === activeReview.questionId) : -1;
  const prevReview = activeIdx > 0 ? filtered[activeIdx - 1] : null;
  const nextReview = activeIdx >= 0 && activeIdx < filtered.length - 1 ? filtered[activeIdx + 1] : null;

  function setFilter(next: TestReviewFilter) {
    const list = result ? filterReviews(result.questionReviews, next) : [];
    const params = new URLSearchParams({ filter: next });
    if (list[0]) params.set("q", list[0].questionId);
    setSearchParams(params, { replace: true });
  }

  function selectQuestion(questionId: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("q", questionId);
        return next;
      },
      { replace: true }
    );
  }

  if (authLoading || (!result && !error)) {
    return (
      <PageLoadShell
        loading
        loaderLabel="Loading question review…"
        loaderHint="Fetching your answers and solutions"
        loaderIcon="menu_book"
        loaderMode="test"
        className="test-review-page pt-4"
      >
        {null}
      </PageLoadShell>
    );
  }

  if (error || !result) {
    return (
      <PageLoadShell
        error={error || "Review not found"}
        onRetry={() => setLoadTick((t) => t + 1)}
        backHref={sessionResultRoute("test", sessionId)}
        backLabel="Back to results"
        className="test-review-page pt-4"
        loaderMode="test"
      >
        {null}
      </PageLoadShell>
    );
  }

  const filterMeta = TEST_REVIEW_FILTERS.find((f) => f.id === filter)!;
  const retakeFilter = reviewFilterToRetakeFilter(filter);
  const answerRevealed =
    activeReview?.status === "correct" || activeReview?.status === "wrong";

  return (
    <main className="test-review-page pt-4 lg:pt-6">
      <header className="test-review-page__head">
        <Link to={sessionResultRoute("test", sessionId)} className="test-review-page__back">
          <span className="material-symbols-outlined">arrow_back</span>
          Test results
        </Link>
        <h1 className="test-review-page__title">Question review</h1>
        <p className="muted test-review-page__sub">{filterMeta.hint}</p>
      </header>

      <div className="test-review-filters" role="tablist" aria-label="Review category">
        {TEST_REVIEW_FILTERS.map((f) => {
          const count = reviewFilterCount(result.questionReviews, f.id);
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`test-review-filters__tab test-review-filters__tab--${f.id}${filter === f.id ? " is-active" : ""}${count === 0 ? " is-empty" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              <span className="test-review-filters__label">{f.label}</span>
              <span className="test-review-filters__count">{count}</span>
            </button>
          );
        })}
      </div>

      {retakeFilter && filtered.length > 0 && (
        <TestResultRetakeActions
          sessionId={sessionId}
          reviews={result.questionReviews}
          singleFilter={retakeFilter}
          className="test-review-page__retake"
        />
      )}

      {filtered.length === 0 ? (
        <section className="glass-card test-review-empty">
          <p className="muted">No {filterMeta.label.toLowerCase()} questions in this test.</p>
          <button type="button" className="btn mt-md" onClick={() => setFilter("all")}>
            View all questions
          </button>
        </section>
      ) : (
        <>
          {tiles.length > 0 && (
            <section className="glass-card session-result-tiles test-review-tiles">
              <SessionQuestionNav
                tiles={tiles}
                activeQuestionId={activeReview?.questionId ?? ""}
                onSelect={selectQuestion}
                showMarked
                markedIds={result.session.markedForReviewIds}
              />
            </section>
          )}

          <div className="test-review-layout">
            <div className="test-review-layout__main">
              {activeReview && question && (
                <>
                  <section className="test-review-question glass-card" data-question-main>
                    <header className="test-review-question__head">
                      <div>
                        <h2 className="test-review-question__title">
                          Q{activeReview.number} · Question {activeReview.questionNo}
                        </h2>
                        <p className="test-review-question__meta">
                          {activeReview.subject} · {activeReview.chapter} ·{" "}
                          {difficultyLabel(activeReview.difficulty)}
                        </p>
                      </div>
                      <span
                        className={`session-review-panel__status session-review-panel__status--${activeReview.status === "unattempted" ? "skipped" : activeReview.status}`}
                      >
                        {statusLabel(activeReview.status)}
                      </span>
                    </header>

                    <div className="test-review-question__media">
                      {isImageQuestion(question) ? (
                        <ZoomableImage
                          src={cacheBustImageUrl(question.questionImageUrl, question.questionId)}
                          alt={`Question ${activeReview.questionNo}`}
                        />
                      ) : (
                        <TextMcqQuestion
                          questionText={question.questionTextPreview || "No question text"}
                          options={question.options ?? []}
                          selected={activeReview.selectedAnswer}
                          disabled
                          correctAnswer={activeReview.correctAnswer}
                          showCorrect={answerRevealed}
                          showWrong={
                            answerRevealed &&
                            !!activeReview.selectedAnswer &&
                            activeReview.selectedAnswer !== activeReview.correctAnswer
                          }
                          {...variantMcqProps(question)}
                        />
                      )}
                    </div>

                    {activeReview.status === "unattempted" && (
                      <p className="test-review-question__note muted">
                        You did not submit an answer before the test ended.
                      </p>
                    )}

                    {(activeReview.status === "wrong" ||
                      activeReview.status === "correct" ||
                      activeReview.status === "skipped" ||
                      activeReview.status === "unattempted") && (
                      <TestReviewAnswerCompare review={activeReview} />
                    )}

                    <ReviewSolutionSection
                      question={question}
                      hasSolution={activeReview.hasSolution}
                      showSolution={showSolution}
                      onToggle={() => setShowSolution((v) => !v)}
                    />
                  </section>

                  <div className="test-review-nav">
                    <button
                      type="button"
                      className="practice-run-nav-btn"
                      disabled={!prevReview}
                      onClick={() => prevReview && selectQuestion(prevReview.questionId)}
                    >
                      <span className="material-symbols-outlined">arrow_back</span>
                      Previous
                    </button>
                    <span className="test-review-nav__pos">
                      {activeIdx + 1} / {filtered.length}
                    </span>
                    <button
                      type="button"
                      className="practice-run-nav-btn"
                      disabled={!nextReview}
                      onClick={() => nextReview && selectQuestion(nextReview.questionId)}
                    >
                      Next
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {activeReview &&
              (activeReview.status === "wrong" ||
                activeReview.status === "correct" ||
                activeReview.status === "skipped") && (
                <aside className="test-review-layout__aside hidden lg:block">
                  <PracticeStudyAssistant
                    questionId={activeReview.questionId}
                    selectedAnswer={activeReview.selectedAnswer}
                    submitted
                    correct={activeReview.status === "correct"}
                    prominent
                    hasSolution={activeReview.hasSolution}
                    layout="sidebar"
                  />
                </aside>
              )}
          </div>

          {activeReview &&
            (activeReview.status === "wrong" ||
              activeReview.status === "correct" ||
              activeReview.status === "skipped") && (
              <div className="test-review-ai-inline lg:hidden">
                <PracticeStudyAssistant
                  questionId={activeReview.questionId}
                  selectedAnswer={activeReview.selectedAnswer}
                  submitted
                  correct={activeReview.status === "correct"}
                  hasSolution={activeReview.hasSolution}
                  layout="inline"
                />
              </div>
            )}
        </>
      )}
    </main>
  );
}
