import type { PracticeSessionView, ProgressSummary, WrongAttemptView } from "../api";
import type { ChapterProgress } from "../api";
import { meaningfulSessions } from "./dashboardStats";

export type TrendPoint = { label: string; value: number };

export type SubjectGauge = {
  name: string;
  icon: string;
  pct: number;
  correct: number;
  attempts: number;
  trend: number;
};

export type MistakeSegment = {
  label: string;
  count: number;
  pct: number;
  color: string;
};

const BOTANY_HINTS = /plant|cell|bio.?molecule|anatomy of|morphology|reproduction in|plant kingdom/i;
const ZOOLOGY_HINTS = /animal|human|zoology|structural organisation|biotechnology|microbe/i;

function bioBucket(chapter: string): "Botany" | "Zoology" {
  if (BOTANY_HINTS.test(chapter)) return "Botany";
  if (ZOOLOGY_HINTS.test(chapter)) return "Zoology";
  return chapter.length % 2 === 0 ? "Botany" : "Zoology";
}

function mapSubject(subject: string, chapter: string): string {
  if (subject === "Biology") return bioBucket(chapter);
  if (subject === "Botany" || subject === "Zoology") return subject;
  return subject;
}

const WEEKS_IN_CHART = 4;
const DAYS_IN_CHART = WEEKS_IN_CHART * 7;

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** 0 = oldest week (~27–21 days ago), 3 = current week (0–6 days ago). */
export function chartWeekIndex(daysAgoVal: number): number | null {
  if (daysAgoVal < 0 || daysAgoVal >= DAYS_IN_CHART) return null;
  return WEEKS_IN_CHART - 1 - Math.floor(daysAgoVal / 7);
}

function sessionsInChartWindow(sessions: PracticeSessionView[]): PracticeSessionView[] {
  return meaningfulSessions(sessions).filter((s) => chartWeekIndex(daysAgo(s.startedAt)) !== null);
}

/** Roll chapter stats into Physics / Chemistry / Botany / Zoology (all-time). */
export function buildFourSubjectGauges(weakChapters: ChapterProgress[] | undefined): SubjectGauge[] {
  const defs = [
    { name: "Physics", icon: "architecture" },
    { name: "Chemistry", icon: "science" },
    { name: "Botany", icon: "eco" },
    { name: "Zoology", icon: "pets" },
  ] as const;

  const map = new Map<string, { attempts: number; correct: number }>();
  for (const c of weakChapters ?? []) {
    const key = mapSubject(c.subject, c.chapter);
    const cur = map.get(key) ?? { attempts: 0, correct: 0 };
    cur.attempts += c.attempts;
    cur.correct += c.correct;
    map.set(key, cur);
  }

  return defs.map((def) => {
    const data = map.get(def.name);
    const attempts = data?.attempts ?? 0;
    const correct = data?.correct ?? 0;
    const pct = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
    return { name: def.name, icon: def.icon, pct, correct, attempts, trend: 0 };
  });
}

/** Weekly accuracy for the last 28 days (4 buckets, oldest → newest). */
export function accuracyTrendPoints(sessions: PracticeSessionView[], fallback: number): TrendPoint[] {
  const buckets: { correct: number; total: number }[] = Array.from({ length: WEEKS_IN_CHART }, () => ({
    correct: 0,
    total: 0,
  }));

  for (const s of sessionsInChartWindow(sessions)) {
    const weekIdx = chartWeekIndex(daysAgo(s.startedAt));
    if (weekIdx === null) continue;
    buckets[weekIdx].correct += s.correctCount;
    buckets[weekIdx].total += s.correctCount + s.wrongCount;
  }

  const labels = weekLabels(WEEKS_IN_CHART);
  const hasAny = buckets.some((b) => b.total > 0);
  if (!hasAny) {
    return labels.map((label) => ({ label, value: fallback }));
  }

  return labels.map((label, i) => {
    const bucket = buckets[i];
    const value = bucket.total > 0 ? Math.round((bucket.correct / bucket.total) * 100) : 0;
    return { label, value };
  });
}

/** Weekly question counts for the last 28 days (4 buckets, oldest → newest). */
export function questionsTrendPoints(weeklyActivity: number[] | undefined, sessions: PracticeSessionView[]): TrendPoint[] {
  const labels = weekLabels(WEEKS_IN_CHART);

  if (weeklyActivity?.length === DAYS_IN_CHART) {
    const weeks: number[] = [0, 0, 0, 0];
    for (let i = 0; i < DAYS_IN_CHART; i++) {
      const weekIdx = Math.floor(i / 7);
      weeks[weekIdx] += weeklyActivity[i] ?? 0;
    }
    return labels.map((label, i) => ({ label, value: weeks[i] }));
  }

  const weeks = Array(WEEKS_IN_CHART).fill(0);
  for (const s of sessionsInChartWindow(sessions)) {
    const weekIdx = chartWeekIndex(daysAgo(s.startedAt));
    if (weekIdx === null) continue;
    weeks[weekIdx] += s.correctCount + s.wrongCount;
  }

  return labels.map((label, i) => ({ label, value: weeks[i] }));
}

/** Total questions answered in the last 28 days. */
export function questionsInLast28Days(
  weeklyActivity: number[] | undefined,
  sessions: PracticeSessionView[]
): number {
  if (weeklyActivity?.length === DAYS_IN_CHART) {
    return weeklyActivity.reduce((sum, count) => sum + count, 0);
  }
  return sessionsInChartWindow(sessions).reduce(
    (sum, s) => sum + s.correctCount + s.wrongCount,
    0
  );
}

export function trendDeltaLabel(delta: number, unit: "percent" | "count"): string {
  const prefix = delta > 0 ? "+" : "";
  if (unit === "percent") return `${prefix}${delta} pts vs week 1`;
  return `${prefix}${delta} vs week 1`;
}

function weekLabels(n: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    labels.push(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  }
  return labels;
}

export function trendDelta(values: number[]): number {
  if (values.length < 2) return 0;
  return values[values.length - 1] - values[0];
}

export function potentialAccuracy(current: number, trend: number): number {
  return Math.min(99, Math.max(current, current + Math.max(8, Math.abs(trend) + 12)));
}

export function mistakeSegments(wrongs: WrongAttemptView[]): MistakeSegment[] {
  const palette = [
    { label: "Conceptual", color: "#e573ab" },
    { label: "Application", color: "#6495ed" },
    { label: "Calculation", color: "#f4a460" },
    { label: "Careless", color: "#7ccd7c" },
  ];
  const total = wrongs.length;
  if (total === 0) {
    return palette.map((p) => ({ ...p, count: 0, pct: 0 }));
  }

  const buckets = [0, 0, 0, 0];
  wrongs.forEach((w, i) => {
    const subj = w.subject.toLowerCase();
    if (subj.includes("phys")) buckets[2]++;
    else if (subj.includes("chem")) buckets[1]++;
    else if (i % 4 === 3) buckets[3]++;
    else buckets[0]++;
  });

  return palette.map((p, i) => ({
    label: p.label,
    color: p.color,
    count: buckets[i],
    pct: Math.round((buckets[i] / total) * 100),
  }));
}

export function overallAccuracy(progress: ProgressSummary | null): number {
  return progress?.accuracyPercent ?? 0;
}
