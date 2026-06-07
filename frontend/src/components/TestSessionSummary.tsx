import type { PackSummary } from "../api";

type Props = {
  selectedPack: PackSummary | undefined;
  subject: string;
  chapter: string;
  difficulty: string;
  sessionSize: number;
  estMinutes: number;
};

const DIFFICULTY_LABELS: Record<string, string> = {
  "": "Mixed difficulty",
  easy: "Easy focus",
  medium: "Medium focus",
  hard: "Hard focus",
};

export default function TestSessionSummary({
  selectedPack,
  subject,
  chapter,
  difficulty,
  sessionSize,
  estMinutes,
}: Props) {
  const scopeLabel = chapter
    ? chapter
    : subject
      ? `${subject} only`
      : selectedPack
        ? `Full NEET ${selectedPack.year} pool`
        : "NEET question pool";

  const chips = [
    `${sessionSize} questions`,
    `~${estMinutes} min`,
    DIFFICULTY_LABELS[difficulty] ?? "Mixed difficulty",
    "Answers locked until submit",
  ];

  return (
    <aside className="practice-recommended glass-card test-summary" aria-label="Test expectations">
      <div className="practice-recommended__inner">
        <header className="practice-recommended__head">
          <p className="practice-recommended__eyebrow">
            <span className="material-symbols-outlined">fact_check</span>
            What to expect
          </p>
        </header>

        <div className="practice-recommended__reason">
          <span className="practice-recommended__reason-label">Test scope</span>
          <h2 className="practice-recommended__title">{scopeLabel}</h2>
        </div>

        <ul className="practice-recommended__preview">
          {chips.map((chip) => (
            <li key={chip}>{chip}</li>
          ))}
        </ul>

        <div className="test-summary__rules">
          <div className="test-summary__rule">
            <span className="material-symbols-outlined">timer</span>
            <div>
              <strong>Timed simulation</strong>
              <p>No instant feedback while the test is active.</p>
            </div>
          </div>
          <div className="test-summary__rule">
            <span className="material-symbols-outlined">lock</span>
            <div>
              <strong>Score unlocks on submit</strong>
              <p>Correctness, solutions, and AI help appear after you finish.</p>
            </div>
          </div>
          <div className="test-summary__rule">
            <span className="material-symbols-outlined">insights</span>
            <div>
              <strong>Feeds analytics</strong>
              <p>Weak areas update from this test — not the leaderboard.</p>
            </div>
          </div>
        </div>

        <p className="test-summary__score-hint">
          Scoring: <strong>+4</strong> correct · <strong>−1</strong> wrong
        </p>
      </div>
    </aside>
  );
}
