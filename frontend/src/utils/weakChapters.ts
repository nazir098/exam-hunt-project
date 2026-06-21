import type { ChapterProgress } from "../api";

/** Primary weak chapter from API progress (sorted weakest first on backend). */
export function primaryWeakChapter(
  weakChapters: ChapterProgress[] | undefined
): ChapterProgress | null {
  if (!weakChapters?.length) return null;
  return weakChapters[0];
}

export function weakChapterBankUrl(chapter: ChapterProgress): string {
  const params = new URLSearchParams({
    exam: "NEET",
    subject: chapter.subject,
    chapter: chapter.chapter,
  });
  return `/practice?${params.toString()}#question-bank`;
}

export function weakChapterPracticeUrl(chapter: ChapterProgress, packId?: string): string {
  const params = new URLSearchParams({
    exam: "NEET",
    subject: chapter.subject,
    chapter: chapter.chapter,
  });
  if (packId) params.set("packId", packId);
  return `/practice?${params.toString()}`;
}

export function formatWeakChapterDesc(chapter: ChapterProgress): string {
  return `${chapter.subject} · ${chapter.chapter} — ${chapter.accuracyPercent}% accuracy (${chapter.attempts} attempts, ${chapter.marks} marks)`;
}

export function formatWeakChapterTooltip(chapter: ChapterProgress): string {
  const wrong = Math.max(0, chapter.attempts - chapter.correct);
  return `${chapter.accuracyPercent}% accuracy · ${chapter.attempts} attempts (${chapter.correct} correct, ${wrong} wrong) · ${chapter.marks} marks scored · Opens filtered PYQs`;
}
