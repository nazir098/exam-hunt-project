import { PracticeSessionView, ProgressSummary } from "../api";

/** Sessions worth showing in lists (skip abandoned actives with no answers). */
export function meaningfulSessions(sessions: PracticeSessionView[]): PracticeSessionView[] {
  return sessions.filter((s) => s.correctCount + s.wrongCount > 0);
}

export function sessionAccuracy(s: PracticeSessionView): number {
  const total = s.correctCount + s.wrongCount;
  if (total === 0) return 0;
  return Math.round((s.correctCount / total) * 100);
}

export function heatmapClass(level: number): string {
  if (level <= 0) return "dashboard-heatmap-cell--0";
  if (level === 1) return "dashboard-heatmap-cell--1";
  if (level === 2) return "dashboard-heatmap-cell--2";
  if (level === 3) return "dashboard-heatmap-cell--3";
  return "dashboard-heatmap-cell--4";
}

/** 4 weeks × 7 days (Mon–Sun columns), most recent day bottom-right. */
export function buildWeeklyGrid(sessions: PracticeSessionView[]): number[] {
  const cells = Array(28).fill(0);
  const now = new Date();
  sessions.forEach((s) => {
    const d = new Date(s.startedAt);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 28) {
      const idx = 27 - diffDays;
      cells[idx] = Math.min(4, cells[idx] + 1);
    }
  });
  return cells;
}

export type DashboardStats = {
  sessions: PracticeSessionView[];
  bars: number[];
  trend: number;
  heatmap: number[];
  totalMarks: number;
  maxMarks: number;
  packs: ProgressSummary["byPack"];
  activeSession: PracticeSessionView | null;
};

/** Consecutive calendar days with at least one practice session (up to today). */
export function computeStreakDays(sessions: PracticeSessionView[]): number {
  if (!sessions.length) return 0;
  const dayKeys = new Set(
    sessions.map((s) => new Date(s.startedAt).toISOString().slice(0, 10))
  );
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 45; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (dayKeys.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      break;
    } else {
      break;
    }
  }
  return streak;
}

export function buildDashboardStats(progress: ProgressSummary | null): DashboardStats {
  const sessions = meaningfulSessions(progress?.recentSessions ?? []);
  const completed = sessions.filter((s) => s.correctCount + s.wrongCount > 0);
  const lastFive = completed.slice(0, 5).reverse();
  const bars = lastFive.map((s) => sessionAccuracy(s));
  const trend =
    bars.length >= 2 ? bars[bars.length - 1] - bars[0] : progress?.accuracyPercent ?? 12;
  const totalMarks = progress?.byPack.reduce((s, p) => s + p.marks, 0) ?? 0;
  const maxMarks = sessions.reduce((sum, s) => sum + s.maxMarks, 0);
  const activeSession =
    sessions.find((s) => s.status === "active" && s.currentQuestionId) ?? null;
  return {
    sessions,
    bars,
    trend,
    heatmap: buildWeeklyGrid(sessions),
    totalMarks,
    maxMarks,
    packs: progress?.byPack ?? [],
    activeSession,
  };
}

export const NEET_SUBJECT_MASTERY = [
  { name: "Physics", pct: 82 },
  { name: "Chemistry", pct: 64 },
  { name: "Biology", pct: 71 },
] as const;

export const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
