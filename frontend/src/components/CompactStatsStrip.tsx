import { Link } from "react-router-dom";
import { ProgressSummary } from "../api";

type Props = {
  progress: ProgressSummary | null;
  className?: string;
};

/** At-a-glance stats for Dashboard — links to full Analytics. */
export default function CompactStatsStrip({ progress, className = "" }: Props) {
  const totalMarks = progress?.byPack.reduce((s, p) => s + p.marks, 0) ?? 0;
  const accuracy = progress?.accuracyPercent ?? 0;
  const attempts = progress?.totalAttempts ?? 0;
  const correct = progress?.correctAttempts ?? 0;

  return (
    <Link to="/analytics" className={`compact-stats glass-card ${className}`} aria-label="View full analytics">
      <div className="compact-stats__item">
        <span className="compact-stats__value compact-stats__value--primary">{totalMarks}</span>
        <span className="compact-stats__label">marks</span>
      </div>
      <div className="compact-stats__item">
        <span className="compact-stats__value compact-stats__value--secondary">{accuracy}%</span>
        <span className="compact-stats__label">accuracy</span>
      </div>
      <div className="compact-stats__item">
        <span className="compact-stats__value">{attempts}</span>
        <span className="compact-stats__label">answered</span>
      </div>
      <div className="compact-stats__item">
        <span className="compact-stats__value">{correct}</span>
        <span className="compact-stats__label">correct</span>
      </div>
      <span className="compact-stats__chevron material-symbols-outlined" aria-hidden>
        chevron_right
      </span>
    </Link>
  );
}
