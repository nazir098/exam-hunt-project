import { useNavigate } from "react-router-dom";

type Props = {
  mode: "practice" | "test";
  sessionId: string;
};

export default function SessionExpiredDialog({ mode, sessionId }: Props) {
  const navigate = useNavigate();
  const exitHref = mode === "test" ? `/test/result/${sessionId}` : "/practice";
  const exitLabel = mode === "test" ? "View results" : "Back to Practice";
  const message =
    mode === "test"
      ? "This test session has ended. You can no longer change answers here."
      : "This practice session has expired. Start a new session from Practice to continue studying.";

  return (
    <div
      className="session-expired-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="session-expired-dialog__panel glass-card">
        <span className="material-symbols-outlined session-expired-dialog__icon" aria-hidden>
          schedule
        </span>
        <h2 id="session-expired-title" className="session-expired-dialog__title">
          Session expired
        </h2>
        <p className="session-expired-dialog__message">{message}</p>
        <button
          type="button"
          className="btn primary session-expired-dialog__cta"
          onClick={() => navigate(exitHref, { replace: true })}
        >
          {exitLabel}
        </button>
      </div>
    </div>
  );
}
