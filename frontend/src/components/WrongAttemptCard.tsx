import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { WrongAttemptView } from "../api";
import { examDisplayName } from "../utils/labels";
import {
  attemptedAgoLabel,
  difficultyLabel,
  mistakeTypeLabel,
  revisionDueLabel,
} from "../utils/wrongAttemptsUi";

type Props = {
  item: WrongAttemptView;
  busy?: boolean;
  onToggleRevised: (item: WrongAttemptView) => void;
};

export default function WrongAttemptCard({ item, busy, onToggleRevised }: Props) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const due = revisionDueLabel(item);
  const mistakeType = mistakeTypeLabel(item);

  return (
    <article className="wrong-v2-card glass-card">
      <div className="wrong-v2-card__row">
        <div className="wrong-v2-card__left">
          <span className="wrong-v2-card__status" aria-hidden>
            <span className="material-symbols-outlined">close</span>
          </span>
          <div className="wrong-v2-card__info">
            <h3 className="wrong-v2-card__title">
              {examDisplayName(item.exam, item.year)} {item.year} · Q{item.questionNo}
            </h3>
            <p className="wrong-v2-card__crumb">
              {item.subject} <span aria-hidden>›</span> {item.chapter}
            </p>
            <div className="wrong-v2-card__tags">
              <span className={`wrong-v2-tag wrong-v2-tag--mode wrong-v2-tag--${item.mode}`}>
                {item.mode === "test" ? "Test" : "Practice"}
              </span>
              <span className="wrong-v2-tag wrong-v2-tag--diff">{difficultyLabel(item)}</span>
              <span className="wrong-v2-card__time">{attemptedAgoLabel(item)}</span>
            </div>
          </div>
        </div>

        <div className="wrong-v2-card__answers">
          <div className="wrong-v2-answer wrong-v2-answer--wrong">
            <span className="wrong-v2-answer__label">Your Answer</span>
            <strong>{item.selectedAnswer}</strong>
          </div>
          <div className="wrong-v2-answer wrong-v2-answer--correct">
            <span className="wrong-v2-answer__label">Correct Answer</span>
            <strong>{item.correctAnswer}</strong>
          </div>
        </div>

        <div className="wrong-v2-card__meta">
          <div className="wrong-v2-meta-block">
            <span className="wrong-v2-meta-block__label">Mistake Type</span>
            <span className="wrong-v2-pill wrong-v2-pill--mistake">{mistakeType}</span>
          </div>
          <div className="wrong-v2-meta-block">
            <span className="wrong-v2-meta-block__label">Revision Due</span>
            <span className={`wrong-v2-due wrong-v2-due--${due.tone}`}>{due.label}</span>
          </div>
        </div>

        <div className="wrong-v2-card__actions">
          <Link to={`/solve/${item.questionId}`} className="btn primary wrong-v2-card__cta">
            Retry
          </Link>
          <div className="wrong-v2-card__links">
            <Link
              to={`/practice?exam=NEET&subject=${encodeURIComponent(item.subject)}&chapter=${encodeURIComponent(item.chapter)}#question-bank`}
              className="wrong-v2-link"
            >
              <span className="material-symbols-outlined" aria-hidden>
                description
              </span>
              Similar PYQs
            </Link>
          </div>
        </div>

        <div className="wrong-v2-card__menu-wrap">
          <button
            type="button"
            className="wrong-v2-menu-btn"
            aria-label="More actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
          {menuOpen && (
            <div className="wrong-v2-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => {
                  setMenuOpen(false);
                  onToggleRevised(item);
                }}
              >
                {item.revised ? "Mark as pending" : "Mark as revised"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/solve/${item.questionId}`);
                }}
              >
                Retry question
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
