import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchQuestionFeedback,
  hasQuestionFeedback,
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
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
  defaultExpanded?: boolean;
  /** Hide toggle bar; parent opens via Report (form only when expanded). */
  hideToggle?: boolean;
};

function categoryLabel(value: string | null) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value ?? "General feedback";
}

export default function QuestionFeedbackPanel({
  questionId,
  context,
  compact = false,
  className = "",
  expanded,
  onExpandedChange,
  defaultExpanded = false,
  hideToggle = false,
}: Props) {
  const { user, loading: authLoading } = useAuth();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState<QuestionFeedbackCategory>("general");
  const [aggregate, setAggregate] = useState<{ count: number; average: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openInternal, setOpenInternal] = useState(defaultExpanded);
  const open = expanded ?? openInternal;

  function setOpen(next: boolean) {
    if (expanded === undefined) setOpenInternal(next);
    onExpandedChange?.(next);
  }

  useEffect(() => {
    if (authLoading || !user || !questionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchQuestionFeedback(questionId)
      .then((r) => {
        if (cancelled) return;
        if (r.yourScore > 0) setScore(r.yourScore);
        setComment(r.comment ?? "");
        if (r.category) setCategory(r.category as QuestionFeedbackCategory);
        setAggregate(r.aggregate);
        setAlreadySubmitted(hasQuestionFeedback(r));
      })
      .catch(() => {
        if (!cancelled) setAlreadySubmitted(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, questionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || alreadySubmitted) return;
    setBusy(true);
    setError(null);
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
      setAlreadySubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit feedback");
    } finally {
      setBusy(false);
    }
  }

  const rootClass = [
    "question-feedback",
    compact ? "question-feedback--compact" : "",
    hideToggle ? "question-feedback--report-driven" : "",
    open ? "question-feedback--open" : "question-feedback--collapsed",
    alreadySubmitted ? "question-feedback--submitted" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (authLoading || (hideToggle && !open)) {
    return null;
  }

  if (!user) {
    if (hideToggle) {
      return (
        <section className={rootClass} aria-label="Question feedback">
          <div className="question-feedback__inline-head">
            <span className="question-feedback__inline-title">Rate &amp; report</span>
            <button
              type="button"
              className="question-feedback__inline-close"
              onClick={() => setOpen(false)}
              aria-label="Close feedback form"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
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
        <p className="question-feedback__hint muted">
          <Link to={`/login?next=${encodeURIComponent(window.location.pathname)}`}>
            Sign in
          </Link>{" "}
          to rate or report this question.
        </p>
      </section>
    );
  }

  function renderInlineHead() {
    return (
      <div className="question-feedback__inline-head">
        <span className="question-feedback__inline-title">Rate &amp; report</span>
        <button
          type="button"
          className="question-feedback__inline-close"
          onClick={() => setOpen(false)}
          aria-label="Close feedback form"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    );
  }

  function renderAlreadySubmitted() {
    return (
      <div className="question-feedback__submitted" role="status">
        <p className="question-feedback__saved">
          Thanks — you already submitted feedback for this question.
        </p>
        {(score > 0 || comment.trim()) && (
          <dl className="question-feedback__submitted-summary">
            {score > 0 && (
              <div>
                <dt>Your rating</dt>
                <dd>{"★".repeat(score)}{"☆".repeat(5 - score)}</dd>
              </div>
            )}
            {category && (
              <div>
                <dt>Report type</dt>
                <dd>{categoryLabel(category)}</dd>
              </div>
            )}
            {comment.trim() && (
              <div>
                <dt>Your feedback</dt>
                <dd>{comment.trim()}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    );
  }

  const isExpandedControlled = expanded !== undefined;
  const showPanelBody = hideToggle ? open : isExpandedControlled ? open : true;

  return (
    <section className={rootClass} aria-label="Question feedback">
      {!hideToggle && !alreadySubmitted && (
        <button
          type="button"
          className="question-feedback__toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <span className="question-feedback__toggle-label">Rate &amp; report</span>
          {aggregate && aggregate.count > 0 && (
            <span className="question-feedback__aggregate muted">
              {aggregate.average.toFixed(1)} ★ · {aggregate.count}
            </span>
          )}
          <span className="material-symbols-outlined question-feedback__toggle-icon" aria-hidden>
            {open ? "expand_less" : "expand_more"}
          </span>
        </button>
      )}

      {showPanelBody && (
        <>
          {hideToggle && renderInlineHead()}
          {loading ? (
            <p className="question-feedback__hint muted">Loading…</p>
          ) : alreadySubmitted ? (
            renderAlreadySubmitted()
          ) : (
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

              <button type="submit" className="btn primary question-feedback__submit" disabled={busy}>
                {busy ? "Saving…" : "Submit feedback"}
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
