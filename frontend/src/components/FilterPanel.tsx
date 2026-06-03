import { PackSummary, YearCatalogEntry } from "../api";

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

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
}: Props) {
  function set(key: string, value: string) {
    onUpdateParam(key, value);
    if (key !== "page" && onClose) onClose();
  }

  return (
    <>
      <div className="filter-sidebar-head">
        <div className="filter-sidebar-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
          </svg>
          <span>NEET filters</span>
        </div>
        {onClose && (
          <button type="button" className="filter-drawer-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        )}
      </div>
      <p className="filter-count">
        <strong>{totalShown}</strong> questions found
      </p>

      <div className="filter-block">
        <label className="filter-label" htmlFor="filter-pack">
          Paper
        </label>
        <select
          id="filter-pack"
          value={resolvedPackId}
          onChange={(e) => onPackChange(e.target.value)}
        >
          {filteredPacks.map((p) => (
            <option key={p.packId} value={p.packId}>
              NEET {p.year} ({p.questionCount})
            </option>
          ))}
        </select>
      </div>

      <div className="filter-block">
        <span className="filter-label">Year</span>
        <div className="year-grid">
          {neetYears.map((y) => {
            const active = yearFilter === String(y.year);
            const soon = y.status === "coming_soon";
            return (
              <button
                key={y.year}
                type="button"
                className={
                  soon
                    ? "year-chip soon"
                    : active
                      ? "year-chip active"
                      : "year-chip"
                }
                disabled={soon}
                title={soon ? y.message || "Coming soon" : undefined}
                onClick={() => !soon && set("year", active ? "" : String(y.year))}
              >
                {y.year}
                {soon && <span className="chip-soon">Soon</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-block">
        <label className="filter-label" htmlFor="filter-chapter">
          Subject
        </label>
        <select id="filter-chapter" value={subject} onChange={(e) => set("subject", e.target.value)}>
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name} ({s.count})
            </option>
          ))}
        </select>
        {subject && (
          <select
            id="filter-subchapter"
            className="filter-select-second"
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
        )}
      </div>

      <div className="filter-block">
        <label className="filter-label" htmlFor="filter-topic">
          Topic
        </label>
        <select id="filter-topic" value={topic} onChange={(e) => set("topic", e.target.value)}>
          <option value="">All Topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-block">
        <span className="filter-label">Difficulty</span>
        <div className="diff-row">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              className={difficulty === d ? "diff-chip active" : "diff-chip"}
              onClick={() => set("difficulty", difficulty === d ? "" : d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {onClose && (
        <div className="filter-drawer-actions">
          <button type="button" className="btn btn-block primary" onClick={onClose}>
            Show {totalShown} questions
          </button>
        </div>
      )}
    </>
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
