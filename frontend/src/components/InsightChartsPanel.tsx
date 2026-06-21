import { Link } from "react-router-dom";
import type { ProgressSummary } from "../api";
import { buildAnalyticsInsights } from "../utils/analyticsInsights";
import { DashboardStats } from "../utils/dashboardStats";
import { primaryWeakChapter } from "../utils/weakChapters";

type SubjectRow = { name: string; pct: number };

type Props = {
  stats: DashboardStats;
  progress: ProgressSummary | null;
  accuracy: number | null;
  attempts: number;
  subjects: SubjectRow[];
  barHeights: number[];
};

export default function InsightChartsPanel({
  stats,
  progress,
  attempts,
  subjects,
  barHeights,
}: Props) {
  const insights = buildAnalyticsInsights(progress, stats);
  const weak = primaryWeakChapter(progress?.weakChapters);

  return (
    <section className="analytics-card analytics-card--glow glass-card">
      <header className="analytics-card-head">
        <div className="analytics-card-icon">
          <span className="material-symbols-outlined">psychology</span>
        </div>
        <div>
          <h2>AI Insights &amp; Trends</h2>
          <p className="analytics-card-sub">
            Based on your last {Math.min(5, stats.bars.length) || 5} practice sessions
          </p>
        </div>
      </header>

      <ul className="analytics-insight-list">
        {insights.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className="analytics-mini-grid">
        <div className="analytics-mini-card">
          <div className="analytics-mini-head">
            <span>Accuracy trend</span>
            <span className={stats.trend >= 0 ? "analytics-good" : "analytics-warn"}>
              {stats.trend >= 0 ? "+" : ""}
              {stats.trend}%
            </span>
          </div>
          <div className="analytics-bars" aria-hidden>
            {barHeights.map((h, i) => (
              <div
                key={i}
                className={`analytics-bar ${
                  i === barHeights.length - 1
                    ? "analytics-bar--last"
                    : i === barHeights.length - 2
                      ? "analytics-bar--accent"
                      : ""
                }`}
                style={{ height: `${Math.max(20, Math.min(100, h))}%` }}
              />
            ))}
          </div>
        </div>

        <div className="analytics-mini-card">
          <span className="analytics-mini-label">Subject / pack mastery</span>
          <div className="analytics-subject-bars">
            {stats.packs.length === 0 ? (
              subjects.map((s) => (
                <div key={s.name}>
                  <div className="analytics-subject-row">
                    <span>{s.name}</span>
                    <span>{s.pct}%</span>
                  </div>
                  <div className="analytics-subject-track">
                    <div className="analytics-subject-fill" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))
            ) : (
              stats.packs.map((p) => {
                const pct = p.attempts ? Math.round((p.correct / p.attempts) * 100) : 0;
                return (
                  <div key={p.packId}>
                    <div className="analytics-subject-row">
                      <span>{p.packId.replace(/_/g, " ")}</span>
                      <span>
                        {pct}% · {p.marks} marks
                      </span>
                    </div>
                    <div className="analytics-subject-track">
                      <div className="analytics-subject-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {attempts > 0 && weak && (
        <p className="analytics-card-footer">
          <Link
            to={`/practice?exam=NEET&subject=${encodeURIComponent(weak.subject)}&chapter=${encodeURIComponent(weak.chapter)}#question-bank`}
            className="text-primary font-bold"
          >
            Open {weak.chapter} in Question Bank →
          </Link>
        </p>
      )}
    </section>
  );
}
