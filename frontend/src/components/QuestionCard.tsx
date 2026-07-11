import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { QuestionPublic } from "../api";
import { MODES } from "../navigation/modes";
import { difficultyLabel, examDisplayName, marksLabel } from "../utils/labels";
import BookmarkButton from "./BookmarkButton";
import QuestionStemPreview from "./QuestionStemPreview";

type Props = {
  question: QuestionPublic;
  packId: string;
  bookmarkSaved?: boolean;
  onBookmarkChange?: (saved: boolean) => void;
  bookmarkBatchStatus?: boolean;
};

type OutletCtx = {
  startPracticeFromBank?: (questionId?: string, packId?: string) => void;
  practiceBusy?: boolean;
};

export default function QuestionCard({
  question: q,
  packId,
  bookmarkSaved,
  onBookmarkChange,
  bookmarkBatchStatus,
}: Props) {
  const [searchParams] = useSearchParams();
  const outlet = useOutletContext<OutletCtx | undefined>();
  const diff = difficultyLabel(q.difficulty);
  const solveHref = `/solve/${q.questionId}?${new URLSearchParams(searchParams).toString()}`;
  const fallbackTitle = `Question ${q.questionNo} — ${q.chapter || q.subject}`;

  return (
    <article className="glass-card glass-card--bank question-card--compact p-md rounded-xl relative group overflow-hidden">
      <h2 className="question-card__title">
        <QuestionStemPreview text={q.questionTextPreview} fallback={fallbackTitle} />
      </h2>
      <p className="question-card__meta muted">
        {q.subject} · {q.chapter || q.topic || "General"} · {diff} · {marksLabel(q.difficulty, q.questionNo)} ·{" "}
        {examDisplayName(q.exam, q.year)} {q.year}
      </p>
      <div className="question-card__actions">
        <BookmarkButton
          questionId={q.questionId}
          variant="icon"
          className="question-card__bookmark"
          saved={bookmarkSaved}
          onSavedChange={onBookmarkChange}
          batchStatus={bookmarkBatchStatus}
        />
        <Link to={solveHref} className="bank-mode-btn bank-mode-btn--solve" title={MODES.solve.tooltip}>
          {MODES.solve.button}
        </Link>
        {outlet?.startPracticeFromBank && (
          <button
            type="button"
            className="bank-mode-btn bank-mode-btn--practice-secondary"
            disabled={outlet.practiceBusy}
            title={MODES.practice.tooltip}
            onClick={() => outlet.startPracticeFromBank?.(q.questionId, packId)}
          >
            {MODES.practice.button}
          </button>
        )}
      </div>
    </article>
  );
}
