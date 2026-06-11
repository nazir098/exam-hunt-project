import type {
  ChapterProgress,
  PackSummary,
  PracticeSessionView,
  ProgressSummary,
  QuestionSetMode,
} from "../api";
import { sessionRoute } from "../navigation/modes";
import { meaningfulSessions } from "./dashboardStats";
import { primaryWeakChapter } from "./weakChapters";

export const DAILY_GOAL_QUESTIONS = 20;
export const DEFAULT_PRACTICE_QUESTIONS = 20;
export const MIN_PRACTICE_QUESTIONS = 5;
export const MAX_PRACTICE_QUESTIONS = 180;
export const FOCUSED_DRILL_QUESTIONS = 10;

export function clampPracticeQuestionCount(value: number, poolMax?: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_PRACTICE_QUESTIONS;
  let clamped = Math.min(MAX_PRACTICE_QUESTIONS, Math.max(MIN_PRACTICE_QUESTIONS, n));
  if (poolMax != null && poolMax > 0) clamped = Math.min(clamped, poolMax);
  return clamped;
}

export function practicePoolMax(
  pack: PackSummary | null | undefined,
  subject?: string,
  chapter?: string,
  questionSet: QuestionSetMode = "pyq"
): number {
  if (!pack) return MAX_PRACTICE_QUESTIONS;
  const variantTotal = pack.facets?.variant_count ?? 0;
  let pyqMax = pack.questionCount;
  if (subject && chapter && pack.facets?.chapters) {
    const ch = pack.facets.chapters.find((c) => c.subject === subject && c.chapter === chapter);
    if (ch?.count) pyqMax = ch.count;
  } else if (subject && pack.facets?.subjects) {
    const sub = pack.facets.subjects.find((s) => s.name === subject);
    if (sub?.count) pyqMax = sub.count;
  }
  if (questionSet === "variants") {
    if (variantTotal > 0) return variantTotal;
    return Math.min(MAX_PRACTICE_QUESTIONS, pyqMax * 3);
  }
  if (questionSet === "all") {
    return pyqMax + (variantTotal > 0 ? variantTotal : 0);
  }
  return pyqMax;
}

export function estimatedDrillMinutes(questions = FOCUSED_DRILL_QUESTIONS): number {
  return Math.max(5, Math.round(questions * 0.8));
}

/** NEET per-question pacing for test creation (seconds). */
export const TEST_QUESTION_SECONDS = {
  Biology: 40,
  Chemistry: 55,
  Physics: 60,
} as const;

/** Full NEET marks share per subject (used for mixed-paper allocation). */
export const NEET_SUBJECT_MARKS = {
  Physics: 180,
  Chemistry: 180,
  Biology: 360,
} as const;

export type NeetTestSubject = keyof typeof TEST_QUESTION_SECONDS;

const MIXED_TEST_SECONDS = Math.max(
  TEST_QUESTION_SECONDS.Biology,
  TEST_QUESTION_SECONDS.Chemistry,
  TEST_QUESTION_SECONDS.Physics
);

/** Map pack facet / filter subject to NEET pacing bucket. */
export function normalizeNeetTestSubject(subject?: string): NeetTestSubject | null {
  const s = subject?.trim().toLowerCase() ?? "";
  if (!s) return null;
  if (s.startsWith("phys")) return "Physics";
  if (s.startsWith("chem")) return "Chemistry";
  if (s.startsWith("bio") || s === "botany" || s === "zoology") return "Biology";
  return null;
}

/**
 * Seconds allowed per question when building a timed test.
 * Single subject → Bio 40s, Chem 55s, Phy 60s.
 * Mixed / all subjects → max among subjects with marks allocated in NEET (Phy/Chem/Bio).
 */
export function testSecondsPerQuestion(subject?: string): number {
  const bucket = normalizeNeetTestSubject(subject);
  if (!bucket) return MIXED_TEST_SECONDS;
  return TEST_QUESTION_SECONDS[bucket];
}

export function estimatedTestSeconds(questions: number, subject?: string): number {
  return Math.max(60, Math.round(questions * testSecondsPerQuestion(subject)));
}

/** Timed test estimate from NEET subject pacing. */
export function estimatedTestMinutes(questions: number, subject?: string): number {
  return Math.max(1, Math.round(estimatedTestSeconds(questions, subject) / 60));
}

/** Short label for the builder meta line. */
export function testTimingLabel(subject?: string): string {
  const bucket = normalizeNeetTestSubject(subject);
  if (!bucket) return `${MIXED_TEST_SECONDS}s per question (mixed max)`;
  return `${TEST_QUESTION_SECONDS[bucket]}s per question (${bucket})`;
}

export function formatRecommendedPracticeSubtitle(
  subject: string,
  accuracyPercent: number
): string {
  return `${subject} · ${accuracyPercent}% accuracy · ${FOCUSED_DRILL_QUESTIONS} questions · ~${estimatedDrillMinutes()} min`;
}

export function pickDefaultPack(packs: PackSummary[]): PackSummary | null {
  const eligible = bankDisplayPacks(packs);
  if (!eligible.length) return null;
  const y2025 = eligible.find((p) => p.year === 2025);
  return y2025 ?? [...eligible].sort((a, b) => b.year - a.year)[0];
}

export function pickPackByYear(packs: PackSummary[], year: number): PackSummary | null {
  const eligible = bankDisplayPacks(packs);
  return eligible.find((p) => p.year === year) ?? pickDefaultPack(eligible);
}

export function activeSession(progress: ProgressSummary | null): PracticeSessionView | null {
  const sessions = meaningfulSessions(progress?.recentSessions ?? []);
  return sessions.find((s) => s.status === "active" && s.currentQuestionId) ?? null;
}

export function sessionResumeUrl(s: PracticeSessionView): string | null {
  if (s.status === "active" && s.currentQuestionId) {
    const mode = s.mode === "test" ? "test" : "practice";
    return sessionRoute(mode, s.id, s.currentQuestionId);
  }
  return null;
}

/** Practice-only sessions (leaderboard / daily goal / streak). */
export function rankedPracticeSessions(sessions: PracticeSessionView[]): PracticeSessionView[] {
  return meaningfulSessions(sessions).filter((s) => !s.mode || s.mode === "practice");
}

export function formatPackLabel(packId: string): string {
  return packId.replace("NEET_", "NEET ");
}

/** Display title for resume cards, e.g. "NEET 2016 Practice Set". */
export function sessionPackTitle(packId: string, packs: PackSummary[]): string {
  const pack = packs.find((p) => p.packId === packId);
  if (pack) return `NEET ${pack.year} Practice Set`;
  return `${formatPackLabel(packId)} Practice Set`;
}

export function sessionFocusLine(session: PracticeSessionView): string | null {
  const parts = [
    session.filterSubject?.trim(),
    session.filterChapter?.trim() || session.filterTopic?.trim(),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Most recent test session (completed or in progress with answers). */
export function lastTestSession(sessions: PracticeSessionView[]): PracticeSessionView | null {
  return recentTestSessions(sessions, 1)[0] ?? null;
}

export function recentTestSessions(
  sessions: PracticeSessionView[],
  limit = 4
): PracticeSessionView[] {
  return sessions
    .filter(
      (s) =>
        s.mode === "test" &&
        (s.status === "completed" || sessionAnsweredCount(s) > 0 || (s.skipCount ?? 0) > 0)
    )
    .slice(0, limit);
}

export function formatTestSessionScope(session: PracticeSessionView, packs: PackSummary[]): string {
  const pack = packs.find((p) => p.packId === session.packId);
  const packLabel = pack ? `NEET ${pack.year}` : formatPackLabel(session.packId);
  const focus = sessionFocusLine(session);
  if (focus) return `${packLabel} · ${focus}`;
  return `${packLabel} · All subjects`;
}

export function formatTestSessionWhen(session: PracticeSessionView): string {
  const iso = session.completedAt ?? session.startedAt;
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Modern date chip: "Today" / "Yesterday" / "Mon, Jun 8" plus time when available. */
export function formatTestSessionDateModern(session: PracticeSessionView): {
  dateLabel: string;
  timeLabel: string | null;
} {
  const iso = session.completedAt ?? session.startedAt;
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / 86400000);

  let dateLabel: string;
  if (dayDiff === 0) dateLabel = "Today";
  else if (dayDiff === 1) dateLabel = "Yesterday";
  else if (dayDiff < 7 && dayDiff > 0) {
    dateLabel = d.toLocaleDateString(undefined, { weekday: "short" });
  } else {
    dateLabel = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const timeLabel = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return { dateLabel, timeLabel };
}

export function formatSessionDuration(session: PracticeSessionView): string | null {
  if (!session.completedAt) return null;
  const seconds = Math.max(
    0,
    Math.round(
      (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
    )
  );
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

export function sessionAnsweredCount(session: PracticeSessionView): number {
  return session.correctCount + session.wrongCount;
}

export function sessionProgressPercent(session: PracticeSessionView): number {
  if (session.questionCount <= 0) return 0;
  return Math.round((sessionAnsweredCount(session) / session.questionCount) * 100);
}

export function resumePrimaryLabel(session: PracticeSessionView, packTitle: string): string {
  const questionNo = session.currentIndex + 1;
  if (questionNo > 0 && session.questionCount > 0) {
    return `Resume from Question ${questionNo} →`;
  }
  return `Continue ${packTitle} →`;
}

/** Hide legacy demo placeholder packs from the question bank picker. */
export function bankDisplayPacks(packs: PackSummary[]): PackSummary[] {
  return packs.filter((p) => !p.packId.startsWith("DEMO_"));
}

function sourceFolderIsDistinct(folder: string, pack: Pick<PackSummary, "packId" | "year">): boolean {
  const f = folder.trim();
  if (!f) return false;
  if (f.startsWith("DEMO")) return false;
  const compactFolder = f.replace(/\s+/g, "").toLowerCase();
  if (compactFolder === String(pack.year)) return false;
  if (compactFolder === pack.packId.replace(/_/g, "").toLowerCase()) return false;
  if (f.toLowerCase() === pack.packId.toLowerCase()) return false;
  return true;
}

/** Paper / pack dropdown label — shows extractor folder when it is not just the year slug. */
export function formatPackOptionLabel(
  pack: Pick<PackSummary, "packId" | "year" | "questionCount" | "sourceFolder">
): string {
  const yearPart = `NEET ${pack.year}`;
  const count = `(${pack.questionCount} questions)`;
  const folder = pack.sourceFolder?.trim() ?? "";
  if (sourceFolderIsDistinct(folder, pack)) {
    return `${folder} — ${yearPart} ${count}`;
  }
  return `${yearPart} ${count}`;
}

/** Match facet subject name (e.g. PHYSICS vs Physics). */
export function resolveSubjectName(pack: PackSummary | null | undefined, hint: string): string {
  const subjects = pack?.facets?.subjects;
  if (!subjects?.length) return hint;
  const lower = hint.toLowerCase();
  const match = subjects.find(
    (s) => s.name.toLowerCase() === lower || s.name.toLowerCase().startsWith(lower)
  );
  return match?.name ?? hint;
}

export function todayQuestionsAnswered(sessions: PracticeSessionView[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return rankedPracticeSessions(sessions)
    .filter((s) => s.startedAt.startsWith(today))
    .reduce((sum, s) => sum + s.correctCount + s.wrongCount, 0);
}

export type RecommendedPractice = {
  kind: "weak_chapter" | "general";
  packId: string;
  subject?: string;
  chapter?: string;
  adaptive: boolean;
  questionCount: number;
  reasonLabel: string;
  chapterTitle: string;
  accuracyPercent: number;
  attempts: number;
  lastPracticedLabel: string;
  attentionLabel: string;
  benefitLabel: string;
  benefitDetail: string;
  sessionPreview: string[];
  ctaLabel: string;
};

function subjectAccuracyFor(
  weakChapters: ChapterProgress[] | undefined,
  subject: string
): number {
  const rows = (weakChapters ?? []).filter((c) => c.subject === subject);
  const attempts = rows.reduce((sum, c) => sum + c.attempts, 0);
  const correct = rows.reduce((sum, c) => sum + c.correct, 0);
  if (!attempts) return 0;
  return Math.round((correct / attempts) * 100);
}

function daysSinceChapterPractice(
  sessions: PracticeSessionView[],
  subject: string,
  chapter: string
): number | null {
  const match = [...sessions]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .find((s) => s.filterSubject === subject && s.filterChapter === chapter);
  if (!match) return null;
  const then = new Date(match.startedAt).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function formatLastPracticed(days: number | null, attempts: number): string {
  if (attempts <= 0) return "Not practiced yet";
  if (days == null) return "Not recently practiced";
  if (days === 0) return "Last practiced today";
  if (days === 1) return "Last practiced yesterday";
  return `Last practiced ${days} days ago`;
}

function estimatedMarksGain(accuracyPercent: number, questionCount: number): { low: number; high: number } {
  const gap = Math.max(0, 100 - accuracyPercent) / 100;
  const low = Math.max(4, Math.round(questionCount * gap * 0.8));
  const high = Math.max(low + 3, Math.round(questionCount * gap * 1.15));
  return { low, high };
}

function projectedSubjectAccuracy(current: number, chapterAccuracy: number): number {
  const lift = Math.max(3, Math.round((100 - chapterAccuracy) * 0.08));
  return Math.min(99, current + lift);
}

export function buildRecommendedPractice(
  packs: PackSummary[],
  progress: ProgressSummary | null
): RecommendedPractice | null {
  const pack = pickDefaultPack(packs);
  if (!pack) return null;

  const sessions = meaningfulSessions(progress?.recentSessions ?? []);
  const weak = primaryWeakChapter(progress?.weakChapters);
  const questionCount = FOCUSED_DRILL_QUESTIONS;
  const minutes = estimatedDrillMinutes(questionCount);

  if (weak) {
    const subjectAcc = subjectAccuracyFor(progress?.weakChapters, weak.subject);
    const days = daysSinceChapterPractice(sessions, weak.subject, weak.chapter);
    const marks = estimatedMarksGain(weak.accuracyPercent, questionCount);
    const projected = projectedSubjectAccuracy(subjectAcc, weak.accuracyPercent);
    const benefitDetail =
      subjectAcc > 0 && projected > subjectAcc
        ? `Improve ${weak.subject} accuracy from ${subjectAcc}% → ${projected}%`
        : `Estimated gain: +${marks.low}–${marks.high} marks if mastered`;

    return {
      kind: "weak_chapter",
      packId: pack.packId,
      subject: weak.subject,
      chapter: weak.chapter,
      adaptive: true,
      questionCount,
      reasonLabel: "Weakest chapter",
      chapterTitle: weak.chapter,
      accuracyPercent: weak.accuracyPercent,
      attempts: weak.attempts,
      lastPracticedLabel: formatLastPracticed(days, weak.attempts),
      attentionLabel: weak.accuracyPercent < 40 ? "Needs attention" : "Worth a refresh",
      benefitLabel: "Estimated gain",
      benefitDetail,
      sessionPreview: [
        `${questionCount} Questions`,
        `~${minutes} Minutes`,
        "Adaptive Difficulty",
      ],
      ctaLabel: `Practice ${weak.chapter}`,
    };
  }

  return {
    kind: "general",
    packId: pack.packId,
    adaptive: true,
    questionCount: DEFAULT_PRACTICE_QUESTIONS,
    reasonLabel: "Smart refresh",
    chapterTitle: "Adaptive NEET mix",
    accuracyPercent: progress?.accuracyPercent ?? 0,
    attempts: progress?.totalAttempts ?? 0,
    lastPracticedLabel:
      sessions.length > 0 ? "Based on your recent sessions" : "Start building your baseline",
    attentionLabel: "Stay exam-ready",
    benefitLabel: "Why now",
    benefitDetail: "Keeps timing, accuracy, and rank momentum on track",
    sessionPreview: [
      `${DEFAULT_PRACTICE_QUESTIONS} Questions`,
      `~${estimatedDrillMinutes(DEFAULT_PRACTICE_QUESTIONS)} Minutes`,
      "Adaptive Difficulty",
    ],
    ctaLabel: "Start adaptive practice",
  };
}
