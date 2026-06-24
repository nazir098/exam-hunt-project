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
import PageLoadShell from "../components/PageLoadShell";
import PracticeStudyAssistant from "../components/PracticeStudyAssistant";
import SessionQuestionNav from "../components/SessionQuestionNav";
import TestReviewAnswerCompare from "../components/TestReviewAnswerCompare";
import TextMcqQuestion from "../components/TextMcqQuestion";
import ZoomableImage from "../components/ZoomableImage";
import { practiceReviewRoute, sessionResultRoute } from "../navigation/modes";
import { difficultyLabel } from "../utils/labels";

function imageSrc(url: string, questionId?: string) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (questionId) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${encodeURIComponent(questionId)}`;
  }
  return url;
}

function usesTextVariantLayout(q: PracticeQuestion) {
  if (q.options && q.options.length > 0) return true;
  if (q.questionDiagramSvg?.trim()) return true;
  if (q.assertion?.trim() || q.reason?.trim()) return true;
  if (q.statements && q.statements.length > 0) return true;
  if (q.matchListA && q.matchListA.length > 0) return true;
  if (q.sourceType === "ai_variant" && q.questionTextPreview?.trim()) return true;
  return false;
}

function isImageQuestion(q: PracticeQuestion) {
  return Boolean(q.questionImageUrl?.trim()) && !usesTextVariantLayout(q);
}

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
    questionImageUrl: q.questionImageUrl,
    questionDiagramSvg: q.questionDiagramSvg,
  };
}

function statusLabel(status: string): string {
  if (status === "correct") return "Correct";
  if (status === "wrong") return "Wrong";
  if (status === "skipped") return "Skipped";
  if (status === "unattempted") return "Not attempted";
  return status;
}

export default function PracticeReviewPage() {
  const { sessionId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const qParam = searchParams.get("q") ?? "";

  const [result, setResult] = useState<SessionResultView | null>(null);
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [error, setError] = useState("");
  const [loadTick, setLoadTick] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(practiceReviewRoute(sessionId, qParam || undefined))}`);
      return;
    }
    setError("");
    fetchSessionResult(sessionId)
      .then(setResult)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load session"));
  }, [user, authLoading, sessionId, navigate, qParam, loadTick]);

  const reviews = result?.questionReviews ?? [];

  const activeReview: SessionQuestionReview | null = useMemo(() => {
    if (!reviews.length) return null;
    if (qParam) {
      return reviews.find((r) => r.questionId === qParam) ?? reviews[0];
    }
    return reviews[0];
  }, [reviews, qParam]);

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
    if (reviews.length && !qParam) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("q", activeReview.questionId);
          return next;
        },
        { replace: true }
      );
    }
  }, [activeReview, qParam, reviews.length, setSearchParams]);

  const tiles = result?.session.questionTiles ?? [];
  const activeIdx = activeReview
    ? reviews.findIndex((r) => r.questionId === activeReview.questionId)
    : -1;
  const prevReview = activeIdx > 0 ? reviews[activeIdx - 1] : null;
  const nextReview = activeIdx >= 0 && activeIdx < reviews.length - 1 ? reviews[activeIdx + 1] : null;

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
        loaderMode="practice"
        className="test-review-page test-review-page--practice pt-4"
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
        backHref={sessionResultRoute("practice", sessionId)}
        backLabel="Back to results"
        className="test-review-page test-review-page--practice pt-4"
        loaderMode="practice"
      >
        {null}
      </PageLoadShell>
    );
  }

  const answerRevealed =
    activeReview?.status === "correct" || activeReview?.status === "wrong";

  return (
    <main className="test-review-page test-review-page--practice pt-4 lg:pt-6">
      <header className="test-review-page__head">
        <Link to={sessionResultRoute("practice", sessionId)} className="test-review-page__back">
          <span className="material-symbols-outlined">arrow_back</span>
          Practice results
        </Link>
        <h1 className="test-review-page__title">Question review</h1>
        <p className="muted test-review-page__sub">Review any question from this practice session.</p>
      </header>

      {tiles.length > 0 && (
        <section className="glass-card session-result-tiles test-review-tiles">
          <SessionQuestionNav
            tiles={tiles}
            activeQuestionId={activeReview?.questionId ?? ""}
            onSelect={selectQuestion}
            practiceMode
            resultOverview
            hideHeadMeta
          />
        </section>
      )}

      {activeReview && question && (
        <div className="test-review-layout">
          <div className="test-review-layout__main">
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
                  className={`session-review-panel__status session-review-panel__status--${
                    activeReview.status === "unattempted" ? "skipped" : activeReview.status
                  }`}
                >
                  {statusLabel(activeReview.status)}
                </span>
              </header>

              <div className="test-review-question__media">
                {isImageQuestion(question) ? (
                  <ZoomableImage
                    src={imageSrc(question.questionImageUrl, question.questionId)}
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
                  You did not answer this question in the session.
                </p>
              )}

              {(activeReview.status === "wrong" ||
                activeReview.status === "correct" ||
                activeReview.status === "skipped") && (
                <TestReviewAnswerCompare review={activeReview} />
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
                      draggable={false}
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
                {activeIdx + 1} / {reviews.length}
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
          </div>

          {(activeReview.status === "wrong" || activeReview.status === "correct") && (
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
      )}

      {activeReview && (activeReview.status === "wrong" || activeReview.status === "correct") && (
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
    </main>
  );
}
