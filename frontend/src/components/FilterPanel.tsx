import { PackSummary, YearCatalogEntry } from "../api";
import { formatPackOptionLabel } from "../utils/practiceHub";
import QuestionCountStepper from "./QuestionCountStepper";

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
  activePackYear?: number;
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
  questionCount?: number;
  poolMax?: number;
  onQuestionCount?: (value: number) => void;
  adaptive?: boolean;
  onAdaptiveChange?: (value: boolean) => void;
};

function pillClass(active: boolean): string {
  return `practice-filter-pill${active ? " practice-filter-pill--active" : ""}`;
}

function selectClass(hasValue: boolean): string {
  return `practice-filter-select w-full rounded-lg px-3 py-2 text-body-sm text-on-surface${hasValue ? " practice-filter-select--active" : ""}`;
}

export default function FilterPanel({
  totalShown,
  resolvedPackId,
  activePackYear,
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
  questionCount,
  poolMax = 180,
  onQuestionCount,
  adaptive = true,
  onAdaptiveChange,
}: Props) {
  function set(key: string, value: string) {
    onUpdateParam(key, value);
    if (key !== "page" && onClose) onClose();
  }

  const selectedYear = yearFilter || (activePackYear != null ? String(activePackYear) : "");

  return (
    <div className="practice-filter-panel space-y-gutter">
      {onClose && (
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-headline-md">Filters &amp; session</span>
          <button type="button" className="material-symbols-outlined" onClick={onClose}>
            close
          </button>
        </div>
      )}

      <div className="glass-card glass-card--bank p-lg rounded-xl">
        <h3 className="text-label-md font-label-md text-primary mb-md flex items-center justify-between">
          Filters
          <span className="material-symbols-outlined text-[16px]">filter_list</span>
        </h3>
        <div className="space-y-md">
          <div>
            <label className="text-caption text-outline mb-2 block">Exam</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" className={pillClass(true)}>
                NEET
              </button>
              <button type="button" className={pillClass(false)} disabled>
                JEE
              </button>
            </div>
            {neetYears.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {neetYears.map((y) => {
                  const active = selectedYear === String(y.year);
                  return (
                    <button
                      key={y.year}
                      type="button"
                      onClick={() => set("year", active && yearFilter ? "" : String(y.year))}
                      className={pillClass(active)}
                    >
                      {y.year}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-caption text-outline mb-2 block" htmlFor="filter-pack">
              Paper
            </label>
            <select
              id="filter-pack"
              className={selectClass(Boolean(resolvedPackId))}
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

          <div>
            <label className="text-caption text-outline mb-2 block" htmlFor="filter-subject">
              Subject
            </label>
            <select
              id="filter-subject"
              className={selectClass(Boolean(subject))}
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
                className={selectClass(Boolean(chapter))}
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
                className={selectClass(Boolean(topic))}
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
            <label className="text-caption text-outline mb-2 block">Difficulty</label>
            <div className="flex flex-col gap-1">
              {DIFFICULTIES.map((d) => {
                const selected = difficulty === d.value;
                return (
                  <label
                    key={d.value}
                    className={`practice-filter-difficulty flex items-center gap-3 p-2 rounded-lg cursor-pointer${selected ? " practice-filter-difficulty--selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-outline-variant bg-transparent text-primary-container focus:ring-0"
                      checked={selected}
                      onChange={() => set("difficulty", selected ? "" : d.value)}
                    />
                    <span className="text-body-sm">{d.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card glass-card--bank p-lg rounded-xl">
        <h3 className="text-label-md font-label-md text-primary mb-md">Session settings</h3>
        <div className="space-y-md">
          {onQuestionCount != null && questionCount != null && (
            <QuestionCountStepper value={questionCount} poolMax={poolMax} onChange={onQuestionCount} />
          )}
          {onAdaptiveChange && (
            <label
              className={`practice-filter-adaptive flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer${adaptive ? " practice-filter-adaptive--selected" : ""}`}
            >
              <span>
                <span className="text-body-sm block">Adaptive order</span>
                <span className="text-caption text-outline">Prioritize weaker topics</span>
              </span>
              <input
                type="checkbox"
                className="rounded border-outline-variant bg-transparent text-primary-container focus:ring-0"
                checked={adaptive}
                onChange={(e) => onAdaptiveChange(e.target.checked)}
              />
            </label>
          )}
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl lg:hidden"
          onClick={onClose}
        >
          Apply filters ({totalShown})
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
