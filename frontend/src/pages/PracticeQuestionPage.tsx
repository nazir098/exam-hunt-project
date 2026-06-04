import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchPracticeQuestion,
  fetchPracticeSession,
  fetchQuestionRating,
  PracticeQuestion,
  PracticeSessionView,
  rateQuestion,
  SubmitResult,
  submitPracticeAnswer,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import { difficultyLabel, examDisplayName } from "../utils/labels";

const OPTIONS = ["1", "2", "3", "4"];

export default function PracticeQuestionPage() {
  const { sessionId = "", questionId = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProgress } = useAuth();
  const [session, setSession] = useState<PracticeSessionView | null>(null);
  const [q, setQ] = useState<PracticeQuestion | null>(null);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [rating, setRating] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setResult(null);
    setSelected("");
    setRating(0);
    const [s, question] = await Promise.all([
      fetchPracticeSession(sessionId),
      fetchPracticeQuestion(questionId),
    ]);
    setSession(s);
    setQ(question);
    try {
      const r = await fetchQuestionRating(questionId);
      if (r.yourScore > 0) setRating(r.yourScore);
    } catch {
      /* optional */
    }
  }, [sessionId, questionId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/practice/${sessionId}/${questionId}`)}`);
      return;
    }
    load().catch((e) => setError(e.message));
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
      setSession((prev) =>
        prev
          ? {
              ...prev,
              correctCount: res.correctCount,
              wrongCount: res.wrongCount,
              totalMarks: res.sessionTotalMarks,
              currentIndex: res.nextQuestionId ? prev.currentIndex + 1 : prev.questionCount,
              status: res.sessionStatus,
              currentQuestionId: res.nextQuestionId,
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
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
      navigate(`/practice/${sessionId}/${result.nextQuestionId}`);
    } else {
      navigate("/practice");
    }
  }

  if (!user || !q || !session) {
    return (
      <main className="lumina-page detail-page">
        <p className="muted">{error || "Loading practice…"}</p>
      </main>
    );
  }

  const diff = difficultyLabel(q.difficulty);
  const position = Math.min(session.currentIndex + 1, session.questionCount);
  const progressPct = Math.round((session.currentIndex / session.questionCount) * 100);

  return (
    <main className="lumina-page detail-page practice-detail">
      <div className="practice-session-bar">
        <div className="practice-session-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="practice-session-meta">
        <Link to="/practice" className="muted">
          ← Practice session
        </Link>
        <div className="practice-session-score">
          <strong>{session.totalMarks}</strong>
          <span className="muted"> / {session.maxMarks} marks</span>
          <span className="muted">
            · {session.correctCount}✓ {session.wrongCount}✗ · {position}/{session.questionCount}
          </span>
        </div>
      </div>

      <div className="detail-chips">
        <span className="detail-chip detail-chip--secondary">
          {examDisplayName(q.exam, q.year)} {q.year}
        </span>
        <span className="detail-chip">{diff}</span>
        <span className="detail-chip">Level {session.adaptiveLevel}/3</span>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="glass-card detail-question-card">
            <h1 className="detail-question-title">
              Question {q.questionNo}
              {q.chapter ? ` · ${q.chapter}` : ""}
            </h1>
            <div className="detail-media-frame">
              {q.questionImageUrl ? (
                <img
                  src={q.questionImageUrl}
                  alt={`Question ${q.questionNo}`}
                  className="detail-media-img"
                />
              ) : (
                <p className="detail-placeholder">{q.questionTextPreview}</p>
              )}
            </div>
          </div>

          {result && (
            <section className={`detail-solution ${result.correct ? "is-correct" : "is-wrong"}`}>
              <div className="detail-solution-head">
                <div className="detail-solution-line" />
                <h2>{result.correct ? "Correct!" : "Incorrect"}</h2>
                <div className="detail-solution-line" />
              </div>
              <div className="glass-card detail-answer-card">
                <p>
                  Correct option: <strong>{result.correctAnswer}</strong>
                  {!result.correct && (
                    <>
                      {" "}
                      · You chose <strong>{selected}</strong>
                    </>
                  )}
                </p>
                {result.hasSolution && result.solutionImageUrl && (
                  <div className="detail-media-frame">
                    <img src={result.solutionImageUrl} alt="Solution" className="detail-media-img" />
                  </div>
                )}
                <div className="rating-block">
                  <p className="detail-side-label">Rate this question</p>
                  <div className="star-row">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={rating >= n ? "star-btn active" : "star-btn"}
                        onClick={() => saveRating(n)}
                        aria-label={`${n} stars`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" className="btn-electric btn-block" onClick={goNext}>
                  {result.nextQuestionId ? "Next question →" : "Finish session"}
                </button>
              </div>
            </section>
          )}
        </div>

        <aside className="detail-side">
          {!result ? (
            <>
              <p className="detail-side-label">Select one option</p>
              <div className="detail-options">
                {OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={
                      selected === opt ? "detail-option glass-card active" : "detail-option glass-card"
                    }
                    onClick={() => setSelected(opt)}
                    disabled={busy}
                  >
                    <span className="detail-option-letter">{opt}</span>
                    <span>Option {opt}</span>
                  </button>
                ))}
              </div>
              {error && <p className="error-text">{error}</p>}
              <button
                type="button"
                className="btn-electric btn-block"
                disabled={!selected || busy}
                onClick={submit}
              >
                {busy ? "Checking…" : "Check answer"}
              </button>
            </>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
