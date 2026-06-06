import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { QuestionPublic } from "../api";
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

export default function QuestionCard({ question: q, packId }: Props) {
  const [searchParams] = useSearchParams();
  const outlet = useOutletContext<OutletCtx | undefined>();
  const diff = difficultyLabel(q.difficulty);
  const isJee = q.exam?.toUpperCase().includes("JEE");
  const practiceQs = (() => {
    const next = new URLSearchParams(searchParams);
    next.set("fromPack", packId);
    const s = next.toString();
    return s ? `?${s}` : "";
  })();
  const questionHref = `/question/${q.questionId}${practiceQs}`;
  const title =
    q.questionTextPreview?.slice(0, 200) ||
    `Question ${q.questionNo} — ${q.chapter || q.subject}`;

  const badgeClass = isJee
    ? "text-caption px-3 py-1 bg-secondary-container/20 text-secondary border border-secondary/30 rounded-full font-bold"
    : "text-caption px-3 py-1 bg-primary-container/20 text-primary border border-primary/30 rounded-full font-bold";

  return (
    <div className="glass-card glass-card--bank p-lg rounded-xl relative group overflow-hidden">
      <div className="absolute top-0 right-0 p-4">
        <span className={badgeClass}>
          {examDisplayName(q.exam, q.year)} {q.year}
        </span>
      </div>
      <div className="flex items-start gap-4 mb-md">
        <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
          <span className={`material-symbols-outlined ${isJee ? "text-secondary" : "text-primary"}`}>
            {subjectIcon(q.subject)}
          </span>
        </div>
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-label-md text-secondary">{q.subject}</span>
            <span className="text-outline text-[12px]">•</span>
            <span className="text-label-md text-on-surface-variant">{q.chapter || q.topic || "General"}</span>
          </div>
          <h2 className="text-body-lg font-semibold leading-snug pr-20">{title}</h2>
        </div>
      </div>
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
        <div className="flex gap-3 flex-wrap justify-end">
          <BookmarkButton questionId={q.questionId} variant="icon" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors p-2" />
          {outlet?.startPracticeFromBank && (
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 text-primary"
              disabled={outlet.practiceBusy}
              onClick={() => outlet.startPracticeFromBank?.(q.questionId, packId)}
            >
              Practice
            </button>
          )}
          <Link
            to={questionHref}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-br from-[#8A2BE2] to-[#4B0082] rounded-lg text-white font-bold ai-glow hover:scale-[1.02] active:scale-95 transition-all"
          >
            <span className="text-label-md">Solve</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
