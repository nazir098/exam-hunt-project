import { QuestionPublic } from "../api";
import { difficultyLabel } from "./labels";

export function filterQuestionsForPractice(
  questions: QuestionPublic[],
  params: {
    topic?: string;
    difficulty?: string;
    q?: string;
  }
): QuestionPublic[] {
  let list = questions;
  if (params.topic) list = list.filter((q) => q.topic === params.topic);
  if (params.difficulty) {
    list = list.filter((q) => difficultyLabel(q.difficulty) === params.difficulty);
  }
  const qSearch = (params.q || "").toLowerCase();
  if (qSearch) {
    list = list.filter(
      (q) =>
        q.topic?.toLowerCase().includes(qSearch) ||
        q.chapter?.toLowerCase().includes(qSearch) ||
        q.subject?.toLowerCase().includes(qSearch) ||
        q.questionTextPreview?.toLowerCase().includes(qSearch)
    );
  }
  return list;
}

export function browsePathFromPack(packId: string, search: string): string {
  const qs = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  return `/pack/${packId}${qs}`;
}

/** Client-side filters applied after fetching the pack list (topic, difficulty, text search). */
export function hasActiveBankClientFilters(params: {
  get: (key: string) => string | null;
}): boolean {
  return Boolean(
    params.get("topic")?.trim() ||
      params.get("difficulty")?.trim() ||
      params.get("q")?.trim()
  );
}

export function bankApiFilters(params: { get: (key: string) => string | null }) {
  const subject = params.get("subject")?.trim();
  const chapter = params.get("chapter")?.trim();
  return {
    subject: subject || undefined,
    chapter: chapter || undefined,
  };
}
