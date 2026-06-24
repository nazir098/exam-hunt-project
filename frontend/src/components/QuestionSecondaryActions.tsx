import BookmarkButton from "./BookmarkButton";

type Props = {
  questionId: string;
  hasSolution?: boolean;
  solutionAllowed?: boolean;
  solutionOpen?: boolean;
  onToggleSolution?: () => void;
  onReport?: () => void;
  reportTargetId?: string;
};

export default function QuestionSecondaryActions({
  questionId,
  hasSolution = false,
  solutionAllowed = true,
  solutionOpen = false,
  onToggleSolution,
  onReport,
  reportTargetId = "question-report",
}: Props) {
  function scrollToReport() {
    if (onReport) {
      onReport();
      return;
    }
    const el = document.getElementById(reportTargetId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className={`question-secondary-actions${
        hasSolution && onToggleSolution ? "" : " question-secondary-actions--duo"
      }`}
      role="toolbar"
      aria-label="Question actions"
    >
      {hasSolution && onToggleSolution && (
        <button
          type="button"
          className="question-secondary-actions__btn"
          onClick={onToggleSolution}
          aria-pressed={solutionOpen}
          disabled={!solutionAllowed}
          title={solutionAllowed ? undefined : "Check or submit your answer first"}
        >
          <span className="material-symbols-outlined" aria-hidden>
            {solutionOpen ? "menu_book" : "auto_stories"}
          </span>
          <span className="question-secondary-actions__label">Solution</span>
          <span className="question-secondary-actions__label question-secondary-actions__label--wide">
            {solutionOpen ? "Hide solution" : "View solution"}
          </span>
        </button>
      )}
      <BookmarkButton
        questionId={questionId}
        variant="compact"
        className="question-secondary-actions__btn"
      />
      <button
        type="button"
        className="question-secondary-actions__btn"
        onClick={scrollToReport}
      >
        <span className="material-symbols-outlined" aria-hidden>
          flag
        </span>
        <span className="question-secondary-actions__label">Report</span>
        <span className="question-secondary-actions__label question-secondary-actions__label--wide">
          Rate &amp; report
        </span>
      </button>
    </div>
  );
}
