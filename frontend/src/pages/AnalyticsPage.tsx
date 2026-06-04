import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import AnalyticsGuestPreview from "../components/AnalyticsGuestPreview";
import { useAuth } from "../auth/AuthContext";
import InsightChartsPanel from "../components/InsightChartsPanel";
import Scorecard from "../components/Scorecard";
import SessionHistoryList from "../components/SessionHistoryList";
import WeeklyActivityPanel from "../components/WeeklyActivityPanel";
import {
  buildDashboardStats,
  meaningfulSessions,
  NEET_SUBJECT_MASTERY,
  sessionAccuracy,
} from "../utils/dashboardStats";

export default function AnalyticsPage() {
  const { user, progress, loading, refreshProgress } = useAuth();

  useEffect(() => {
    if (user) refreshProgress();
  }, [user, refreshProgress]);

  const stats = useMemo(() => buildDashboardStats(progress), [progress]);

  const accuracy = progress?.accuracyPercent ?? null;
  const attempts = progress?.totalAttempts ?? 0;
  const barHeights = stats.bars.length ? stats.bars : [40, 55, 45, 60, 70, accuracy ?? 50];

  const subjects = useMemo(() => {
    if (!progress?.byPack.length) return [...NEET_SUBJECT_MASTERY];
    const base = accuracy ?? 70;
    return [
      { name: "Physics", pct: Math.min(99, base + 8) },
      { name: "Chemistry", pct: Math.max(40, base - 6) },
      { name: "Biology", pct: Math.min(99, base + 2) },
    ];
  }, [progress, accuracy]);

  if (!user) {
    return <AnalyticsGuestPreview />;
  }

  if (loading) {
    return (
      <main className="analytics-page pt-4 lg:pt-8">
        <p className="analytics-loading">Loading analytics…</p>
      </main>
    );
  }

  return (
    <main className="analytics-page pt-4 lg:pt-8 space-y-lg lg:space-y-xl">
      <header className="analytics-page-header">
        <p className="page-eyebrow">Progress lab</p>
        <h1 className="analytics-page-title">Analytics &amp; scores</h1>
        <p className="analytics-page-desc">
          Full scorecard, trends, and session history. Use the{" "}
          <Link to="/" className="text-primary font-bold">
            Dashboard
          </Link>{" "}
          for quick actions and daily study shortcuts.
        </p>
      </header>

      <Scorecard progress={progress} summaryOnly showSessionNote={false} />

      <div className="analytics-grid">
        <div className="analytics-main">
          <InsightChartsPanel
            stats={stats}
            accuracy={accuracy}
            attempts={attempts}
            subjects={subjects}
            barHeights={barHeights}
          />

          <section className="analytics-card glass-card">
            <header className="analytics-card-head spread">
              <div>
                <h2>Session history</h2>
                <p className="analytics-card-sub">
                  Sessions where you submitted at least one answer (empty abandoned runs omitted).
                </p>
              </div>
              <Link to="/practice" className="text-primary text-label-md font-bold whitespace-nowrap">
                New session →
              </Link>
            </header>
            <SessionHistoryList sessions={stats.sessions} limit={12} />
          </section>

          <section className="analytics-card glass-card">
            <header className="analytics-card-head spread">
              <h2>Recommended next</h2>
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
            </header>
            <div className="analytics-picks">
              {meaningfulSessions(stats.sessions).slice(0, 2).map((s, i) => (
                <Link
                  key={s.id}
                  to={s.currentQuestionId ? `/practice/${s.id}/${s.currentQuestionId}` : "/practice"}
                  className="analytics-pick-row"
                >
                  <div className="analytics-pick-icon">
                    <span className="material-symbols-outlined">{i === 0 ? "terminal" : "bolt"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <strong className="block truncate">
                      {s.exam} · {s.packId.replace("NEET_", "NEET ")}
                    </strong>
                    <p>
                      {s.correctCount}✓ {s.wrongCount}✗ · {sessionAccuracy(s)}% accuracy
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </Link>
              ))}
              <Link to="/bank?exam=NEET" className="analytics-pick-row">
                <div className="analytics-pick-icon">
                  <span className="material-symbols-outlined">menu_book</span>
                </div>
                <div className="flex-1">
                  <strong>Browse NEET question bank</strong>
                  <p>Study without scoring</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </Link>
            </div>
          </section>
        </div>

        <aside className="analytics-side space-y-lg">
          <WeeklyActivityPanel
            heatmap={stats.heatmap}
            caption={`${attempts} total questions answered`}
          />

          <section className="analytics-card analytics-goal-card glass-card">
            <span className="analytics-goal-watermark material-symbols-outlined">workspace_premium</span>
            <h3 className="analytics-side-title">Marks goal</h3>
            <div className="analytics-goal-body">
              <div className="analytics-goal-ring">
                <span className="material-symbols-outlined">trophy</span>
              </div>
              <div>
                <p className="analytics-goal-name">Session marks</p>
                <p className="analytics-empty">
                  {stats.maxMarks > 0
                    ? `${stats.totalMarks} / ${stats.maxMarks} marks earned`
                    : "Complete adaptive practice to earn marks"}
                </p>
              </div>
            </div>
          </section>

          <section className="analytics-card glass-card analytics-compare">
            <h3 className="analytics-side-title">Dashboard vs Analytics</h3>
            <ul className="analytics-compare-list">
              <li>
                <strong>Dashboard</strong> — shortcuts; Question Bank for study; Practice for marks
              </li>
              <li>
                <strong>Analytics</strong> — practice submits only (not Question Bank checks)
              </li>
            </ul>
            <Link to="/" className="analytics-compare-link">
              Back to Dashboard
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
