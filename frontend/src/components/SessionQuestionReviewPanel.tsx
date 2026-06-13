import { useState } from "react";
import type { SessionQuestionReview } from "../api";
import PracticeStudyAssistant from "./PracticeStudyAssistant";

type Props = {
  review: SessionQuestionReview;
  onClose: () => void;
};

function imageSrc(url: string, questionId: string) {
  if (!url) return "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(questionId)}`;
}

export default function SessionQuestionReviewPanel({ review, onClose }: Props) {
  const [showSolution, setShowSolution] = useState(false);
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

        {review.hasSolution && review.solutionImageUrl && (
          <div className="session-review-panel__solution">
            <button
              type="button"
              className="practice-run-solution__toggle"
              onClick={() => setShowSolution((v) => !v)}
            >
              {showSolution ? "Hide explanation" : "View explanation"}
            </button>
            {showSolution && (
              <img
                src={imageSrc(review.solutionImageUrl, review.questionId)}
                alt="Solution"
                draggable={false}
              />
            )}
          </div>
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
