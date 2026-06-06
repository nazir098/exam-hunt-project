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
import PracticeStudyAssistant from "../components/PracticeStudyAssistant";
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
  const [showSolution, setShowSolution] = useState(false);
  const [submitAnim, setSubmitAnim] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setResult(null);
    setSelected("");
    setRating(0);
    setShowSolution(false);
    setSubmitAnim(false);
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
      setSubmitAnim(true);
      refreshProgress();
      setSession((prev) =>
        prev
          ? {
              ...prev,
              correctCount: res.correctCount,
              wrongCount: res.wrongCount,
              totalMarks: res.sessionTotalMarks,
              adaptiveLevel: res.adaptiveLevel,
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
      <main className="practice-run-page">
        <p className="practice-run-loading">{error || "Loading practice…"}</p>
      </main>
    );
  }

  const diff = difficultyLabel(q.difficulty);
  const answered = session.correctCount + session.wrongCount;
  const currentQ = answered + (result ? 0 : 1);
  const progressPct = Math.round((answered / session.questionCount) * 100);
  const canSubmit = !!selected && !result && !busy;

  return (
    <main className="practice-run-page">
      <header className="practice-run-header sticky-below-header">
        <div className="practice-run-header__top">
          <Link to="/practice" className="practice-run-header__back">
            <span className="material-symbols-outlined">arrow_back</span>
            Practice
          </Link>
          <div className="practice-run-header__stats">
            <span className="practice-run-stat">
              <span className="practice-run-stat__label">Q</span>
              <strong>
                {currentQ}/{session.questionCount}
              </strong>
            </span>
            <span className="practice-run-stat practice-run-stat--score">
              <span className="practice-run-stat__label">Score</span>
              <strong>{session.totalMarks}</strong>
              <span className="practice-run-stat__sub">/{session.maxMarks}</span>
            </span>
            <span className="practice-run-stat practice-run-stat--ok">
              <span className="material-symbols-outlined">check_circle</span>
              {session.correctCount}
            </span>
            <span className="practice-run-stat practice-run-stat--bad">
              <span className="material-symbols-outlined">cancel</span>
              {session.wrongCount}
            </span>
          </div>
        </div>
        <div className="practice-run-progress" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div className="practice-run-progress__fill" style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      <div className={`practice-run-layout${result ? " practice-run-layout--result" : ""}`}>
        <div className="practice-run-main">
          <div className="practice-run-meta">
            <span className="practice-run-chip">{examDisplayName(q.exam, q.year)} {q.year}</span>
            <span className="practice-run-chip">{diff}</span>
            {q.chapter && <span className="practice-run-chip practice-run-chip--muted">{q.chapter}</span>}
            <span className="practice-run-chip practice-run-chip--accent">Level {session.adaptiveLevel}/3</span>
          </div>

          {!result ? (
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
                      >
                        <span className="practice-run-option__badge">{opt.label}</span>
                        <span className="practice-run-option__text">Option {opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {error && <p className="practice-run-error">{error}</p>}

              <button
                type="button"
                className="practice-submit-btn practice-run-submit"
                disabled={!canSubmit}
                onClick={submit}
              >
                <span className="material-symbols-outlined">send</span>
                {busy ? "Submitting…" : selected ? "Submit answer" : "Select an option to submit"}
              </button>

              <div className="practice-run-ai-inline lg:hidden">
                <PracticeStudyAssistant
                  questionId={questionId}
                  selectedAnswer={selected}
                  formulaRelevant={q.formulaRelevant}
                  layout="inline"
                />
              </div>
            </>
          ) : (
            <section
              className={`practice-run-result glass-card${submitAnim ? " is-revealed" : ""}${
                result.correct ? " practice-run-result--correct" : " practice-run-result--wrong"
              }`}
            >
              <div className="practice-run-result__banner">
                <span
                  className="material-symbols-outlined practice-run-result__icon"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {result.correct ? "check_circle" : "cancel"}
                </span>
                <div>
                  <h2 className="practice-run-result__title">
                    {result.correct ? "Correct!" : "Incorrect"}
                  </h2>
                  <p className="practice-run-result__marks">
                    {result.correct ? "+4 marks" : "−1 mark"}
                    <span className="practice-run-result__marks-total">
                      · Session {result.sessionTotalMarks}/{result.sessionMaxMarks}
                    </span>
                  </p>
                </div>
              </div>

              <dl className="practice-run-result__facts">
                <div>
                  <dt>Correct answer</dt>
                  <dd>{result.correctAnswer}</dd>
                </div>
                {!result.correct && (
                  <div>
                    <dt>Your answer</dt>
                    <dd>{selected}</dd>
                  </div>
                )}
              </dl>

              {result.hasSolution && result.solutionImageUrl && (
                <div className="practice-run-solution">
                  <button
                    type="button"
                    className="practice-run-solution__toggle"
                    onClick={() => setShowSolution((v) => !v)}
                    aria-expanded={showSolution}
                  >
                    <span className="material-symbols-outlined">
                      {showSolution ? "visibility_off" : "visibility"}
                    </span>
                    {showSolution ? "Hide solution" : "View solution"}
                  </button>
                  <div className={`practice-run-solution__panel${showSolution ? " is-open" : ""}`}>
                    <img src={imageSrc(result.solutionImageUrl)} alt="Solution" />
                  </div>
                </div>
              )}

              <div className="practice-run-ai-inline lg:hidden">
                <PracticeStudyAssistant
                  questionId={questionId}
                  selectedAnswer={selected}
                  submitted
                  correct={result.correct}
                  prominent
                  formulaRelevant={q.formulaRelevant}
                  layout="inline"
                />
              </div>

              <div className="practice-run-rating">
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

              <button type="button" onClick={goNext} className="practice-submit-btn practice-run-next">
                {result.nextQuestionId ? "Next question" : "Finish session"}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </section>
          )}
        </div>

        <aside className="practice-run-aside hidden lg:block">
          <PracticeStudyAssistant
            questionId={questionId}
            selectedAnswer={selected}
            submitted={!!result}
            correct={result?.correct ?? null}
            prominent={!!result}
            formulaRelevant={q.formulaRelevant}
            layout="sidebar"
          />
        </aside>
      </div>
    </main>
  );
}
