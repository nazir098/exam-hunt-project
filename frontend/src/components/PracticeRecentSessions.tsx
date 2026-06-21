import { Link } from "react-router-dom";
import type { PracticeSessionView } from "../api";
import { sessionResultRoute } from "../navigation/modes";
import { sessionAccuracy } from "../utils/dashboardStats";
import { formatPackLabel, sessionResumeUrl } from "../utils/practiceHub";

type Props = {
  sessions: PracticeSessionView[];
  busy?: boolean;
  guestPreview?: boolean;
  onPracticeAgain?: (packId: string) => void;
};

function sessionScope(s: PracticeSessionView): string {
  if (s.filterChapter) return s.filterChapter;
  if (s.filterSubject) return s.filterSubject;
  return "Full paper";
}

function sessionTitle(s: PracticeSessionView): string {
  const acc = sessionAccuracy(s);
  const label = formatPackLabel(s.packId);
  if (s.mode === "test") return `${label} Full test (${acc}%)`;
  if (s.filterSubject && !s.filterChapter) return `${label} ${s.filterSubject} focus (${acc}%)`;
  if (s.filterChapter) return `${label} ${s.filterChapter} (${acc}%)`;
  return `${label} Practice (${acc}%)`;
}

function statusIcon(status: string): { icon: string; className: string; label: string } {
  if (status === "ACTIVE") {
    return { icon: "radio_button_checked", className: "practice-recent-table__status--active", label: "In progress" };
  }
  if (status === "completed") {
    return { icon: "check_circle", className: "practice-recent-table__status--done", label: "Completed" };
  }
  return { icon: "cancel", className: "practice-recent-table__status--other", label: status };
}

function formatSessionDate(s: PracticeSessionView): string {
  const raw = s.completedAt || s.startedAt;
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function answeredCount(s: PracticeSessionView): number {
  return s.correctCount + s.wrongCount;
}

function scoreLabel(s: PracticeSessionView): string {
  const delta = s.totalMarks - Math.round(s.maxMarks / 2);
  if (delta >= 0) return `+${delta}`;
  return String(delta);
}

export default function PracticeRecentSessions({ sessions, busy, guestPreview, onPracticeAgain }: Props) {
  const recent = sessions.slice(0, 5);
  if (recent.length === 0) return null;

  const authUrl = guestPreview ? "/register?next=%2Fpractice" : null;

  return (
    <section className="practice-recent practice-recent--table" aria-label="Recent sessions">
      <div className="practice-recent__head-row">
        <h2 className="practice-section-title">Recent sessions</h2>
        {guestPreview ? (
          <span className="practice-recent__preview-pill">Sample data</span>
        ) : (
          <Link to="/analytics" className="practice-recent__link">
            View all history
          </Link>
        )}
      </div>

      <div className="practice-recent-table-wrap glass-card">
        <table className="practice-recent-table">
          <thead>
            <tr>
              <th scope="col">Session</th>
              <th scope="col">Scope</th>
              <th scope="col">Questions</th>
              <th scope="col">Accuracy</th>
              <th scope="col">Score</th>
              <th scope="col">Date</th>
              <th scope="col">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {recent.map((s) => {
              const resumeUrl = sessionResumeUrl(s);
              const resultUrl =
                s.status === "completed"
                  ? sessionResultRoute(s.mode === "test" ? "test" : "practice", s.id)
                  : null;
              const acc = sessionAccuracy(s);
              const status = statusIcon(s.status);
              const answered = answeredCount(s);

              return (
                <tr key={s.id}>
                  <td>
                    <div className="practice-recent-table__session">
                      <span
                        className={`practice-recent-table__status material-symbols-outlined ${status.className}`}
                        title={status.label}
                        aria-label={status.label}
                      >
                        {status.icon}
                      </span>
                      <span className="practice-recent-table__session-name">{sessionTitle(s)}</span>
                    </div>
                  </td>
                  <td>{sessionScope(s)}</td>
                  <td>
                    {answered}/{s.questionCount}
                  </td>
                  <td>{acc}%</td>
                  <td>{scoreLabel(s)}</td>
                  <td className="practice-recent-table__date">{formatSessionDate(s)}</td>
                  <td className="practice-recent-table__action">
                    {guestPreview && authUrl ? (
                      <Link to={authUrl}>Sign in to save →</Link>
                    ) : resumeUrl ? (
                      <Link to={resumeUrl}>Resume →</Link>
                    ) : resultUrl ? (
                      <Link to={resultUrl}>View results →</Link>
                    ) : (
                      <button type="button" disabled={busy} onClick={() => onPracticeAgain?.(s.packId)}>
                        Practice again →
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
