import type { PracticeSessionView } from "../api";

export type RecentPracticeChapter = {
  subject: string;
  chapter: string;
};

/** Unique chapters from recent sessions (most recent first). */
export function recentPracticeChapters(
  sessions: PracticeSessionView[],
  limit = 4
): RecentPracticeChapter[] {
  const seen = new Set<string>();
  const out: RecentPracticeChapter[] = [];
  for (const s of sessions) {
    const subj = s.filterSubject?.trim();
    const ch = s.filterChapter?.trim();
    if (!subj || !ch) continue;
    const key = `${subj}::${ch}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ subject: subj, chapter: ch });
    if (out.length >= limit) break;
  }
  return out;
}
