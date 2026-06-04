import { touchSessionActivity } from "./auth/session";
import { getToken } from "./auth/storage";

/** In dev, use Vite proxy (same origin) unless VITE_API_BASE_URL_FORCE is set. */
function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL || "";
  if (import.meta.env.DEV && import.meta.env.VITE_API_BASE_URL_FORCE !== "true") {
    return "";
  }
  return configured;
}

const API_BASE = resolveApiBase();

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

export type YearCatalogEntry = {
  year: number;
  status: "available" | "coming_soon";
  packId: string | null;
  questionCount: number;
  message: string | null;
};

export type ExamCatalogEntry = {
  id: string;
  name: string;
  status: "available" | "coming_soon";
  description: string;
  totalQuestions: number;
  availableYears: number;
  years: YearCatalogEntry[];
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
};

export type AuthResult = {
  token: string;
  user: UserProfile;
};

export type PracticeSessionView = {
  id: string;
  packId: string;
  exam: string;
  status: string;
  questionCount: number;
  currentIndex: number;
  correctCount: number;
  wrongCount: number;
  totalMarks: number;
  maxMarks: number;
  adaptiveLevel: number;
  startedAt: string;
  completedAt: string | null;
  currentQuestionId: string | null;
};

export type PracticeQuestion = {
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
  questionImageUrl: string;
  questionTextPreview: string;
};

export type SubmitResult = {
  correct: boolean;
  correctAnswer: string;
  marksAwarded: number;
  sessionTotalMarks: number;
  sessionMaxMarks: number;
  correctCount: number;
  wrongCount: number;
  adaptiveLevel: number;
  sessionStatus: string;
  nextQuestionId: string | null;
  solutionImageUrl: string;
  hasSolution: boolean;
};

export type ProgressSummary = {
  totalAttempts: number;
  correctAttempts: number;
  accuracyPercent: number;
  recentSessions: PracticeSessionView[];
  byPack: { packId: string; attempts: number; correct: number; marks: number }[];
};

export type RatingView = {
  yourScore: number;
  yourVotes: number;
  comment: string | null;
  aggregate: { count: number; average: number };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    touchSessionActivity();
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { message?: string }).message;
    throw new Error(msg || formatHttpError(res.status, res.statusText, path));
  }
  return res.json() as Promise<T>;
}

function formatHttpError(status: number, statusText: string, path: string): string {
  if (status === 404 && path.startsWith("/api/auth")) {
    return "Auth API not found — restart the backend (mvn spring-boot:run in backend/).";
  }
  if (status === 403) {
    return "Forbidden — restart the backend after pulling latest code, or use Vite dev server without VITE_API_BASE_URL_FORCE.";
  }
  return statusText || `HTTP ${status}`;
}

async function getJson<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function fetchPacks() {
  return getJson<PackSummary[]>("/api/packs");
}

export function fetchExams() {
  return getJson<ExamCatalogEntry[]>("/api/exams");
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

async function authRequest<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { message?: string }).message;
    throw new Error(msg || formatHttpError(res.status, res.statusText, path));
  }
  return res.json() as Promise<T>;
}

export function register(email: string, password: string, displayName?: string) {
  return authRequest<AuthResult>("/api/auth/register", { email, password, displayName });
}

export function login(email: string, password: string) {
  return authRequest<AuthResult>("/api/auth/login", { email, password });
}

export function fetchMe() {
  return request<UserProfile>("/api/auth/me");
}

export function createPracticeSession(body: {
  exam: string;
  packId: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  adaptive: boolean;
}) {
  return request<PracticeSessionView>("/api/practice/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchPracticeSession(sessionId: string) {
  return request<PracticeSessionView>(`/api/practice/sessions/${encodeURIComponent(sessionId)}`);
}

export function fetchPracticeQuestion(questionId: string) {
  return request<PracticeQuestion>(
    `/api/practice/questions/${encodeURIComponent(questionId)}`
  );
}

export function submitPracticeAnswer(body: {
  sessionId: string;
  questionId: string;
  selectedAnswer: string;
}) {
  return request<SubmitResult>("/api/practice/submit", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchProgress() {
  return request<ProgressSummary>("/api/practice/progress");
}

export function rateQuestion(questionId: string, score: number, comment?: string) {
  return request<RatingView>(`/api/practice/questions/${encodeURIComponent(questionId)}/rating`, {
    method: "PUT",
    body: JSON.stringify({ score, comment }),
  });
}

export function fetchQuestionRating(questionId: string) {
  return request<RatingView>(
    `/api/practice/questions/${encodeURIComponent(questionId)}/rating`
  );
}
