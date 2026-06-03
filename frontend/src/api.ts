const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export type PackSummary = {
  packId: string;
  exam: string;
  year: number;
  sourceFolder: string;
  questionCount: number;
  facets: {
    subjects?: { name: string; count: number }[];
    chapters?: { subject: string; chapter: string; count: number }[];
  };
};

export type QuestionPublic = {
  questionId: string;
  packId: string;
  questionNo: number;
  exam: string;
  year: number;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: number;
  hasSolution: boolean;
  answerOnly: boolean;
  questionImageUrl: string;
  solutionImageUrl: string;
  questionTextPreview: string;
};

export type QuestionDetail = QuestionPublic & {
  answer: string;
  subtopic: string;
  concepts: string[];
  hasDiagram: boolean;
  hasEquation: boolean;
  solutionTextPreview: string;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function fetchPacks() {
  return getJson<PackSummary[]>("/api/packs");
}

export function fetchPack(packId: string) {
  return getJson<PackSummary & { stats?: Record<string, unknown> }>(`/api/packs/${packId}`);
}

export function fetchQuestions(
  packId: string,
  params: { subject?: string; chapter?: string; page?: number; size?: number }
) {
  const q = new URLSearchParams({ packId });
  if (params.subject) q.set("subject", params.subject);
  if (params.chapter) q.set("chapter", params.chapter);
  if (params.page != null) q.set("page", String(params.page));
  if (params.size != null) q.set("size", String(params.size));
  return getJson<PageResponse<QuestionPublic>>(`/api/questions?${q}`);
}

export function fetchQuestion(questionId: string) {
  return getJson<QuestionDetail>(`/api/questions/${encodeURIComponent(questionId)}`);
}
