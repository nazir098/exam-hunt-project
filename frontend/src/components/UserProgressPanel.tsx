import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { sessionIdleMinutes } from "../auth/session";

export default function UserProgressPanel() {
  const { user, progress, logout } = useAuth();

  if (!user) return null;

  const totalMarks = progress?.byPack.reduce((s, p) => s + p.marks, 0) ?? 0;
  const accuracy = progress?.accuracyPercent ?? 0;
  const attempts = progress?.totalAttempts ?? 0;

  return (
    <div className="user-progress-panel">
      <Link to="/practice" className="user-progress-scores" title="View full progress on Practice">
        <span className="user-progress-marks">
          <strong>{totalMarks}</strong> marks
        </span>
        <span className="user-progress-dot" aria-hidden>
          ·
        </span>
        <span>{accuracy}%</span>
        <span className="user-progress-dot" aria-hidden>
          ·
        </span>
        <span>{attempts} Qs</span>
      </Link>
      <button type="button" className="user-logout-btn" onClick={logout} title="Sign out">
        Log out
      </button>
      <span className="user-session-hint" title={`Session ends after ${sessionIdleMinutes()} min idle`}>
        {user.displayName}
      </span>
    </div>
  );
}
