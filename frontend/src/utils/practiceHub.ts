import type { PackSummary, PracticeSessionView, ProgressSummary } from "../api";
import { meaningfulSessions } from "./dashboardStats";
import { primaryWeakChapter } from "./weakChapters";

export const DAILY_GOAL_QUESTIONS = 20;

export function pickDefaultPack(packs: PackSummary[]): PackSummary | null {
  if (!packs.length) return null;
  const y2025 = packs.find((p) => p.year === 2025);
  return y2025 ?? [...packs].sort((a, b) => b.year - a.year)[0];
}

export function pickPackByYear(packs: PackSummary[], year: number): PackSummary | null {
  return packs.find((p) => p.year === year) ?? pickDefaultPack(packs);
}

export function activeSession(progress: ProgressSummary | null): PracticeSessionView | null {
  const sessions = meaningfulSessions(progress?.recentSessions ?? []);
  return sessions.find((s) => s.status === "active" && s.currentQuestionId) ?? null;
}

export function sessionResumeUrl(s: PracticeSessionView): string | null {
  if (s.status === "active" && s.currentQuestionId) {
    return `/practice/${s.id}/${s.currentQuestionId}`;
  }
  return null;
}

export function formatPackLabel(packId: string): string {
  return packId.replace("NEET_", "NEET ");
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
  return sessions
    .filter((s) => s.startedAt.startsWith(today))
    .reduce((sum, s) => sum + s.correctCount + s.wrongCount, 0);
}

export type RecommendedPractice = {
  title: string;
  subtitle: string;
  cta: string;
  packId: string;
  subject?: string;
  chapter?: string;
  adaptive: boolean;
};

export function buildRecommendedPractice(
  packs: PackSummary[],
  progress: ProgressSummary | null
): RecommendedPractice | null {
  const pack = pickDefaultPack(packs);
  if (!pack) return null;
  const weak = primaryWeakChapter(progress?.weakChapters);
  if (weak) {
    return {
      title: `Drill ${weak.chapter}`,
      subtitle: `${weak.subject} · ${weak.accuracyPercent}% accuracy — adaptive session on your weakest chapter`,
      cta: "Start recommended session",
      packId: pack.packId,
      subject: weak.subject,
      chapter: weak.chapter,
      adaptive: true,
    };
  }
  return {
    title: "Adaptive NEET refresh",
    subtitle: "20 questions, difficulty adjusts after each answer — best daily warm-up",
    cta: "Start recommended session",
    packId: pack.packId,
    adaptive: true,
  };
}
