import { useMemo } from "react";
import type { PracticeSessionView } from "../api";
import { buildWeeklyActivityCells } from "../utils/analyticsInsights";
import { WEEKDAY_LABELS } from "../utils/dashboardStats";

function heatmapClass(level: number): string {
  if (level <= 0) return "heatmap-cell";
  return `heatmap-cell heatmap-cell--${Math.min(4, level)}`;
}

type Props = {
  sessions: PracticeSessionView[];
  totalQuestions?: number;
};

export default function WeeklyActivityPanel({ sessions, totalQuestions = 0 }: Props) {
  const cells = useMemo(() => buildWeeklyActivityCells(sessions), [sessions]);
  const hasActivity = cells.some((c) => c.questionCount > 0);

  return (
    <section className="analytics-card glass-card">
      <h3 className="analytics-side-title">Weekly activity</h3>
      {hasActivity ? (
        <>
          <p className="analytics-activity-caption">
            Last 4 weeks · darker = more questions solved
            {totalQuestions > 0 && ` · ${totalQuestions} total answered`}
          </p>
          <div className="analytics-heatmap" role="img" aria-label="Practice activity by day">
            {cells.map((cell, idx) => (
              <div
                key={idx}
                className={heatmapClass(cell.level)}
                title={cell.tooltip}
              />
            ))}
          </div>
          <div className="analytics-heatmap-days">
            {WEEKDAY_LABELS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <p className="analytics-heatmap-legend">Hover a cell for daily question count</p>
        </>
      ) : (
        <p className="analytics-empty analytics-empty--compact">
          No activity yet. Complete one practice session to see your streak.
        </p>
      )}
    </section>
  );
}
