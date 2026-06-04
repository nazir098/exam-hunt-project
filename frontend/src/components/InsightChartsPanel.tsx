import { Link } from "react-router-dom";
import { DashboardStats } from "../utils/dashboardStats";

type SubjectRow = { name: string; pct: number };

type Props = {
  stats: DashboardStats;
  accuracy: number | null;
  attempts: number;
  subjects: SubjectRow[];
  barHeights: number[];
};

export default function InsightChartsPanel({ stats, accuracy, attempts, subjects, barHeights }: Props) {
  return (
    <section className="analytics-card analytics-card--glow glass-card">
      <header className="analytics-card-head">
        <div className="analytics-card-icon">
          <span className="material-symbols-outlined">psychology</span>
        </div>
        <div>
          <h2>AI Insights &amp; Trends</h2>
          <p className="analytics-card-sub">Based on your last {Math.min(5, stats.bars.length) || 5} Practice sessions.</p>
        </div>
      </header>

      <div className="analytics-insight-callout">
        <p>
          {attempts === 0 ? (
            "Start a practice session to receive personalized focus areas."
          ) : (
            <>
              Focus on <span className="analytics-spark">weak chapters</span>: overall accuracy is{" "}
              <span className="analytics-warn">{accuracy}%</span>.
            </>
          )}
        </p>
      </div>

      <div className="analytics-mini-grid">
        <div className="analytics-mini-card">
          <div className="analytics-mini-head">
            <span>Accuracy trend</span>
            <span className="analytics-good">
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
                      <span>{pct}% · {p.marks} marks</span>
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

      {attempts > 0 && (
        <p className="analytics-card-footer">
          <Link to="/bank?exam=NEET" className="text-primary font-bold">
            Drill weak topics in Question Bank →
          </Link>
        </p>
      )}
    </section>
  );
}
