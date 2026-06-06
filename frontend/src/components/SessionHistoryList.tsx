import { Link } from "react-router-dom";
import { PracticeSessionView } from "../api";
import { meaningfulSessions, sessionAccuracy } from "../utils/dashboardStats";

type Props = {
  sessions: PracticeSessionView[];
  limit?: number;
};

export default function SessionHistoryList({ sessions, limit = 10 }: Props) {
  const rows = meaningfulSessions(sessions).slice(0, limit);

  if (rows.length === 0) {
    return (
      <p className="analytics-empty">
        No completed practice runs yet. Abandoned empty sessions are hidden — start a session and
        submit at least one answer.
      </p>
    );
  }

  return (
    <ul className="session-history">
      {rows.map((s) => (
        <li key={s.id}>
          <Link
            to={s.currentQuestionId ? `/practice/${s.id}/${s.currentQuestionId}` : "/practice"}
            className="session-history__row"
          >
            <div className="session-history__main">
              <strong>{s.packId.replace("NEET_", "NEET ")}</strong>
              <span className="session-history__meta">
                {s.status} · {s.correctCount + s.wrongCount}/{s.questionCount} answered
              </span>
            </div>
            <div className="session-history__scores">
              <span className="session-history__marks">
                {s.totalMarks}/{s.maxMarks} marks
              </span>
              <span className="session-history__acc">{sessionAccuracy(s)}%</span>
            </div>
            <span className="material-symbols-outlined session-history__arrow">chevron_right</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
