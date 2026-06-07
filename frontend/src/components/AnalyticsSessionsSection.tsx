import { useState } from "react";
import { Link } from "react-router-dom";
import SessionHistoryList from "./SessionHistoryList";
import type { DashboardStats } from "../utils/dashboardStats";
import { meaningfulSessions } from "../utils/dashboardStats";

type Props = {
  stats: DashboardStats;
};

export default function AnalyticsSessionsSection({ stats }: Props) {
  const [showFull, setShowFull] = useState(false);
  const sessionCount = meaningfulSessions(stats.sessions).length;

  return (
    <>
      <section className="analytics-card glass-card">
        <header className="analytics-card-head spread">
          <div className="flex items-start gap-3 min-w-0">
            <div className="analytics-card-icon">
              <span className="material-symbols-outlined">history</span>
            </div>
            <div>
              <h2>Recent sessions</h2>
              <p className="analytics-card-sub">Your latest scored practice runs</p>
            </div>
          </div>
          <Link to="/practice" className="text-primary text-label-md font-bold whitespace-nowrap">
            New →
          </Link>
        </header>
        <SessionHistoryList sessions={stats.sessions} limit={3} detailed />
        {!showFull && sessionCount > 3 && (
          <button
            type="button"
            className="analytics-history-toggle"
            onClick={() => setShowFull(true)}
          >
            View full history →
          </button>
        )}
      </section>

      {showFull && (
        <section className="analytics-card glass-card analytics-history-expanded">
          <header className="analytics-card-head spread">
            <div>
              <h2>Full session history</h2>
              <p className="analytics-card-sub">All scored runs with at least one answer</p>
            </div>
            <button
              type="button"
              className="analytics-history-toggle analytics-history-toggle--muted"
              onClick={() => setShowFull(false)}
            >
              Show less
            </button>
          </header>
          <SessionHistoryList sessions={stats.sessions} limit={20} detailed />
        </section>
      )}
    </>
  );
}
