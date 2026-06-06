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
  return `/bank?${params.toString()}`;
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
