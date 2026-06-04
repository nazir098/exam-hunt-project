import { Link } from "react-router-dom";
import { ProgressSummary } from "../api";
import { sessionIdleMinutes } from "../auth/session";
import { meaningfulSessions } from "../utils/dashboardStats";

type Props = {
  progress: ProgressSummary | null;
  showSessionNote?: boolean;
  /** By-year and recent session rows (for Practice page, not Analytics). */
  showDetails?: boolean;
  /** On /analytics — summary stats only, no duplicate lists. */
  summaryOnly?: boolean;
  compact?: boolean;
  className?: string;
};

export default function Scorecard({
  progress,
  showSessionNote = true,
  showDetails = true,
  summaryOnly = false,
  compact = false,
  className = "",
}: Props) {
  const totalMarks = progress?.byPack.reduce((s, p) => s + p.marks, 0) ?? 0;
  const accuracy = progress?.accuracyPercent ?? 0;
  const attempts = progress?.totalAttempts ?? 0;
  const correct = progress?.correctAttempts ?? 0;
  const sessions = meaningfulSessions(progress?.recentSessions ?? []);
  const showLists = showDetails && !summaryOnly;

  return (
    <section
      className={`scorecard glass-card ${compact ? "scorecard--compact" : ""} ${className}`}
      id="progress"
      aria-label="Your progress and scores"
    >
      <div className="scorecard__head">
        <div>
          <h2 className="scorecard__title">{summaryOnly ? "At a glance" : "Your scorecard"}</h2>
          {showSessionNote && !summaryOnly && (
            <p className="scorecard__note">
              Signed in until logout or {sessionIdleMinutes()}m idle
            </p>
          )}
          {summaryOnly && (
            <p className="scorecard__note">Totals from Practice submits only. Charts and history are below.</p>
          )}
        </div>
        {!summaryOnly && (
          <Link to="/analytics" className="scorecard__link">
            Full analytics →
          </Link>
        )}
      </div>

      <div className="scorecard__grid">
        <div className="scorecard__stat">
          <span className="scorecard__stat-value scorecard__stat-value--primary">{totalMarks}</span>
          <span className="scorecard__stat-label">total marks</span>
        </div>
        <div className="scorecard__stat">
          <span className="scorecard__stat-value scorecard__stat-value--secondary">{accuracy}%</span>
          <span className="scorecard__stat-label">accuracy</span>
        </div>
        <div className="scorecard__stat">
          <span className="scorecard__stat-value">{attempts}</span>
          <span className="scorecard__stat-label">answered</span>
        </div>
        <div className="scorecard__stat">
          <span className="scorecard__stat-value">{correct}</span>
          <span className="scorecard__stat-label">correct</span>
        </div>
      </div>

      {showLists && progress && progress.byPack.length > 0 && (
        <div className="scorecard__section">
          <p className="scorecard__section-label">By year</p>
          <ul className="scorecard__list">
            {progress.byPack.map((p) => (
              <li key={p.packId} className="scorecard__list-row">
                <strong>{p.packId.replace("NEET_", "NEET ")}</strong>
                <span>
                  {p.marks} marks · {p.correct}/{p.attempts} correct
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showLists && sessions.length > 0 && (
        <div className="scorecard__section">
          <p className="scorecard__section-label">Recent sessions</p>
          <ul className="scorecard__list">
            {sessions.slice(0, 5).map((s) => (
              <li key={s.id} className="scorecard__list-row">
                <strong>
                  {s.packId.replace("NEET_", "NEET ")} · {s.status}
                </strong>
                <span>
                  {s.totalMarks}/{s.maxMarks} marks · {s.correctCount}✓ {s.wrongCount}✗
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(progress?.totalAttempts ?? 0) === 0 && (
        <p className="scorecard__empty">
          Start a practice session — marks and accuracy will appear here.
        </p>
      )}
    </section>
  );
}
