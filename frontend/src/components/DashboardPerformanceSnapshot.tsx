import { Link } from "react-router-dom";
import type { ProgressSummary } from "../api";

type Props = {
  accuracy: number;
  questionsSolved: number;
  streakDays: number;
  rankLabel: string;
  progress: ProgressSummary | null;
};

export default function DashboardPerformanceSnapshot({
  accuracy,
  questionsSolved,
  streakDays,
  rankLabel,
  progress,
}: Props) {
  const totalMarks = progress?.byPack.reduce((s, p) => s + p.marks, 0) ?? 0;

  return (
    <section className="dash-snapshot glass-card" aria-label="Performance snapshot">
      <div className="dash-snapshot__head">
        <h2 className="dash-section-title">Your performance snapshot</h2>
        <Link to="/analytics" className="dash-snapshot__link">
          Full analytics <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </div>
      <div className="dash-snapshot__grid">
        <div className="dash-snapshot__stat">
          <span className="dash-snapshot__value dash-snapshot__value--accent">{accuracy}%</span>
          <span className="dash-snapshot__label">Accuracy</span>
        </div>
        <div className="dash-snapshot__stat">
          <span className="dash-snapshot__value">{questionsSolved}</span>
          <span className="dash-snapshot__label">Questions solved</span>
        </div>
        <div className="dash-snapshot__stat">
          <span className="dash-snapshot__value">
            <span className="material-symbols-outlined dash-snapshot__flame">local_fire_department</span>
            {streakDays}
          </span>
          <span className="dash-snapshot__label">Day streak</span>
        </div>
        <div className="dash-snapshot__stat">
          <span className="dash-snapshot__value">{rankLabel}</span>
          <span className="dash-snapshot__label">Rank</span>
        </div>
      </div>
      <p className="dash-snapshot__footer muted">
        <strong>{totalMarks}</strong> total practice marks · updated after each submitted answer
      </p>
    </section>
  );
}
