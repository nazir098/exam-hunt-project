import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  fetchPracticeQuestion,
  fetchSessionResult,
  PracticeQuestion,
  SessionQuestionReview,
  SessionResultView,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import PracticeStudyAssistant from "../components/PracticeStudyAssistant";
import PageLoadShell from "../components/PageLoadShell";
import SessionQuestionNav from "../components/SessionQuestionNav";
import TestResultRetakeActions from "../components/TestResultRetakeActions";
import { sessionResultRoute, testReviewRoute } from "../navigation/modes";
import { difficultyLabel } from "../utils/labels";
import {
  filterReviews,
  filterTiles,
  optionLabel,
  parseReviewFilter,
  reviewFilterCount,
  reviewFilterToRetakeFilter,
  TEST_REVIEW_FILTERS,
  type TestReviewFilter,
} from "../utils/testReview";

function imageSrc(url: string, questionId?: string) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (questionId) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${encodeURIComponent(questionId)}`;
  }
  return url;
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
    fetchPracticeQuestion(activeReview.questionId)
      .then(setQuestion)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load question"));
  }, [activeReview?.questionId]);

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
              {f.label}
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
                  <section className="test-review-question glass-card">
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
                      {question.questionImageUrl ? (
                        <img
                          src={imageSrc(question.questionImageUrl, question.questionId)}
                          alt={`Question ${activeReview.questionNo}`}
                        />
                      ) : (
                        <p className="muted">{question.questionTextPreview || "No image"}</p>
                      )}
                    </div>

                    {(activeReview.status === "wrong" || activeReview.status === "correct") && (
                      <dl className="session-review-panel__facts test-review-question__facts">
                        {activeReview.status === "wrong" && activeReview.selectedAnswer && (
                          <div>
                            <dt>Your answer</dt>
                            <dd>{optionLabel(activeReview.selectedAnswer)}</dd>
                          </div>
                        )}
                        <div>
                          <dt>Correct answer</dt>
                          <dd>{optionLabel(activeReview.correctAnswer)}</dd>
                        </div>
                      </dl>
                    )}

                    {activeReview.status === "skipped" && (
                      <dl className="session-review-panel__facts test-review-question__facts">
                        <div>
                          <dt>Correct answer</dt>
                          <dd>{optionLabel(activeReview.correctAnswer)}</dd>
                        </div>
                      </dl>
                    )}

                    {activeReview.status === "unattempted" && (
                      <>
                        <p className="test-review-question__note muted">
                          You did not submit an answer before the test ended.
                        </p>
                        <dl className="session-review-panel__facts test-review-question__facts">
                          <div>
                            <dt>Correct answer</dt>
                            <dd>{optionLabel(activeReview.correctAnswer)}</dd>
                          </div>
                        </dl>
                      </>
                    )}

                    {activeReview.hasSolution && activeReview.solutionImageUrl && (
                      <div className="session-review-panel__solution">
                        <button
                          type="button"
                          className="practice-run-solution__toggle"
                          onClick={() => setShowSolution((v) => !v)}
                        >
                          {showSolution ? "Hide explanation" : "View explanation"}
                        </button>
                        {showSolution && (
                          <img
                            src={imageSrc(activeReview.solutionImageUrl, activeReview.questionId)}
                            alt="Solution"
                          />
                        )}
                      </div>
                    )}
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
