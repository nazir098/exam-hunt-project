import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRetakeTestSession, type RetakeTestFilter } from "../api";
import { sessionRoute } from "../navigation/modes";
import { reviewFilterCount, type TestReviewFilter } from "../utils/testReview";
import type { SessionQuestionReview } from "../api";

type Props = {
  sessionId: string;
  reviews: SessionQuestionReview[];
  /** Show only one retake action (e.g. on review page for active filter). */
  singleFilter?: RetakeTestFilter;
  className?: string;
};

type RetakeOption = {
  filter: RetakeTestFilter;
  label: string;
  hint: string;
  countKey: TestReviewFilter | "mistakes";
};

const RETAKE_OPTIONS: RetakeOption[] = [
  {
    filter: "wrong",
    label: "Retake wrong",
    hint: "Same mistakes only — timed test, no solutions until submit.",
    countKey: "wrong",
  },
  {
    filter: "skipped",
    label: "Retake skipped",
    hint: "Questions you skipped during the test.",
    countKey: "skipped",
  },
  {
    filter: "unanswered",
    label: "Retake unanswered",
    hint: "Left blank when you submitted the test.",
    countKey: "unanswered",
  },
];

function optionCount(reviews: SessionQuestionReview[], option: RetakeOption): number {
  if (option.countKey === "mistakes") {
    return (
      reviewFilterCount(reviews, "wrong") +
      reviewFilterCount(reviews, "skipped") +
      reviewFilterCount(reviews, "unanswered")
    );
  }
  return reviewFilterCount(reviews, option.countKey);
}

export default function TestResultRetakeActions({
  sessionId,
  reviews,
  singleFilter,
  className = "",
}: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<RetakeTestFilter | null>(null);
  const [error, setError] = useState("");

  const options = singleFilter
    ? RETAKE_OPTIONS.filter((o) => o.filter === singleFilter)
    : RETAKE_OPTIONS;

  const visible = options.filter((o) => optionCount(reviews, o) > 0);
  if (visible.length === 0) {
    return null;
  }

  async function startRetake(filter: RetakeTestFilter) {
    setBusy(filter);
    setError("");
    try {
      const session = await createRetakeTestSession(sessionId, filter);
      const qId = session.currentQuestionId;
      if (!qId) throw new Error("Retake test has no questions.");
      navigate(sessionRoute("test", session.id, qId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start retake test");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`test-result-retake${className ? ` ${className}` : ""}`}>
      {!singleFilter && (
        <header className="test-result-retake__head">
          <span className="material-symbols-outlined">replay</span>
          <div>
            <h3 className="test-result-retake__title">Retake as test</h3>
            <p className="muted test-result-retake__sub">
              Run a new timed test with only the questions you missed or skipped.
            </p>
          </div>
        </header>
      )}

      <div className={`test-result-retake__actions${singleFilter ? " test-result-retake__actions--single" : ""}`}>
        {visible.map((option) => {
          const count = optionCount(reviews, option);
          return (
            <button
              key={option.filter}
              type="button"
              className={`test-result-retake__btn test-result-retake__btn--${option.filter}`}
              disabled={busy !== null}
              onClick={() => void startRetake(option.filter)}
            >
              <span className="material-symbols-outlined">timer</span>
              <span className="test-result-retake__btn-copy">
                <strong>
                  {singleFilter
                    ? `Retake ${count} question${count === 1 ? "" : "s"} as test`
                    : `${option.label} (${count})`}
                </strong>
                {!singleFilter && <span>{option.hint}</span>}
              </span>
              {busy === option.filter ? (
                <span className="test-result-retake__spinner muted">Starting…</span>
              ) : (
                <span className="material-symbols-outlined test-result-retake__arrow">chevron_right</span>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="error-text test-result-retake__error">{error}</p>}
    </div>
  );
}
