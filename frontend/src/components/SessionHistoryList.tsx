import { Link } from "react-router-dom";
import { PracticeSessionView } from "../api";
import { sessionResultRoute } from "../navigation/modes";
import { meaningfulSessions, sessionAccuracy } from "../utils/dashboardStats";
import { sessionResumeUrl } from "../utils/practiceHub";

type Props = {
  sessions: PracticeSessionView[];
  limit?: number;
  detailed?: boolean;
};

function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatus(status: string): string {
  if (status === "active") return "Active";
  if (status === "completed") return "Completed";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function SessionHistoryList({ sessions, limit = 10, detailed = false }: Props) {
  const rows = meaningfulSessions(sessions).slice(0, limit);

  if (rows.length === 0) {
    return (
      <p className="analytics-empty">
        No practice runs yet. Start a session and submit at least one answer.
      </p>
    );
  }

  return (
    <ul className={`session-history${detailed ? " session-history--detailed" : ""}`}>
      {rows.map((s) => {
        const answered = s.correctCount + s.wrongCount;
        const acc = sessionAccuracy(s);
        const mode = s.mode === "test" ? "test" : "practice";
        const href =
          s.status === "completed"
            ? sessionResultRoute(mode, s.id)
            : sessionResumeUrl(s) ?? "/practice";

        return (
          <li key={s.id}>
            <Link to={href} className="session-history__row">
              <div className="session-history__main">
                <strong>{s.packId.replace("NEET_", "NEET ")}</strong>
                {detailed ? (
                  <>
                    <span className="session-history__meta">{formatSessionTime(s.startedAt)}</span>
                    <span className="session-history__meta">
                      {answered}/{s.questionCount} answered ·{" "}
                      <span
                        className={`session-history__status session-history__status--${s.status}`}
                      >
                        {formatStatus(s.status)}
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="session-history__meta">
                    {s.status} · {answered}/{s.questionCount} answered
                  </span>
                )}
              </div>
              <div className="session-history__scores">
                <span className="session-history__marks">
                  {s.totalMarks}/{s.maxMarks} marks
                </span>
                <span
                  className={`session-history__acc${acc < 50 ? " session-history__acc--low" : ""}`}
                >
                  {acc}% accuracy
                </span>
              </div>
              <span className="material-symbols-outlined session-history__arrow">chevron_right</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
