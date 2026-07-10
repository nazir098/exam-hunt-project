import { Link } from "react-router-dom";

type Props = {
  questionId: string;
  compact?: boolean;
};

/** Admin shortcut from student solution view → Fix question / Solution tab. */
export default function AdminSolutionEditLink({ questionId, compact = false }: Props) {
  return (
    <Link
      to={`/admin/questions/${encodeURIComponent(questionId)}?section=solution`}
      className="variant-question-card__edit solve-page__solution-edit"
      title="Edit solution (admin)"
    >
      <span className="material-symbols-outlined" aria-hidden>
        edit_square
      </span>
      {!compact ? <span className="variant-question-card__edit-label">Edit solution</span> : null}
    </Link>
  );
}
