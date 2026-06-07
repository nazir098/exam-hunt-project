import type { ChapterProgress, PracticeSessionView, ProgressSummary } from "../api";
import type { DashboardStats } from "./dashboardStats";
import { buildSubjectAccuracy, meaningfulSessions, sessionAccuracy } from "./dashboardStats";
import { primaryWeakChapter } from "./weakChapters";

export function performanceTrendLabel(stats: DashboardStats, attempts: number): string {
  if (attempts === 0) {
    return "Complete one practice session to track improvement.";
  }
  if (stats.bars.length < 2) {
    return "Keep practicing to see how your accuracy changes.";
  }
  if (stats.trend >= 0) {
    return "You're improving compared to recent sessions.";
  }
  return "Accuracy dropped compared to recent sessions.";
}

export function buildAnalyticsInsights(
  progress: ProgressSummary | null,
  stats: DashboardStats
): string[] {
  const weak = primaryWeakChapter(progress?.weakChapters);
  const attempts = progress?.totalAttempts ?? 0;

  if (attempts === 0) {
    return [
      "Start your first practice session to unlock insights.",
      "We'll highlight weak chapters after you answer questions.",
      "Try 10 questions today to build your baseline.",
    ];
  }

  const insights: string[] = [];

  if (weak) {
    insights.push(`${weak.chapter} needs immediate revision.`);
    insights.push(`${weak.subject} accuracy is ${weak.accuracyPercent}%, below target.`);
  } else {
    insights.push("Answer more questions to unlock chapter-level weak spots.");
    const overall = progress?.accuracyPercent ?? 0;
    insights.push(`Overall accuracy is ${overall}% across recent practice.`);
  }

  insights.push("Try 10 weak-chapter questions today.");
  return insights.slice(0, 3);
}

export type WeeklyActivityCell = {
  level: number;
  questionCount: number;
  tooltip: string;
};

/** Last 4 weeks — question counts per day for heatmap + tooltips. */
export function buildWeeklyActivityCells(sessions: PracticeSessionView[]): WeeklyActivityCell[] {
  const counts = Array(28).fill(0);
  const now = new Date();

  for (const s of meaningfulSessions(sessions)) {
    const d = new Date(s.startedAt);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 28) {
      counts[27 - diffDays] += s.correctCount + s.wrongCount;
    }
  }

  const max = Math.max(1, ...counts);

  return counts.map((questionCount, idx) => {
    const dayOffset = 27 - idx;
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    const dayName = date.toLocaleDateString(undefined, { weekday: "long" });
    const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const tooltip =
      questionCount === 0
        ? `${dayName} (${label}): no questions`
        : `${dayName} (${label}): ${questionCount} question${questionCount === 1 ? "" : "s"}`;

    let level = 0;
    if (questionCount > 0) {
      const ratio = questionCount / max;
      if (ratio >= 0.75) level = 4;
      else if (ratio >= 0.5) level = 3;
      else if (ratio >= 0.25) level = 2;
      else level = 1;
    }

    return { level, questionCount, tooltip };
  });
}

export function subjectAccuracyLabel(subject: { name: string; pct: number; attempts: number }): string {
  return subject.attempts > 0 ? `${subject.pct}%` : "Not attempted yet";
}

export function lastSessionSummary(sessions: PracticeSessionView[]): string | null {
  const last = meaningfulSessions(sessions)[0];
  if (!last) return null;
  return `${last.totalMarks}/${last.maxMarks} marks · ${sessionAccuracy(last)}% accuracy`;
}

export function weakChapterSubjectLine(weak: ChapterProgress | null): string | null {
  if (!weak) return null;
  return `${weak.subject} · ${weak.accuracyPercent}% accuracy`;
}
