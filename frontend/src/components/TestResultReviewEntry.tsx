import { Link } from "react-router-dom";
import type { SessionQuestionReview } from "../api";
import { testReviewRoute } from "../navigation/modes";
import {
  reviewFilterCount,
  TEST_REVIEW_FILTERS,
  type TestReviewFilter,
} from "../utils/testReview";
import TestResultRetakeActions from "./TestResultRetakeActions";

type Props = {
  sessionId: string;
  reviews: SessionQuestionReview[];
};

const QUICK_FILTERS: TestReviewFilter[] = ["wrong", "correct", "skipped", "unanswered"];

export default function TestResultReviewEntry({ sessionId, reviews }: Props) {
  const wrongCount = reviewFilterCount(reviews, "wrong");
  const primaryFilter: TestReviewFilter = wrongCount > 0 ? "wrong" : "all";

  return (
    <section className="glass-card test-result-review-entry" aria-label="Review questions">
      <header className="test-result-review-entry__head">
        <span className="material-symbols-outlined">menu_book</span>
        <div>
          <h2 className="session-result-section__title">Review your test</h2>
          <p className="muted test-result-review-entry__sub">
            See each question, your answer, the solution, and AI explanations.
          </p>
        </div>
      </header>

      <Link
        to={testReviewRoute(sessionId, primaryFilter)}
        className="btn primary btn-block test-result-review-entry__cta"
      >
        {wrongCount > 0 ? `Review ${wrongCount} mistake${wrongCount === 1 ? "" : "s"}` : "Review all questions"}
        <span className="material-symbols-outlined">arrow_forward</span>
      </Link>

      <div className="test-result-review-entry__filters" role="list" aria-label="Review by category">
        {QUICK_FILTERS.map((filter) => {
          const count = reviewFilterCount(reviews, filter);
          const meta = TEST_REVIEW_FILTERS.find((f) => f.id === filter)!;
          return (
            <Link
              key={filter}
              to={testReviewRoute(sessionId, filter)}
              className={`test-result-review-entry__pill test-result-review-entry__pill--${filter}${count === 0 ? " is-empty" : ""}`}
              role="listitem"
            >
              <strong>{meta.label}</strong>
              <span>{count}</span>
            </Link>
          );
        })}
        <Link
          to={testReviewRoute(sessionId, "all")}
          className="test-result-review-entry__pill test-result-review-entry__pill--all"
          role="listitem"
        >
          <strong>All</strong>
          <span>{reviews.length}</span>
        </Link>
      </div>

      <TestResultRetakeActions sessionId={sessionId} reviews={reviews} className="test-result-review-entry__retake" />
    </section>
  );
}
