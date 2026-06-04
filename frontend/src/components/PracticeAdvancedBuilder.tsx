import { Link } from "react-router-dom";
import type { ExamCatalogEntry, PackSummary } from "../api";
import HintTooltip from "./HintTooltip";
import { PRACTICE_MODE_HINT } from "../navigation/modeHints";

const EXAM_OPTIONS = [
  { id: "NEET", label: "NEET", live: true },
  { id: "JEE_MAIN", label: "JEE Main", live: false },
  { id: "JEE_ADV", label: "JEE Advanced", live: false },
  { id: "UPSC", label: "UPSC", live: false },
  { id: "CAT", label: "CAT", live: false },
];

type Props = {
  exam: string;
  packId: string;
  subject: string;
  chapter: string;
  adaptive: boolean;
  packs: PackSummary[];
  catalog: ExamCatalogEntry[];
  selectedPack: PackSummary | undefined;
  busy: boolean;
  error: string;
  onExam: (id: string) => void;
  onPackId: (id: string) => void;
  onSubject: (v: string) => void;
  onChapter: (v: string) => void;
  onAdaptive: (v: boolean) => void;
  onStart: () => void;
};

export default function PracticeAdvancedBuilder({
  exam,
  packId,
  subject,
  chapter,
  adaptive,
  packs,
  catalog,
  selectedPack,
  busy,
  error,
  onExam,
  onPackId,
  onSubject,
  onChapter,
  onAdaptive,
  onStart,
}: Props) {
  const neetLive = catalog.find((c) => c.id === "NEET")?.status === "available";

  return (
    <details className="practice-advanced glass-card">
      <summary className="practice-advanced__summary">
        <span className="practice-advanced__summary-left">
          <span className="material-symbols-outlined">tune</span>
          Advanced session builder
          <HintTooltip text={PRACTICE_MODE_HINT} />
        </span>
        <span className="practice-advanced__hint">Custom exam, pack &amp; filters</span>
      </summary>
      <div className="practice-advanced__body">
        <p className="practice-advanced__intro muted">
          Fine-tune when quick starts are not enough. Same 20-question scored session (+4/−1).
        </p>

        <div className="practice-advanced__field">
          <span className="practice-advanced__label">Exam</span>
          <div className="practice-exam-row">
            {EXAM_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={
                  exam === opt.id
                    ? opt.live && neetLive
                      ? "exam-pill active"
                      : "exam-pill active coming-soon-pill"
                    : "exam-pill"
                }
                disabled={!opt.live}
                onClick={() => opt.live && onExam(opt.id)}
              >
                {opt.label}
                {!opt.live && <span className="pill-soon">Soon</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="practice-advanced__field">
          <label className="practice-advanced__label" htmlFor="practice-pack">
            Year / pack
          </label>
          <select id="practice-pack" value={packId} onChange={(e) => onPackId(e.target.value)}>
            {packs.map((p) => (
              <option key={p.packId} value={p.packId}>
                NEET {p.year} ({p.questionCount} questions)
              </option>
            ))}
          </select>
        </div>

        {selectedPack?.facets?.subjects && (
          <div className="practice-advanced__field">
            <label className="practice-advanced__label" htmlFor="practice-subject">
              Subject (optional)
            </label>
            <select
              id="practice-subject"
              value={subject}
              onChange={(e) => onSubject(e.target.value)}
            >
              <option value="">All subjects</option>
              {selectedPack.facets.subjects.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.count})
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedPack?.facets?.chapters && subject && (
          <div className="practice-advanced__field">
            <label className="practice-advanced__label" htmlFor="practice-chapter">
              Chapter (optional)
            </label>
            <select
              id="practice-chapter"
              value={chapter}
              onChange={(e) => onChapter(e.target.value)}
            >
              <option value="">All chapters</option>
              {selectedPack.facets.chapters
                .filter((c) => c.subject === subject)
                .map((c) => (
                  <option key={`${c.subject}-${c.chapter}`} value={c.chapter}>
                    {c.chapter} ({c.count})
                  </option>
                ))}
            </select>
          </div>
        )}

        <label className="practice-adaptive-toggle practice-advanced__toggle">
          <input type="checkbox" checked={adaptive} onChange={(e) => onAdaptive(e.target.checked)} />
          Adaptive difficulty
        </label>

        {error && <p className="error-text">{error}</p>}

        <button
          type="button"
          className="btn btn-block practice-advanced__start"
          onClick={onStart}
          disabled={busy || !packId}
        >
          {busy ? "Starting…" : "Build & start session"}
        </button>
        <p className="muted practice-note">
          <Link to="/bank?exam=NEET">Browse PYQs</Link> instead of custom filters
        </p>
      </div>
    </details>
  );
}
