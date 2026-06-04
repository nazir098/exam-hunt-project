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
import HintTooltip from "../components/HintTooltip";
import { PRACTICE_MODE_HINT } from "../navigation/modeHints";
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
      <main className="practice-run-page px-margin-mobile lg:px-0 pt-6">
        <p className="text-on-surface-variant">{error || "Loading practice…"}</p>
      </main>
    );
  }

  const diff = difficultyLabel(q.difficulty);
  const answered = session.correctCount + session.wrongCount;
  const progressPct = Math.round((answered / session.questionCount) * 100);
  const canSubmit = !!selected && !result && !busy;

  return (
    <main className="practice-run-page px-margin-mobile lg:px-0 pt-4 lg:pt-6">
      <div className="practice-run-progress" aria-hidden>
        <div className="practice-run-progress__fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-md mb-lg">
        <Link to="/practice" className="text-on-surface-variant text-body-sm hover:text-primary font-bold">
          ← Practice session
        </Link>
        <div className="text-body-sm text-on-surface-variant">
          <strong className="text-primary text-headline-md">{session.totalMarks}</strong>
          <span> / {session.maxMarks} marks</span>
          <span className="mx-1">·</span>
          <span>
            {session.correctCount}✓ {session.wrongCount}✗
          </span>
          <span className="mx-1">·</span>
          <span>
            Q{answered + (result ? 0 : 1)}/{session.questionCount}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-sm mb-lg">
        <span className="px-3 py-1 rounded-full bg-surface-container-high border border-white/10 text-caption text-secondary">
          {examDisplayName(q.exam, q.year)} {q.year}
        </span>
        <span className="px-3 py-1 rounded-full bg-surface-container-high border border-white/10 text-caption">
          {diff}
        </span>
        <span className="px-3 py-1 rounded-full bg-primary-container/20 border border-primary/30 text-caption text-primary">
          Adaptive level {session.adaptiveLevel}/3
        </span>
      </div>

      <div className="glass-card rounded-xl p-lg mb-lg">
        <h1 className="text-headline-md font-headline-md text-on-surface mb-lg">
          Question {q.questionNo}
          {q.chapter ? ` · ${q.chapter}` : ""}
        </h1>
        <div className="aspect-video w-full rounded-lg bg-surface-deep/50 border border-white/5 overflow-hidden mb-md">
          {q.questionImageUrl ? (
            <img
              className="w-full h-full object-contain bg-white"
              src={imageSrc(q.questionImageUrl)}
              alt={`Question ${q.questionNo}`}
            />
          ) : (
            <p className="p-lg text-outline text-center">{q.questionTextPreview || "No image"}</p>
          )}
        </div>
      </div>

      {!result ? (
        <>
          <p className="text-label-md text-on-surface-variant uppercase tracking-widest mb-sm flex items-center gap-2">
            Select one option
            <HintTooltip text={PRACTICE_MODE_HINT} />
          </p>
          <div className="space-y-sm mb-lg">
            {OPTIONS.map((opt) => {
              const active = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={busy}
                  onClick={() => setSelected(opt.value)}
                  className={`glass-card p-lg rounded-xl flex items-center gap-md w-full text-left transition-all border ${
                    active ? "bg-primary/10 border-primary" : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold shrink-0 ${
                      active
                        ? "bg-primary text-on-primary border-primary"
                        : "border-white/20 text-on-surface-variant"
                    }`}
                  >
                    {opt.label}
                  </div>
                  <span className="text-body-md text-on-surface">Option {opt.label}</span>
                </button>
              );
            })}
          </div>

          {error && <p className="text-error text-body-sm mb-md">{error}</p>}

          <button
            type="button"
            className="practice-submit-btn practice-submit-btn--inline w-full py-4 rounded-xl font-bold text-body-md disabled:opacity-50 disabled:cursor-not-allowed hidden lg:flex items-center justify-center gap-2"
            disabled={!canSubmit}
            onClick={submit}
          >
            <span className="material-symbols-outlined">send</span>
            {busy ? "Submitting…" : "Submit answer"}
          </button>
        </>
      ) : (
        <section
          className={`glass-card rounded-xl p-lg mb-lg border-l-4 ${
            result.correct ? "border-secondary" : "border-error"
          }`}
        >
          <div className="flex items-center gap-sm mb-md">
            <span
              className={`material-symbols-outlined text-headline-md ${
                result.correct ? "text-secondary" : "text-error"
              }`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {result.correct ? "check_circle" : "cancel"}
            </span>
            <h2 className="text-headline-md font-headline-md">
              {result.correct ? "Correct! +4 marks" : "Incorrect · −1 mark"}
            </h2>
          </div>
          <p className="text-body-md text-on-surface-variant mb-md">
            Correct answer: <strong className="text-on-surface">{result.correctAnswer}</strong>
            {!result.correct && (
              <>
                {" "}
                · You chose <strong className="text-on-surface">{selected}</strong>
              </>
            )}
          </p>
          <p className="text-caption text-on-surface-variant mb-lg">
            Next question difficulty targets level {result.adaptiveLevel}/3 based on your result.
          </p>
          {result.hasSolution && result.solutionImageUrl && (
            <div className="aspect-video w-full rounded-lg overflow-hidden border border-white/5 bg-white mb-lg">
              <img
                src={imageSrc(result.solutionImageUrl)}
                alt="Solution"
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="mb-lg">
            <p className="text-caption font-bold uppercase tracking-wider text-on-surface-variant mb-sm">
              Rate this question
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`w-10 h-10 rounded-lg border text-lg ${
                    rating >= n
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-white/10 text-on-surface-variant"
                  }`}
                  onClick={() => saveRating(n)}
                  aria-label={`${n} stars`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={goNext}
            className="practice-submit-btn w-full py-4 rounded-xl font-bold"
          >
            {result.nextQuestionId ? "Next question →" : "Finish session"}
          </button>
        </section>
      )}

      {!result && (
        <div className="practice-submit-bar lg:hidden">
          <button
            type="button"
            className="practice-submit-btn w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2"
            disabled={!canSubmit}
            onClick={submit}
          >
            <span className="material-symbols-outlined">send</span>
            {busy ? "Submitting…" : selected ? "Submit answer" : "Select an option to submit"}
          </button>
        </div>
      )}
    </main>
  );
}
