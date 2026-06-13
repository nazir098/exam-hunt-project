import type { SessionQuestionReview } from "../api";
import { optionLabel } from "../utils/testReview";

type Props = {
  review: SessionQuestionReview;
};

export default function TestReviewAnswerCompare({ review }: Props) {
  const showYours =
    (review.status === "wrong" || review.status === "correct") && !!review.selectedAnswer;
  const showCorrect = !!review.correctAnswer;

  if (!showYours && !showCorrect) return null;

  const yoursCorrect = review.status === "correct";
  const yoursWrong = review.status === "wrong";

  return (
    <div
      className={`test-review-answers${showYours && showCorrect ? " test-review-answers--pair" : " test-review-answers--single"}`}
      aria-label="Answer comparison"
    >
      {showYours && (
        <div
          className={`test-review-answers__card test-review-answers__card--yours${
            yoursCorrect ? " is-correct" : yoursWrong ? " is-wrong" : ""
          }`}
        >
          <span className="test-review-answers__label">
            <span className="material-symbols-outlined" aria-hidden>
              {yoursCorrect ? "check_circle" : "cancel"}
            </span>
            Your answer
          </span>
          <span className="test-review-answers__value">{optionLabel(review.selectedAnswer)}</span>
        </div>
      )}

      {showCorrect && (
        <div className="test-review-answers__card test-review-answers__card--correct">
          <span className="test-review-answers__label">
            <span className="material-symbols-outlined" aria-hidden>
              verified
            </span>
            Correct answer
          </span>
          <span className="test-review-answers__value">{optionLabel(review.correctAnswer)}</span>
        </div>
      )}
    </div>
  );
}
