import type { PackSummary, PracticeSessionView, ProgressSummary } from "../api";
import { meaningfulSessions } from "./dashboardStats";
import { primaryWeakChapter } from "./weakChapters";

export const DAILY_GOAL_QUESTIONS = 20;

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
    return `/practice/${s.id}/${s.currentQuestionId}`;
  }
  return null;
}

export function formatPackLabel(packId: string): string {
  return packId.replace("NEET_", "NEET ");
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
