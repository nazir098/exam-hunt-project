import type { ChapterProgress, PackSummary, PracticeSessionView, ProgressSummary } from "../api";
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
  chapter?: string
): number {
  if (!pack) return MAX_PRACTICE_QUESTIONS;
  if (subject && chapter && pack.facets?.chapters) {
    const ch = pack.facets.chapters.find((c) => c.subject === subject && c.chapter === chapter);
    if (ch?.count) return ch.count;
  }
  if (subject && pack.facets?.subjects) {
    const sub = pack.facets.subjects.find((s) => s.name === subject);
    if (sub?.count) return sub.count;
  }
  return pack.questionCount;
}

export function estimatedDrillMinutes(questions = FOCUSED_DRILL_QUESTIONS): number {
  return Math.max(5, Math.round(questions * 0.8));
}

/** Timed test estimate — roughly one minute per question. */
export function estimatedTestMinutes(questions: number): number {
  return Math.max(15, Math.round(questions));
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
