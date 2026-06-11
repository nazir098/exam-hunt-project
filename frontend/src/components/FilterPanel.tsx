import type { ChapterProgress } from "../api";
import { PackSummary, YearCatalogEntry } from "../api";
import { formatPackOptionLabel } from "../utils/practiceHub";

const DIFFICULTIES = [
  { label: "Conceptual (Easy)", value: "Easy" },
  { label: "Application (Medium)", value: "Medium" },
  { label: "Critical Thinking (Hard)", value: "Hard" },
] as const;

type ChapterFacet = { subject: string; chapter: string; count: number };

type Props = {
  totalShown: number;
  examFilter: string;
  resolvedPackId: string;
  yearFilter: string;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: string;
  filteredPacks: PackSummary[];
  neetYears: YearCatalogEntry[];
  subjects: { name: string; count: number }[];
  chapters: ChapterFacet[];
  topics: string[];
  onUpdateParam: (key: string, value: string) => void;
  onPackChange: (packId: string) => void;
  onClose?: () => void;
  learningInsightText?: string;
  learningInsightHighlight?: string;
  weakChapter?: ChapterProgress | null;
  onApplyWeakChapter?: () => void;
};

export default function FilterPanel({
  totalShown,
  resolvedPackId,
  yearFilter,
  subject,
  chapter,
  topic,
  difficulty,
  filteredPacks,
  neetYears,
  subjects,
  chapters,
  topics,
  onUpdateParam,
  onPackChange,
  onClose,
  learningInsightText,
  learningInsightHighlight,
  weakChapter,
  onApplyWeakChapter,
}: Props) {
  function set(key: string, value: string) {
    onUpdateParam(key, value);
    if (key !== "page" && onClose) onClose();
  }

  return (
    <div className="space-y-gutter">
      {onClose && (
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-headline-md">Filters</span>
          <button type="button" className="material-symbols-outlined" onClick={onClose}>
            close
          </button>
        </div>
      )}

      <div className="glass-card glass-card--bank p-lg rounded-xl">
        <h3 className="text-label-md font-label-md text-primary mb-md flex items-center justify-between">
          DEEP FILTERING
          <span className="material-symbols-outlined text-[16px]">filter_list</span>
        </h3>
        <div className="space-y-md">
          <div>
            <label className="text-caption text-outline mb-2 block">Exam Category</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="bg-primary-container text-on-primary-container text-caption py-2 rounded-lg font-bold">
                NEET
              </button>
              <button type="button" className="bg-surface-container text-on-surface-variant text-caption py-2 rounded-lg" disabled>
                JEE
              </button>
            </div>
          </div>

          <div>
            <label className="text-caption text-outline mb-2 block" htmlFor="filter-pack">
              Paper
            </label>
            <select
              id="filter-pack"
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface mb-2"
              value={resolvedPackId}
              onChange={(e) => onPackChange(e.target.value)}
            >
              {filteredPacks.map((p) => (
                <option key={p.packId} value={p.packId}>
                  {formatPackOptionLabel(p)}
                </option>
              ))}
            </select>
          </div>

          {neetYears.length > 0 && (
            <div>
              <label className="text-caption text-outline mb-2 block">Year</label>
              <div className="grid grid-cols-3 gap-2">
                {neetYears.map((y) => {
                  const active = yearFilter === String(y.year);
                  return (
                    <button
                      key={y.year}
                      type="button"
                      onClick={() => set("year", active ? "" : String(y.year))}
                      className={
                        active
                          ? "text-caption py-2 rounded-lg bg-primary-container text-on-primary-container font-bold"
                          : "text-caption py-2 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }
                    >
                      {y.year}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-caption text-outline mb-2 block" htmlFor="filter-subject">
              Subject
            </label>
            <select
              id="filter-subject"
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface"
              value={subject}
              onChange={(e) => set("subject", e.target.value)}
            >
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.count})
                </option>
              ))}
            </select>
          </div>

          {subject && chapters.length > 0 && (
            <div>
              <label className="text-caption text-outline mb-2 block" htmlFor="filter-chapter">
                Chapter
              </label>
              <select
                id="filter-chapter"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface"
                value={chapter}
                onChange={(e) => set("chapter", e.target.value)}
              >
                <option value="">All chapters</option>
                {chapters.map((c) => (
                  <option key={`${c.subject}-${c.chapter}`} value={c.chapter}>
                    {c.chapter} ({c.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {topics.length > 0 && (
            <div>
              <label className="text-caption text-outline mb-2 block" htmlFor="filter-topic">
                Topic
              </label>
              <select
                id="filter-topic"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface"
                value={topic}
                onChange={(e) => set("topic", e.target.value)}
              >
                <option value="">All topics</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-caption text-outline mb-2 block">Difficulty Level</label>
            <div className="flex flex-col gap-1">
              {DIFFICULTIES.map((d) => (
                <label
                  key={d.value}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="rounded border-outline-variant bg-transparent text-primary-container focus:ring-0"
                    checked={difficulty === d.value}
                    onChange={() => set("difficulty", difficulty === d.value ? "" : d.value)}
                  />
                  <span className="text-body-sm">{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          {weakChapter && onApplyWeakChapter && (
            <div>
              <label className="text-caption text-outline mb-2 block">AI Recommended</label>
              <button
                type="button"
                className="w-full flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-primary/20 hover:border-primary/50 transition-colors text-left"
                onClick={() => {
                  onApplyWeakChapter();
                  if (onClose) onClose();
                }}
              >
                <span className="text-body-sm text-primary">
                  Target weak: {weakChapter.chapter}
                </span>
                <span className="material-symbols-outlined text-primary text-[18px]">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card glass-card--bank p-lg rounded-xl border-dashed border-primary/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-primary">psychology</span>
          <span className="text-label-md font-label-md">Learning Insights</span>
        </div>
        <p className="text-body-sm text-outline leading-relaxed">
          {learningInsightText || "Focus on your weakest chapters from practice data."}{" "}
          {learningInsightHighlight && (
            <span className="text-secondary font-bold">{learningInsightHighlight}</span>
          )}
        </p>
      </div>

      {onClose && (
        <button
          type="button"
          className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl lg:hidden"
          onClick={onClose}
        >
          Apply Filters ({totalShown})
        </button>
      )}
    </div>
  );
}

export function activeFilterCount(params: {
  exam: string;
  year: string;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: string;
}): number {
  return [params.exam, params.year, params.subject, params.chapter, params.topic, params.difficulty].filter(
    Boolean
  ).length;
}
