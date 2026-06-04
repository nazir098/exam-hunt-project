import { WEEKDAY_LABELS } from "../utils/dashboardStats";

function heatmapClass(level: number): string {
  if (level <= 0) return "heatmap-cell";
  return `heatmap-cell heatmap-cell--${Math.min(4, level)}`;
}

type Props = {
  heatmap: number[];
  caption?: string;
};

export default function WeeklyActivityPanel({ heatmap, caption }: Props) {
  return (
    <section className="analytics-card glass-card">
      <h3 className="analytics-side-title">Weekly activity</h3>
      {caption && <p className="analytics-activity-caption">{caption}</p>}
      <div className="analytics-heatmap" role="img" aria-label="Practice activity by day">
        {heatmap.map((level, idx) => (
          <div key={idx} className={heatmapClass(level)} />
        ))}
      </div>
      <div className="analytics-heatmap-days">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <p className="analytics-heatmap-legend">Last 4 weeks · darker = more sessions that day</p>
    </section>
  );
}
