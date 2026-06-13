import { PracticeSessionView, ProgressSummary, type ChapterProgress } from "../api";

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

/** Map raw daily question counts to heatmap intensity levels 0–4. */
export function dailyCountsToHeatmapLevels(dailyCounts: number[]): number[] {
  const counts = dailyCounts.length === 28 ? dailyCounts : Array(28).fill(0);
  const max = Math.max(1, ...counts);
  return counts.map((questionCount) => {
    if (questionCount <= 0) return 0;
    const ratio = questionCount / max;
    if (ratio >= 0.75) return 4;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.25) return 2;
    return 1;
  });
}

/** Fallback — session start dates when weeklyActivity is unavailable. */
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
  const practiceSessions = sessions.filter((s) => !s.mode || s.mode === "practice");
  if (!practiceSessions.length) return 0;
  const dayKeys = new Set(
    practiceSessions.map((s) => new Date(s.startedAt).toISOString().slice(0, 10))
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

/** Questions answered in the last 7 days (practice mode only). */
export function questionsThisWeek(sessions: PracticeSessionView[]): number {
  const cutoff = Date.now() - 7 * 86400000;
  return meaningfulSessions(sessions)
    .filter((s) => (!s.mode || s.mode === "practice") && new Date(s.startedAt).getTime() >= cutoff)
    .reduce((sum, s) => sum + s.correctCount + s.wrongCount, 0);
}

/** Longest run of consecutive calendar days with at least one session. */
export function bestStreakDays(sessions: PracticeSessionView[]): number {
  const dayKeys = [
    ...new Set(
      meaningfulSessions(sessions).map((s) => new Date(s.startedAt).toISOString().slice(0, 10))
    ),
  ].sort();
  if (dayKeys.length === 0) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < dayKeys.length; i++) {
    const prev = new Date(dayKeys[i - 1]).getTime();
    const next = new Date(dayKeys[i]).getTime();
    if (Math.round((next - prev) / 86400000) === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
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
    heatmap:
      progress?.weeklyActivity?.length === 28
        ? dailyCountsToHeatmapLevels(progress.weeklyActivity)
        : buildWeeklyGrid(sessions),
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

export type SubjectAccuracy = { name: string; pct: number; attempts: number };

/** Roll chapter attempts up to Physics / Chemistry / Biology. */
export function buildSubjectAccuracy(
  weakChapters: ChapterProgress[] | undefined
): SubjectAccuracy[] {
  const map = new Map<string, { attempts: number; correct: number }>();
  for (const c of weakChapters ?? []) {
    const cur = map.get(c.subject) ?? { attempts: 0, correct: 0 };
    cur.attempts += c.attempts;
    cur.correct += c.correct;
    map.set(c.subject, cur);
  }
  return ["Physics", "Chemistry", "Biology"].map((name) => {
    const data = map.get(name);
    if (!data?.attempts) return { name, pct: 0, attempts: 0 };
    return {
      name,
      pct: Math.round((data.correct / data.attempts) * 100),
      attempts: data.attempts,
    };
  });
}

export const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
