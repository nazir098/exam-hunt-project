import { Link } from "react-router-dom";
import { QuestionPublic } from "../api";
import { difficultyLabel, examDisplayName, marksLabel } from "../utils/labels";

type Props = {
  question: QuestionPublic;
  packId: string;
};

export default function QuestionCard({ question: q }: Props) {
  const diff = difficultyLabel(q.difficulty);
  const preview =
    q.questionTextPreview ||
    `Q${q.questionNo}: ${q.chapter || q.subject}${q.topic ? ` · ${q.topic}` : ""}`;

  return (
    <article className="q-card">
      <div className="q-card-head">
        <div className="q-card-head-left">
          <span className="q-card-num">{q.questionNo}</span>
          <span className="q-card-crumb">
            {q.chapter || q.subject}
            {q.topic ? (
              <>
                <span className="q-card-dot">·</span>
                {q.topic}
              </>
            ) : null}
          </span>
        </div>
        <div className="q-card-badges">
          <span className={`badge badge-${diff.toLowerCase()}`}>{diff}</span>
          <span className="badge badge-year">{q.year}</span>
        </div>
      </div>

      <Link to={`/question/${q.questionId}`} className="q-card-preview">
        {q.questionImageUrl ? (
          <img src={q.questionImageUrl} alt="" loading="lazy" />
        ) : (
          <span className="q-card-preview-text">{preview}</span>
        )}
      </Link>

      <div className="q-card-foot">
        <span className="q-card-meta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
          </svg>
          {examDisplayName(q.exam, q.year)}
        </span>
        <span className="q-card-meta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
          </svg>
          {marksLabel(q.difficulty, q.questionNo)}
        </span>
        <Link to={`/question/${q.questionId}`} className="q-card-view">
          View
        </Link>
      </div>
    </article>
  );
}
