import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  fetchPracticeQuestion,
  fetchPracticeSession,
  fetchQuestionRating,
  finishPracticeSession,
  PracticeQuestion,
  PracticeSessionView,
  rateQuestion,
  SubmitResult,
  skipPracticeQuestion,
  submitPracticeAnswer,
  toggleMarkForReview,
  type PracticeAiFeature,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import PracticeStudyAssistant, { explainFeatureForResult } from "../components/PracticeStudyAssistant";
import ProductModeBanner from "../components/ProductModeBanner";
import SessionQuestionNav from "../components/SessionQuestionNav";
import SessionTimer from "../components/SessionTimer";
import { sessionRoute, type ProductMode } from "../navigation/modes";
import { difficultyLabel, examDisplayName } from "../utils/labels";

const OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
];

function imageSrc(url: string) {
  if (url.startsWith("http")) return url;
  return url;
}

function optionLabel(value: string) {
  return `Option ${value}`;
}

function sequentialNav(tiles: PracticeSessionView["questionTiles"], questionId: string) {
  const idx = tiles?.findIndex((t) => t.questionId === questionId) ?? -1;
  if (idx < 0 || !tiles) return { prevId: null, nextId: null };
  return {
    prevId: idx > 0 ? tiles[idx - 1].questionId : null,
    nextId: idx < tiles.length - 1 ? tiles[idx + 1].questionId : null,
  };
}

export default function PracticeQuestionPage() {
  const { sessionId = "", questionId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeMode: ProductMode = location.pathname.startsWith("/test/session/") ? "test" : "practice";
  const { user, loading: authLoading, refreshProgress } = useAuth();
  const [session, setSession] = useState<PracticeSessionView | null>(null);
  const [q, setQ] = useState<PracticeQuestion | null>(null);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [rating, setRating] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [aiTrigger, setAiTrigger] = useState<PracticeAiFeature | null>(null);

  const resultPath = useCallback(
    (sid: string) => (routeMode === "test" ? `/test/result/${sid}` : `/practice/result/${sid}`),
    [routeMode]
  );

  const sessionPath = useCallback(
    (sid: string, qid: string) => sessionRoute(routeMode, sid, qid),
    [routeMode]
  );

  const load = useCallback(async () => {
    setError("");
    setResult(null);
    setSelected("");
    setRating(0);
    setShowSolution(false);
    const s = await fetchPracticeSession(sessionId);
    setSession(s);
    const inSession = s.questionTiles?.some((t) => t.questionId === questionId) ?? false;
    if (s.status === "completed" && !inSession) {
      setError("This session has ended. Start a new one from Practice or Test.");
      return;
    }
    if (s.status === "active" && !inSession && s.currentQuestionId && s.currentQuestionId !== questionId) {
      navigate(sessionPath(sessionId, s.currentQuestionId), { replace: true });
      return;
    }
    if (s.status === "active" && !s.currentQuestionId) {
      setError("This session has ended.");
      return;
    }
    try {
      const question = await fetchPracticeQuestion(questionId);
      setQ(question);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load question";
      if (msg.toLowerCase().includes("not found") && s.currentQuestionId) {
        navigate(sessionPath(sessionId, s.currentQuestionId), { replace: true });
        return;
      }
      throw e;
    }
    try {
      const r = await fetchQuestionRating(questionId);
      if (r.yourScore > 0) setRating(r.yourScore);
    } catch {
      /* optional */
    }
  }, [sessionId, questionId, navigate, sessionPath]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [user, authLoading, load, navigate, sessionId, questionId]);

  async function submit() {
    if (!selected || !session) return;
    setBusy(true);
    setError("");
    try {
      const res = await submitPracticeAnswer({
        sessionId: session.id,
        questionId,
        selectedAnswer: selected,
      });
      setResult(res);
      refreshProgress();
      const updated = await fetchPracticeSession(session.id);
      setSession(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function skipQuestion() {
    if (!session || result) return;
    setBusy(true);
    setError("");
    try {
      const res = await skipPracticeQuestion({ sessionId: session.id, questionId });
      refreshProgress();
      if (res.nextQuestionId) {
        navigate(sessionPath(sessionId, res.nextQuestionId));
      } else {
        navigate(resultPath(session.id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not skip question");
    } finally {
      setBusy(false);
    }
  }

  async function saveRating(score: number) {
    setRating(score);
    await rateQuestion(questionId, score);
  }

  function goNext() {
    if (result?.nextQuestionId) {
      navigate(sessionPath(sessionId, result.nextQuestionId));
    } else {
      navigate(resultPath(sessionId));
    }
  }

  async function toggleReview() {
    if (!session || routeMode !== "test") return;
    setBusy(true);
    try {
      const updated = await toggleMarkForReview(session.id, questionId);
      setSession(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update review mark");
    } finally {
      setBusy(false);
    }
  }

  async function submitTestEarly() {
    if (!session || routeMode !== "test" || session.status !== "active") return;
    const unanswered =
      session.questionCount -
      session.correctCount -
      session.wrongCount -
      (session.skipCount ?? 0);
    const msg =
      unanswered > 0
        ? `Submit test now? ${unanswered} question(s) will be counted as skipped.`
        : "Submit test and view your results?";
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const updated = await finishPracticeSession(session.id);
      setSession(updated);
      refreshProgress();
      navigate(resultPath(session.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit test");
    } finally {
      setBusy(false);
    }
  }

  function goPrev() {
    const { prevId } = sequentialNav(session?.questionTiles, questionId);
    if (prevId) navigate(sessionPath(sessionId, prevId));
  }

  function goSequentialNext() {
    const { nextId } = sequentialNav(session?.questionTiles, questionId);
    if (nextId) {
      navigate(sessionPath(sessionId, nextId));
      return;
    }
    if (result?.nextQuestionId) {
      navigate(sessionPath(sessionId, result.nextQuestionId));
      return;
    }
    goNext();
  }

  function triggerAi(feature: PracticeAiFeature) {
    setAiTrigger(feature);
  }

  function goToTile(qid: string) {
    if (qid === questionId) return;
    navigate(sessionPath(sessionId, qid));
  }

  const isMarked =
    session?.markedForReviewIds?.includes(questionId) ?? false;

  if (!user || !q || !session) {
    return (
      <main className="practice-run-page">
        <p className="practice-run-loading">{error || "Loading practice…"}</p>
      </main>
    );
  }

  const diff = difficultyLabel(q.difficulty);
  const answered = session.correctCount + session.wrongCount;
  const currentQ = answered + (result ? 0 : 1);
  const progressPct = Math.round((answered / session.questionCount) * 100);
  const canSubmit = !!selected && !result && !busy && session.status === "active";
  const activeTile = session.questionTiles?.find((t) => t.questionId === questionId);
  const isTestActive = routeMode === "test" && session.status === "active";
  const isAnsweredTile =
    activeTile?.status === "correct" || activeTile?.status === "wrong" || activeTile?.status === "skipped";
  const tileLocked =
    routeMode === "practice" &&
    !result &&
    session.status === "active" &&
    activeTile &&
    isAnsweredTile;
  const testAnswerSaved = isTestActive && !result && !!activeTile && isAnsweredTile;
  const remaining =
    session.questionCount - answered - (session.skipCount ?? 0);
  const { prevId, nextId } = sequentialNav(session.questionTiles, questionId);
  const isSessionCurrentQuestion = session.currentQuestionId === questionId;
  const canGoNext =
    !!nextId || (isSessionCurrentQuestion && session.status === "active" && !result);
  const showPracticeAssistant = routeMode === "practice" && (!!result || !!tileLocked);
  const showAssistantPanel = showPracticeAssistant || isTestActive;
  const feedbackCorrect = result ? result.correct : activeTile?.status === "correct";
  const feedbackWrong = result ? !result.correct : activeTile?.status === "wrong";
  const scoreMarks = result?.sessionTotalMarks ?? session.totalMarks;
  const scoreMax = result?.sessionMaxMarks ?? session.maxMarks;
  const showFormula = q.formulaRelevant;
  const backTo = routeMode === "test" ? "/test/create" : "/practice";
  const backLabel = routeMode === "test" ? "Test" : "Practice";
  const hasSolution = result?.hasSolution ?? q.hasSolution;
  const solutionUrl = result?.solutionImageUrl;

  const assistantProps = {
    questionId,
    selectedAnswer: selected,
    submitted: routeMode === "practice" && (!!result || feedbackCorrect || feedbackWrong),
    correct: routeMode === "practice"
      ? feedbackCorrect
        ? true
        : feedbackWrong
          ? false
          : null
      : null,
    prominent: showPracticeAssistant,
    formulaRelevant: q.formulaRelevant,
    hasSolution: result?.hasSolution ?? q.hasSolution,
    triggerFeature: aiTrigger,
    onTriggerConsumed: () => setAiTrigger(null),
    examLocked: isTestActive,
  };

  function renderPracticeAnswerActions(isCorrect: boolean) {
    return (
      <div className="practice-run-result__actions practice-run-result__actions--compact">
        {hasSolution && (
          <button
            type="button"
            className="practice-run-result__action practice-run-result__action--primary"
            onClick={() => setShowSolution(true)}
          >
            <span className="material-symbols-outlined">menu_book</span>
            View Solution
          </button>
        )}
        <button
          type="button"
          className="practice-run-result__action"
          onClick={() => triggerAi(explainFeatureForResult(isCorrect))}
        >
          Explain
        </button>
        {!isCorrect && (
          <button type="button" className="practice-run-result__action" onClick={() => triggerAi("explain_basics")}>
            Basics
          </button>
        )}
        {!isCorrect && showFormula && (
          <button type="button" className="practice-run-result__action" onClick={() => triggerAi("formula")}>
            Formula
          </button>
        )}
        <button type="button" className="practice-run-result__action" onClick={() => triggerAi("similar_questions")}>
          Similar
        </button>
        <button
          type="button"
          className="practice-run-result__action practice-run-result__action--next"
          onClick={goSequentialNext}
        >
          Next Question
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    );
  }

  function renderTestMarkReview() {
    if (!isTestActive) return null;
    return (
      <div className="practice-run-actions practice-run-actions--secondary">
        <button
          type="button"
          className={`practice-run-mark-review${isMarked ? " is-on" : ""}`}
          disabled={busy}
          onClick={toggleReview}
        >
          <span className="material-symbols-outlined">flag</span>
          {isMarked ? "Marked for review" : "Mark for review"}
        </button>
      </div>
    );
  }

  function renderTestSavedCard() {
    return (
      <section className="practice-run-result practice-run-result--test-saved glass-card is-revealed">
        <div className="practice-run-result__banner practice-run-result__banner--compact">
          <span
            className="material-symbols-outlined practice-run-result__icon practice-run-result__icon--saved"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            task_alt
          </span>
          <h2 className="practice-run-result__title">Answer Saved</h2>
        </div>
        <div className="practice-run-result__actions practice-run-result__actions--compact">
          <button
            type="button"
            className="practice-run-result__action practice-run-result__action--primary"
            onClick={goSequentialNext}
          >
            Next Question
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        {renderTestMarkReview()}
      </section>
    );
  }

  function renderPracticeResult(res: SubmitResult) {
    return (
      <section
        className={`practice-run-result practice-run-result--compact glass-card is-revealed${
          res.correct ? " practice-run-result--correct" : " practice-run-result--wrong"
        }`}
      >
        <div className="practice-run-result__banner practice-run-result__banner--compact">
          <span
            className="material-symbols-outlined practice-run-result__icon"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {res.correct ? "check_circle" : "cancel"}
          </span>
          <div>
            <h2 className="practice-run-result__title">
              {res.correct ? "Correct" : "Incorrect"}
            </h2>
            {!res.correct && (
              <p className="practice-run-result__answer-line">
                Correct Answer: {optionLabel(res.correctAnswer)}
              </p>
            )}
            <p className="practice-run-result__delta">{res.correct ? "+4 Marks" : "−1 Mark"}</p>
            <p className="practice-run-result__score-line">
              Current Score: {scoreMarks}/{scoreMax}
            </p>
          </div>
        </div>

        {hasSolution && solutionUrl && (
          <div className="practice-run-solution practice-run-solution--compact">
            <div className={`practice-run-solution__panel${showSolution ? " is-open" : ""}`}>
              <img src={imageSrc(solutionUrl)} alt="Solution" />
            </div>
          </div>
        )}

        {renderPracticeAnswerActions(res.correct)}

        <div className="practice-run-rating practice-run-rating--compact">
          <p className="practice-run-rating__label">Rate this question</p>
          <div className="practice-run-rating__stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`practice-run-rating__star${rating >= n ? " is-on" : ""}`}
                onClick={() => saveRating(n)}
                aria-label={`${n} stars`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  async function handleNextQuestion() {
    if (!session || busy) return;
    if (isSessionCurrentQuestion && session.status === "active" && !result) {
      await skipQuestion();
      return;
    }
    if (nextId) {
      navigate(sessionPath(sessionId, nextId));
    }
  }

  function renderPracticeLockedReview() {
    return (
      <section
        className={`practice-run-result practice-run-result--compact glass-card practice-run-result--locked is-revealed${
          feedbackCorrect ? " practice-run-result--correct" : " practice-run-result--wrong"
        }`}
      >
        <div className="practice-run-result__banner practice-run-result__banner--compact">
          <span
            className="material-symbols-outlined practice-run-result__icon"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {feedbackCorrect ? "check_circle" : activeTile?.status === "skipped" ? "skip_next" : "cancel"}
          </span>
          <div>
            <h2 className="practice-run-result__title">
              {feedbackCorrect ? "Correct" : activeTile?.status === "skipped" ? "Skipped" : "Incorrect"}
            </h2>
            {feedbackCorrect && (
              <>
                <p className="practice-run-result__delta">+4 Marks</p>
                <p className="practice-run-result__score-line">
                  Current Score: {scoreMarks}/{scoreMax}
                </p>
              </>
            )}
            {feedbackWrong && (
              <>
                <p className="practice-run-result__answer-line muted">
                  You already answered this question. Use Explain or Study Mode to review.
                </p>
                <p className="practice-run-result__delta">−1 Mark</p>
                <p className="practice-run-result__score-line">
                  Current Score: {scoreMarks}/{scoreMax}
                </p>
              </>
            )}
            {activeTile?.status === "skipped" && (
              <p className="practice-run-result__score-line">
                Current Score: {scoreMarks}/{scoreMax}
              </p>
            )}
          </div>
        </div>
        {(feedbackCorrect || feedbackWrong) && renderPracticeAnswerActions(!!feedbackCorrect)}
      </section>
    );
  }

  function renderQuestionNavRow() {
    return (
      <div className="practice-run-actions practice-run-actions--trio">
        <button
          type="button"
          className="practice-run-nav-btn"
          disabled={!prevId || busy}
          onClick={goPrev}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Previous
        </button>
        <button
          type="button"
          className="practice-submit-btn practice-run-submit practice-run-submit--center"
          disabled={!canSubmit}
          onClick={submit}
        >
          <span className="material-symbols-outlined">send</span>
          {busy ? "Submitting…" : selected ? "Submit" : "Select option"}
        </button>
        <button
          type="button"
          className="practice-run-nav-btn"
          disabled={!canGoNext || busy}
          onClick={handleNextQuestion}
        >
          Next
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    );
  }

  return (
    <main className={`practice-run-page practice-run-page--${routeMode}`}>
      <ProductModeBanner mode={routeMode} compact />
      <header className="practice-run-header sticky-below-header">
        <div className="practice-run-header__top">
          <Link to={backTo} className="practice-run-header__back">
            <span className="material-symbols-outlined">arrow_back</span>
            {backLabel}
          </Link>
          {routeMode === "test" && session.status === "active" && (
            <button type="button" className="practice-run-submit-test" disabled={busy} onClick={submitTestEarly}>
              Submit test
            </button>
          )}
        </div>
        {isTestActive ? (
          <div className="practice-run-header__score-row practice-run-header__score-row--test">
            <div className="practice-run-header__progress-meta practice-run-header__progress-meta--test">
              <span>Answered: {answered}</span>
              <span>Remaining: {Math.max(0, remaining)}</span>
            </div>
            <SessionTimer startedAt={session.startedAt} label="Time" compact />
          </div>
        ) : (
          <>
            <div className="practice-run-header__score-row">
              <div className="practice-run-header__score-block">
                <span className="practice-run-header__score-label">Score</span>
                <strong className="practice-run-header__score-value">
                  {scoreMarks}/{scoreMax}
                </strong>
              </div>
              {session.status === "active" && (
                <SessionTimer startedAt={session.startedAt} label="Time" compact />
              )}
            </div>
            <div
              className="practice-run-header__stats"
              aria-label={`Score ${scoreMarks} of ${scoreMax}, ${answered} answered, ${remaining} remaining`}
            >
              <span className="practice-run-header-chip practice-run-header-chip--ok">
                <span className="material-symbols-outlined" aria-hidden>
                  check
                </span>
                {session.correctCount}
              </span>
              <span className="practice-run-header-chip practice-run-header-chip--bad">
                <span className="material-symbols-outlined" aria-hidden>
                  close
                </span>
                {session.wrongCount}
              </span>
              <span className="practice-run-header-chip practice-run-header-chip--skip">
                <span className="material-symbols-outlined" aria-hidden>
                  skip_next
                </span>
                {session.skipCount ?? 0}
              </span>
              <span className="practice-run-header-chip practice-run-header-chip--q">
                Q {currentQ}/{session.questionCount}
              </span>
            </div>
            <div className="practice-run-header__progress-meta">
              <span>Answered: {answered}</span>
              <span>Remaining: {Math.max(0, remaining)}</span>
            </div>
            <div
              className="practice-run-progress"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="practice-run-progress__fill" style={{ width: `${progressPct}%` }} />
            </div>
          </>
        )}
        {session.questionTiles && session.questionTiles.length > 0 && (
          <SessionQuestionNav
            tiles={session.questionTiles}
            activeQuestionId={questionId}
            onSelect={goToTile}
            showMarked={routeMode === "test"}
            markedIds={session.markedForReviewIds}
            examMode={isTestActive}
          />
        )}
      </header>

      <div className={`practice-run-layout${showPracticeAssistant ? " practice-run-layout--result" : ""}`}>
        <div className="practice-run-main">
          <div className="practice-run-meta">
            <span className="practice-run-chip">{examDisplayName(q.exam, q.year)} {q.year}</span>
            <span className="practice-run-chip">{diff}</span>
            {q.chapter && <span className="practice-run-chip practice-run-chip--muted">{q.chapter}</span>}
            <span className="practice-run-chip practice-run-chip--accent">
              {routeMode === "test" ? "Test Mode" : `Level ${session.adaptiveLevel}/3`}
            </span>
          </div>

          {result ? (
            routeMode === "test" ? renderTestSavedCard() : renderPracticeResult(result)
          ) : testAnswerSaved ? (
            <>
              <section className="practice-run-question glass-card">
                <h1 className="practice-run-question__title">Question {q.questionNo}</h1>
                <div className="practice-run-question__media">
                  {q.questionImageUrl ? (
                    <img src={imageSrc(q.questionImageUrl)} alt={`Question ${q.questionNo}`} />
                  ) : (
                    <p className="practice-run-question__fallback">{q.questionTextPreview || "No image"}</p>
                  )}
                </div>
              </section>
              {renderTestSavedCard()}
            </>
          ) : tileLocked ? (
            <>
              <section className="practice-run-question glass-card">
                <h1 className="practice-run-question__title">Question {q.questionNo}</h1>
                <div className="practice-run-question__media">
                  {q.questionImageUrl ? (
                    <img src={imageSrc(q.questionImageUrl)} alt={`Question ${q.questionNo}`} />
                  ) : (
                    <p className="practice-run-question__fallback">{q.questionTextPreview || "No image"}</p>
                  )}
                </div>
              </section>
              {renderPracticeLockedReview()}
            </>
          ) : (
            <>
              <section className="practice-run-question glass-card">
                <h1 className="practice-run-question__title">Question {q.questionNo}</h1>
                <div className="practice-run-question__media">
                  {q.questionImageUrl ? (
                    <img
                      src={imageSrc(q.questionImageUrl)}
                      alt={`Question ${q.questionNo}`}
                    />
                  ) : (
                    <p className="practice-run-question__fallback">{q.questionTextPreview || "No image"}</p>
                  )}
                </div>
              </section>

              <section className="practice-run-options" aria-label="Answer options">
                <p className="practice-run-options__label">Select one option</p>
                <div className="practice-run-options__list">
                  {OPTIONS.map((opt) => {
                    const active = selected === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={busy}
                        onClick={() => setSelected(opt.value)}
                        className={`practice-run-option${active ? " is-selected" : ""}`}
                        aria-label={`Option ${opt.label}`}
                        aria-pressed={active}
                      >
                        <span className="practice-run-option__badge">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {error && <p className="practice-run-error">{error}</p>}

              {renderQuestionNavRow()}

              {renderTestMarkReview()}
            </>
          )}
        </div>

        <aside
          className={`practice-run-aside hidden lg:block${showAssistantPanel ? "" : " practice-run-aside--hidden"}`}
        >
          {showAssistantPanel && <PracticeStudyAssistant {...assistantProps} layout="sidebar" />}
        </aside>
      </div>

      {showAssistantPanel && (
        <div className="practice-run-ai-inline lg:hidden">
          <PracticeStudyAssistant {...assistantProps} layout="inline" />
        </div>
      )}
    </main>
  );
}
