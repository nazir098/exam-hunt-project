import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { sessionIdleMinutes } from "../auth/session";

type Props = {
  variant?: "inline" | "strip" | "legacy";
};

export default function UserProgressPanel({ variant = "legacy" }: Props) {
  const { user, progress, logout } = useAuth();

  if (!user) return null;

  const totalMarks = progress?.byPack.reduce((s, p) => s + p.marks, 0) ?? 0;
  const accuracy = progress?.accuracyPercent ?? 0;
  const attempts = progress?.totalAttempts ?? 0;
  const correct = progress?.correctAttempts ?? 0;

  if (variant === "inline") {
    return (
      <div className="user-progress-inline flex items-center gap-1.5 shrink-0">
        <Link to="/analytics" className="user-progress-pill user-progress-pill--marks" title="Total marks">
          <strong>{totalMarks}</strong> marks
        </Link>
        <Link to="/analytics" className="user-progress-pill" title="Accuracy">
          {accuracy}%
        </Link>
        <Link to="/analytics" className="user-progress-pill hidden xl:inline-flex" title="Questions answered">
          {attempts} Qs
        </Link>
        <button
          type="button"
          className="user-progress-logout-btn hidden xl:inline-flex"
          onClick={logout}
          title="Sign out"
        >
          Log out
        </button>
      </div>
    );
  }

  if (variant === "strip") {
    return (
      <div
        className="user-progress-strip lg:hidden shrink-0 w-full px-margin-mobile py-2 border-b border-white/10 bg-surface-container-low/80 backdrop-blur-sm"
        role="region"
        aria-label="Your practice scores"
      >
        <div className="flex items-center gap-2 w-full">
          <Link
            to="/analytics"
            className="user-progress-strip-scores flex-1 min-w-0 grid grid-cols-3 gap-1"
          >
            <div className="user-progress-stat-cell">
              <span className="user-progress-stat-value">{totalMarks}</span>
              <span className="user-progress-stat-label">marks</span>
            </div>
            <div className="user-progress-stat-cell">
              <span className="user-progress-stat-value">{accuracy}%</span>
              <span className="user-progress-stat-label">accuracy</span>
            </div>
            <div className="user-progress-stat-cell">
              <span className="user-progress-stat-value">{attempts}</span>
              <span className="user-progress-stat-label">answered</span>
            </div>
          </Link>
          <button
            type="button"
            className="user-progress-logout shrink-0 px-2 py-1.5 rounded-lg text-caption font-bold text-on-surface-variant border border-white/10 hover:border-error/50 hover:text-error"
            onClick={logout}
          >
            Log out
          </button>
        </div>
        <p className="user-progress-strip-meta mt-1.5 truncate text-caption">
          <span className="text-on-surface font-medium">{user.displayName}</span>
          <span className="text-on-surface-variant">
            {" "}
            · {correct} correct · {sessionIdleMinutes()}m idle timeout
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="user-progress-panel">
      <Link to="/analytics" className="user-progress-scores" title="View analytics">
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
