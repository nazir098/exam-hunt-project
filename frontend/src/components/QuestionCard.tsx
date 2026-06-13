import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { QuestionPublic } from "../api";
import { MODES } from "../navigation/modes";
import { difficultyLabel, examDisplayName, marksLabel } from "../utils/labels";
import { subjectIcon } from "../utils/subjectIcon";
import BookmarkButton from "./BookmarkButton";

type Props = {
  question: QuestionPublic;
  packId: string;
};

type OutletCtx = {
  startPracticeFromBank?: (questionId?: string, packId?: string) => void;
  practiceBusy?: boolean;
};

function testCreateHref(packId: string, subject: string, searchParams: URLSearchParams): string {
  const next = new URLSearchParams();
  next.set("packId", packId);
  if (subject) next.set("subject", subject);
  const chapter = searchParams.get("chapter");
  if (chapter) next.set("chapter", chapter);
  return `/test/create?${next.toString()}`;
}

export default function QuestionCard({ question: q, packId }: Props) {
  const [searchParams] = useSearchParams();
  const outlet = useOutletContext<OutletCtx | undefined>();
  const diff = difficultyLabel(q.difficulty);
  const isJee = q.exam?.toUpperCase().includes("JEE");
  const solveHref = `/solve/${q.questionId}?${new URLSearchParams(searchParams).toString()}`;
  const title =
    q.questionTextPreview?.slice(0, 200) ||
    `Question ${q.questionNo} — ${q.chapter || q.subject}`;

  const badgeClass = isJee
    ? "text-caption px-3 py-1 bg-secondary-container/20 text-secondary border border-secondary/30 rounded-full font-bold"
    : "text-caption px-3 py-1 bg-primary-container/20 text-primary border border-primary/30 rounded-full font-bold";

  return (
    <div className="glass-card glass-card--bank p-lg rounded-xl relative group overflow-hidden">
      <div className="flex items-start justify-between gap-3 mb-sm">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
            <span className={`material-symbols-outlined ${isJee ? "text-secondary" : "text-primary"}`}>
              {subjectIcon(q.subject)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-label-md text-secondary">{q.subject}</span>
              <span className="text-outline text-[12px]">•</span>
              <span className="text-label-md text-on-surface-variant line-clamp-2">
                {q.chapter || q.topic || "General"}
              </span>
            </div>
          </div>
        </div>
        <span className={`${badgeClass} shrink-0 self-start`}>
          {examDisplayName(q.exam, q.year)} {q.year}
        </span>
      </div>
      <h2 className="text-body-lg font-semibold leading-snug mb-md">{title}</h2>
      <div className="flex flex-wrap gap-4 items-center justify-between mt-xl pt-md border-t border-white/5">
        <div className="flex gap-2">
          <span className="flex items-center gap-1 text-caption text-outline">
            <span className="material-symbols-outlined text-[14px]">bar_chart</span>
            {diff}
          </span>
          <span className="flex items-center gap-1 text-caption text-outline">
            <span className="material-symbols-outlined text-[14px]">query_stats</span>
            {marksLabel(q.difficulty, q.questionNo)}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end items-center">
          <BookmarkButton questionId={q.questionId} variant="icon" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors p-2" />
          <Link
            to={solveHref}
            className="bank-mode-btn bank-mode-btn--solve"
            title={MODES.solve.tooltip}
          >
            {MODES.solve.button}
          </Link>
          {outlet?.startPracticeFromBank && (
            <button
              type="button"
              className="bank-mode-btn bank-mode-btn--practice"
              disabled={outlet.practiceBusy}
              title={MODES.practice.tooltip}
              onClick={() => outlet.startPracticeFromBank?.(q.questionId, packId)}
            >
              {MODES.practice.button}
            </button>
          )}
          <Link
            to={testCreateHref(packId, q.subject, searchParams)}
            className="bank-mode-btn bank-mode-btn--test"
            title={MODES.test.tooltip}
          >
            Prepare Test
          </Link>
        </div>
      </div>
    </div>
  );
}
