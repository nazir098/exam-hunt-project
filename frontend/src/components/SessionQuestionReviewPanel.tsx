import { useEffect, useState } from "react";
import { fetchPracticeQuestion, type PracticeQuestion, type SessionQuestionReview } from "../api";
import PracticeStudyAssistant from "./PracticeStudyAssistant";
import ReviewSolutionSection from "./ReviewSolutionSection";

type Props = {
  review: SessionQuestionReview;
  onClose: () => void;
};

export default function SessionQuestionReviewPanel({ review, onClose }: Props) {
  const [showSolution, setShowSolution] = useState(false);
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);

  useEffect(() => {
    setShowSolution(false);
    fetchPracticeQuestion(review.questionId)
      .then(setQuestion)
      .catch(() => setQuestion(null));
  }, [review.questionId]);
  const statusLabel =
    review.status === "correct"
      ? "Correct"
      : review.status === "wrong"
        ? "Wrong"
        : review.status === "skipped"
          ? "Skipped"
          : "Not attempted";

  return (
    <div className="session-review-overlay" role="dialog" aria-modal="true" aria-label={`Review Q${review.number}`}>
      <div className="session-review-panel glass-card">
        <header className="session-review-panel__head">
          <div>
            <h2 className="session-review-panel__title">
              Q{review.number} · Question {review.questionNo}
            </h2>
            <p className="session-review-panel__meta">
              {review.subject} · {review.chapter}
            </p>
          </div>
          <button type="button" className="session-review-panel__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <span className={`session-review-panel__status session-review-panel__status--${review.status}`}>
          {statusLabel}
        </span>

        {(review.status === "wrong" || review.status === "correct") && (
          <dl className="session-review-panel__facts">
            {review.status === "wrong" && (
              <div>
                <dt>Your answer</dt>
                <dd>{review.selectedAnswer}</dd>
              </div>
            )}
            <div>
              <dt>Correct answer</dt>
              <dd>{review.correctAnswer}</dd>
            </div>
          </dl>
        )}

        {question && (
          <ReviewSolutionSection
            question={question}
            hasSolution={review.hasSolution}
            showSolution={showSolution}
            onToggle={() => setShowSolution((v) => !v)}
          />
        )}

        {(review.status === "wrong" || review.status === "correct") && (
          <PracticeStudyAssistant
            questionId={review.questionId}
            selectedAnswer={review.selectedAnswer}
            submitted
            correct={review.status === "correct"}
            prominent
            hasSolution={review.hasSolution}
            layout="inline"
          />
        )}
      </div>
    </div>
  );
}
