import { Link } from "react-router-dom";
import type { PracticeSessionView } from "../api";
import { accuracySparkline } from "../utils/dashboardStats";

type Props = {
  trend: number;
  sessions: PracticeSessionView[];
};

function Sparkline({ points }: { points: number[] }) {
  const w = 220;
  const h = 56;
  const max = Math.max(100, ...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const coords = points.map((p, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * (w - 12) + 6;
    const y = h - 6 - ((p - min) / range) * (h - 12);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="dash-v2-sparkline" aria-hidden>
      <defs>
        <linearGradient id="dashSparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(167, 139, 250, 0.35)" />
          <stop offset="100%" stopColor="rgba(167, 139, 250, 0)" />
        </linearGradient>
      </defs>
      <polygon
        points={`6,${h - 6} ${coords.join(" ")} ${w - 6},${h - 6}`}
        fill="url(#dashSparkGrad)"
      />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="#a78bfa"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DashboardInsightsRow({ trend, sessions }: Props) {
  const points = accuracySparkline(sessions);
  const trendLabel = `${trend >= 0 ? "+" : ""}${trend}%`;

  return (
    <section className="dash-v2-insights" aria-label="Trends and AI tools">
      <Link to="/analytics" className="dash-v2-insight-card glass-card dash-v2-insight-card--chart">
        <div className="dash-v2-insight-card__head">
          <h3>Accuracy trend</h3>
          <strong className={trend >= 0 ? "dash-v2-trend-up" : "dash-v2-trend-down"}>{trendLabel}</strong>
        </div>
        <p className="dash-v2-insight-card__desc">Improving accuracy over the past 7 days</p>
        <Sparkline points={points} />
      </Link>

      <article className="dash-v2-insight-card glass-card dash-v2-insight-card--ai">
        <div className="dash-v2-insight-card__head">
          <span className="material-symbols-outlined dash-v2-insight-card__ai-icon">psychology</span>
          <h3>AI practice coach</h3>
        </div>
        <p className="dash-v2-insight-card__desc">
          Hints, wrong-answer breakdowns, weak-chapter analysis, and revision notes.
        </p>
        <Link to="/practice" className="btn dash-v2-insight-card__cta">
          Open AI tools
        </Link>
      </article>
    </section>
  );
}
