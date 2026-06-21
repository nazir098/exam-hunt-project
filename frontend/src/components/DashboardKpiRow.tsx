import { Link } from "react-router-dom";
import type { PracticeSessionView } from "../api";
import {
  accuracyDeltaLast7Days,
  bestStreakDays,
  questionsDeltaLast7Days,
  rankSubtitle,
} from "../utils/dashboardStats";

type Props = {
  accuracy: number;
  questionsSolved: number;
  streakDays: number;
  rankLabel: string;
  rank: number | null;
  scholars: number;
  sessions: PracticeSessionView[];
  trendFallback: number;
};

function trendClass(delta: number): string {
  if (delta > 0) return "dash-v2-kpi__trend dash-v2-kpi__trend--up";
  if (delta < 0) return "dash-v2-kpi__trend dash-v2-kpi__trend--down";
  return "dash-v2-kpi__trend";
}

export default function DashboardKpiRow({
  accuracy,
  questionsSolved,
  streakDays,
  rankLabel,
  rank,
  scholars,
  sessions,
  trendFallback,
}: Props) {
  const accDelta = accuracyDeltaLast7Days(sessions, trendFallback);
  const qDelta = questionsDeltaLast7Days(sessions);
  const bestStreak = bestStreakDays(sessions);

  const cards = [
    {
      icon: "track_changes",
      iconClass: "dash-v2-kpi__icon--accuracy",
      label: "Accuracy",
      value: `${accuracy}%`,
      trend:
        accDelta !== 0 ? (
          <span className={trendClass(accDelta)}>
            {accDelta > 0 ? "↑" : "↓"} {Math.abs(accDelta)}% vs last 7 days
          </span>
        ) : (
          <span className="dash-v2-kpi__sub">Last 7 days</span>
        ),
      to: "/analytics",
    },
    {
      icon: "description",
      iconClass: "dash-v2-kpi__icon--questions",
      label: "Questions solved",
      value: String(questionsSolved),
      trend:
        qDelta !== 0 ? (
          <span className={trendClass(qDelta)}>
            {qDelta > 0 ? "↑" : "↓"} {Math.abs(qDelta)} vs last 7 days
          </span>
        ) : (
          <span className="dash-v2-kpi__sub">All time</span>
        ),
      to: "/analytics",
    },
    {
      icon: "local_fire_department",
      iconClass: "dash-v2-kpi__icon--streak",
      label: "Day streak",
      value: String(streakDays),
      trend: <span className="dash-v2-kpi__sub">Best: {bestStreak} day{bestStreak === 1 ? "" : "s"}</span>,
      to: "/analytics",
    },
    {
      icon: "emoji_events",
      iconClass: "dash-v2-kpi__icon--rank",
      label: "Rank",
      value: rankLabel,
      trend: <span className="dash-v2-kpi__sub">{rankSubtitle(rank, scholars)}</span>,
      to: "/leaderboard",
    },
  ] as const;

  return (
    <section className="dash-v2-kpis" aria-label="Key metrics">
      {cards.map((card) => (
        <Link key={card.label} to={card.to} className="dash-v2-kpi glass-card">
          <span className={`dash-v2-kpi__icon ${card.iconClass}`}>
            <span className="material-symbols-outlined">{card.icon}</span>
          </span>
          <div className="dash-v2-kpi__body">
            <span className="dash-v2-kpi__label">{card.label}</span>
            <strong className="dash-v2-kpi__value">{card.value}</strong>
            {card.trend}
          </div>
        </Link>
      ))}
    </section>
  );
}
