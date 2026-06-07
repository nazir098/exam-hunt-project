import { Link } from "react-router-dom";
import type { ProgressSummary } from "../api";
import {
  lastSessionSummary,
  performanceTrendLabel,
  weakChapterSubjectLine,
} from "../utils/analyticsInsights";
import type { DashboardStats } from "../utils/dashboardStats";
import { primaryWeakChapter, weakChapterPracticeUrl } from "../utils/weakChapters";

type Props = {
  progress: ProgressSummary | null;
  stats: DashboardStats;
  defaultPackId?: string;
};

export default function AnalyticsFocusCard({ progress, stats, defaultPackId }: Props) {
  const weak = primaryWeakChapter(progress?.weakChapters);
  const overallAccuracy = progress?.accuracyPercent ?? 0;
  const attempts = progress?.totalAttempts ?? 0;
  const trend = stats.trend;
  const lastSession = lastSessionSummary(stats.sessions);
  const subjectLine = weakChapterSubjectLine(weak);
  const practiceUrl = weak ? weakChapterPracticeUrl(weak, defaultPackId) : "/practice";

  return (
    <section className="analytics-focus glass-card" aria-label="Your focus right now">
      <div className="analytics-focus__grid">
        <div className="analytics-focus__left">
          <p className="analytics-focus__eyebrow">Your focus right now</p>

          {weak ? (
            <>
              <p className="analytics-focus__chapter">
                Weakest chapter: <strong>{weak.chapter}</strong>
              </p>
              <p className="analytics-focus__subject">{subjectLine}</p>
              <p className="analytics-focus__rec-label">
                Recommended: <span>Practice 10 questions</span>
              </p>
            </>
          ) : (
            <>
              <p className="analytics-focus__chapter">
                Weakest chapter: <strong>Not enough data yet</strong>
              </p>
              <p className="analytics-focus__subject">{overallAccuracy}% overall accuracy</p>
              <p className="analytics-focus__rec-label">
                Recommended: <span>Start your first practice session</span>
              </p>
            </>
          )}
        </div>

        <div className="analytics-focus__right">
          {lastSession && (
            <p className="analytics-focus__stat">
              <span className="analytics-focus__stat-label">Last session</span>
              <span>{lastSession}</span>
            </p>
          )}

          <p className="analytics-focus__stat">
            <span className="analytics-focus__stat-label">Trend</span>
            <span className={trend >= 0 || attempts === 0 ? "analytics-focus__trend-up" : "analytics-focus__trend-down"}>
              <span className="material-symbols-outlined" aria-hidden>
                {trend >= 0 || attempts === 0 ? "trending_up" : "trending_down"}
              </span>
              {performanceTrendLabel(stats, attempts)}
            </span>
          </p>

          {weak && weak.attempts > 0 && (
            <p className="analytics-focus__stat">
              <span className="analytics-focus__stat-label">In this chapter</span>
              <span>
                {weak.attempts} question{weak.attempts === 1 ? "" : "s"} attempted
              </span>
            </p>
          )}

          <Link to={practiceUrl} className="btn primary analytics-focus__cta">
            Start 10-question practice →
          </Link>
        </div>
      </div>
    </section>
  );
}
