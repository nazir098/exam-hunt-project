import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchQuestionFeedback,
  submitQuestionFeedback,
  type QuestionFeedbackCategory,
  type QuestionFeedbackContext,
} from "../api";
import { useAuth } from "../auth/AuthContext";

const CATEGORIES: { value: QuestionFeedbackCategory; label: string }[] = [
  { value: "general", label: "General feedback" },
  { value: "wrong_answer", label: "Wrong answer / key" },
  { value: "typo", label: "Typo or wording" },
  { value: "image_issue", label: "Image quality / crop" },
  { value: "ai_variant", label: "AI variant issue" },
  { value: "other", label: "Other" },
];

type Props = {
  questionId: string;
  context: QuestionFeedbackContext;
  compact?: boolean;
  className?: string;
};

export default function QuestionFeedbackPanel({
  questionId,
  context,
  compact = false,
  className = "",
}: Props) {
  const { user, loading: authLoading } = useAuth();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState<QuestionFeedbackCategory>("general");
  const [aggregate, setAggregate] = useState<{ count: number; average: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !questionId) return;
    let cancelled = false;
    setSaved(false);
    setError(null);
    fetchQuestionFeedback(questionId)
      .then((r) => {
        if (cancelled) return;
        if (r.yourScore > 0) setScore(r.yourScore);
        setComment(r.comment ?? "");
        if (r.category) setCategory(r.category as QuestionFeedbackCategory);
        setAggregate(r.aggregate);
      })
      .catch(() => {
        /* optional */
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, questionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await submitQuestionFeedback(questionId, {
        score: score > 0 ? score : undefined,
        comment: comment.trim() || undefined,
        category,
        context,
      });
      if (res.yourScore > 0) setScore(res.yourScore);
      setComment(res.comment ?? "");
      if (res.category) setCategory(res.category as QuestionFeedbackCategory);
      setAggregate(res.aggregate);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit feedback");
    } finally {
      setBusy(false);
    }
  }

  const rootClass = [
    "question-feedback",
    compact ? "question-feedback--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (authLoading) {
    return null;
  }

  if (!user) {
    return (
      <section className={rootClass} aria-label="Question feedback">
        <p className="question-feedback__hint muted">
          <Link to={`/login?next=${encodeURIComponent(window.location.pathname)}`}>
            Sign in
          </Link>{" "}
          to rate or report this question.
        </p>
      </section>
    );
  }

  return (
    <section className={rootClass} aria-label="Question feedback">
      <div className="question-feedback__head">
        <h2 className="question-feedback__title">Rate &amp; report</h2>
        {aggregate && aggregate.count > 0 && (
          <p className="question-feedback__aggregate muted">
            {aggregate.average.toFixed(1)} ★ · {aggregate.count} rating
            {aggregate.count === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <form className="question-feedback__form" onSubmit={handleSubmit}>
        <div className="practice-run-rating practice-run-rating--compact question-feedback__stars">
          <p className="practice-run-rating__label">Your rating</p>
          <div className="practice-run-rating__stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`practice-run-rating__star${score >= n ? " is-on" : ""}`}
                onClick={() => setScore(n)}
                aria-label={`${n} stars`}
                aria-pressed={score >= n}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <label className="question-feedback__field">
          <span className="question-feedback__label">Report type</span>
          <select
            className="question-feedback__select"
            value={category}
            onChange={(e) => setCategory(e.target.value as QuestionFeedbackCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="question-feedback__field">
          <span className="question-feedback__label">Your feedback</span>
          <textarea
            className="question-feedback__textarea"
            rows={compact ? 2 : 3}
            placeholder="Describe the issue or share suggestions…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </label>

        {error && <p className="question-feedback__error">{error}</p>}
        {saved && !error && (
          <p className="question-feedback__saved" role="status">
            Thanks — your feedback was saved.
          </p>
        )}

        <button type="submit" className="btn primary question-feedback__submit" disabled={busy}>
          {busy ? "Saving…" : "Submit feedback"}
        </button>
      </form>
    </section>
  );
}
