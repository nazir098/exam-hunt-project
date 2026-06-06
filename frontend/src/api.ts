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
  formulaRelevant: boolean;
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
  admin: boolean;
};

export type AdminActionResult = Record<string, unknown> & { message?: string };

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
  formulaRelevant: boolean;
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

export type ChapterProgress = {
  subject: string;
  chapter: string;
  attempts: number;
  correct: number;
  marks: number;
  accuracyPercent: number;
};

export type ProgressSummary = {
  totalAttempts: number;
  correctAttempts: number;
  accuracyPercent: number;
  recentSessions: PracticeSessionView[];
  byPack: { packId: string; attempts: number; correct: number; marks: number }[];
  weakChapters: ChapterProgress[];
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  totalMarks: number;
  attempts: number;
  correct: number;
  accuracyPercent: number;
  you: boolean;
};

export type LeaderboardPeriod = "weekly" | "monthly" | "all";

export type LeaderboardStats = {
  scholarsInPeriod: number;
  totalMarks: number;
  totalAttempts: number;
  totalCorrect: number;
  avgAccuracyPercent: number;
  allTimeScholars: number;
  allTimeAttempts: number;
  questionBankSize: number;
  weeklyChallengeTarget: number;
};

export type LeaderboardActivityItem = {
  displayName: string;
  correct: boolean;
  marksAwarded: number;
  relativeTime: string;
};

export type LeaderboardResponse = {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  you: LeaderboardEntry | null;
  totalPlayers: number;
  stats?: LeaderboardStats;
  recentActivity?: LeaderboardActivityItem[];
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
    const body = err as { message?: string; error?: string };
    const msg = body.message || body.error;
    throw new Error(msg || formatHttpError(res.status, res.statusText, path));
  }
  return res.json() as Promise<T>;
}

function formatHttpError(status: number, statusText: string, path: string): string {
  if (status === 404 && path.startsWith("/api/auth")) {
    return "Auth API not found — restart the backend (mvn spring-boot:run in backend/).";
  }
  if (status === 401) {
    return "Please sign in again.";
  }
  if (status === 403) {
    if (path.startsWith("/api/practice") || path.startsWith("/api/auth/me")) {
      return "Please sign in to use Practice and saved progress.";
    }
    return "Access denied. If developing locally, use npm run dev (Vite proxy) and avoid VITE_API_BASE_URL_FORCE unless needed.";
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
  params: { subject?: string; chapter?: string; q?: string; page?: number; size?: number }
) {
  const q = new URLSearchParams({ packId });
  if (params.subject) q.set("subject", params.subject);
  if (params.chapter) q.set("chapter", params.chapter);
  if (params.q) q.set("q", params.q);
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

export type ImportFolderOption = {
  folderName: string;
  packId: string;
  exam: string;
  year: number;
  questionCount: number;
};

export function fetchAdminImportFolders() {
  return request<{ folders: ImportFolderOption[]; count: number }>("/api/admin/import/folders");
}

export function adminImportNeet() {
  return request<AdminActionResult>("/api/admin/import/neet", { method: "POST" });
}

export function adminImportAll() {
  return request<AdminActionResult>("/api/admin/import/all", { method: "POST" });
}

export function adminImportFolder(folderName: string) {
  return request<AdminActionResult>(`/api/admin/import/folder/${encodeURIComponent(folderName)}`, {
    method: "POST",
  });
}

export function adminCleanupDemoPacks() {
  return request<AdminActionResult>("/api/admin/seed/cleanup-demo", { method: "POST" });
}

export function adminSeedLeaderboardDemo(force = false) {
  const q = force ? "?force=true" : "";
  return request<AdminActionResult>(`/api/admin/seed/leaderboard-demo${q}`, { method: "POST" });
}

export function adminCleanupLeaderboardDemo() {
  return request<AdminActionResult>("/api/admin/seed/cleanup-leaderboard-demo", { method: "POST" });
}

export function createPracticeSession(body: {
  exam: string;
  packId: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  adaptive: boolean;
  /** When set, practice session begins on this PYQ (e.g. from question bank). */
  startQuestionId?: string;
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
  return request<ProgressSummary>("/api/practice/progress").then((p) => ({
    ...p,
    weakChapters: p.weakChapters ?? [],
  }));
}

export function fetchLeaderboard(limit = 50, period: LeaderboardPeriod = "weekly") {
  return getJson<LeaderboardResponse>(`/api/leaderboard?limit=${limit}&period=${period}`);
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

export type PublicPlatformSettings = {
  marketingPyqFloor: number;
  displayTotalQuestions: number | null;
  displayChapters: number | null;
  bankSearchSuggestions: string[];
  learningInsightText: string;
  learningInsightHighlight: string;
  aiTutorMockEnabled: boolean;
  aiTutorWelcome: string;
  bookmarksEnabled: boolean;
  aiSuggestEnabled: boolean;
  aiLlmConfigured: boolean;
};

export type PracticeAiFeature =
  | "why_wrong"
  | "hint"
  | "formula"
  | "explain_basics"
  | "weak_chapter_analysis"
  | "practice_from_weak"
  | "revision_notes"
  | "mentor"
  | "similar_questions";

export type PracticeAiSimilarQuestion = {
  questionId: string;
  questionNo: number;
  subject: string;
  chapter: string;
  topic: string;
  questionTextPreview: string;
};

export type PracticeAiAssistResponse = {
  feature: PracticeAiFeature;
  text: string;
  llm: boolean;
  similarQuestions: PracticeAiSimilarQuestion[];
  actionUrl: string | null;
  /** Three progressive hints (hint feature only) */
  hintSteps?: string[];
};

export type PracticeAiStatus = {
  available: boolean;
  llmConfigured: boolean;
  platformEnabled: boolean;
  serverEnabled: boolean;
};

export type AdminPlatformSettings = {
  publicSettings: PublicPlatformSettings;
  aiTutorFallbackReplies: string[];
  aiTutorKeywordReplies: Record<string, string>;
};

export function fetchPublicSettings() {
  return getJson<PublicPlatformSettings>("/api/settings/public");
}

export function fetchAdminSettings() {
  return request<AdminPlatformSettings>("/api/admin/settings");
}

export function updateAdminSettings(body: Partial<{
  marketingPyqFloor: number;
  displayTotalQuestions: number | null;
  displayChapters: number | null;
  bankSearchSuggestions: string[];
  learningInsightText: string;
  learningInsightHighlight: string;
  aiTutorMockEnabled: boolean;
  aiTutorWelcome: string;
  aiTutorFallbackReplies: string[];
  aiTutorKeywordReplies: Record<string, string>;
  bookmarksEnabled: boolean;
  aiSuggestEnabled: boolean;
}>) {
  return request<AdminPlatformSettings>("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export type BookmarkItem = {
  questionId: string;
  packId: string;
  questionNo: number;
  exam: string;
  year: number;
  subject: string;
  chapter: string;
  topic: string;
  questionTextPreview: string;
  note: string | null;
  savedAt: string;
};

export function fetchBookmarks() {
  return request<BookmarkItem[]>("/api/bookmarks");
}

export function fetchBookmarkStatus(questionId: string) {
  return request<{ questionId: string; saved: boolean }>(
    `/api/bookmarks/${encodeURIComponent(questionId)}/status`
  );
}

export function toggleBookmark(questionId: string, note?: string) {
  return request<{ questionId: string; saved: boolean; note: string | null; totalBookmarks: number }>(
    `/api/bookmarks/${encodeURIComponent(questionId)}/toggle`,
    { method: "POST", body: JSON.stringify(note ? { note } : {}) }
  );
}

export function searchQuestions(params: {
  q: string;
  exam?: string;
  packId?: string;
  page?: number;
  size?: number;
}) {
  const qs = new URLSearchParams({ q: params.q });
  if (params.exam) qs.set("exam", params.exam);
  if (params.packId) qs.set("packId", params.packId);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.size != null) qs.set("size", String(params.size));
  return getJson<PageResponse<QuestionPublic>>(`/api/questions/search?${qs}`);
}

export function fetchPracticeAiStatus() {
  return getJson<PracticeAiStatus>("/api/practice-ai/status");
}

export function practiceAiAssist(body: {
  feature: PracticeAiFeature;
  questionId?: string;
  selectedAnswer?: string;
}) {
  return request<PracticeAiAssistResponse>("/api/practice-ai/assist", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** @deprecated Use practiceAiAssist — AI tutor chat removed */
export function aiTutorChat(body: { message: string; questionId?: string; context?: string }) {
  return request<{ reply: string; source: string; mock: boolean }>("/api/ai-tutor/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** @deprecated Use practiceAiAssist with feature hint | explain_basics */
export function aiTutorHint(body: { mode: string; questionId?: string }) {
  return request<{ text: string; mode: string }>("/api/ai-tutor/hint", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function adminSeedSampleBookmarks(limit = 8) {
  return request<AdminActionResult>(`/api/admin/bookmarks/seed-sample?limit=${limit}`, {
    method: "POST",
  });
}

export function adminClearMyBookmarks() {
  return request<AdminActionResult>("/api/admin/bookmarks/clear-mine", { method: "POST" });
}
