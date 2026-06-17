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
    variant_count?: number;
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
  options?: McqOptionView[];
  sourceType?: "pyq" | "ai_variant" | string;
  parentQuestionId?: string | null;
  variantNo?: number;
  variantType?: string | null;
  questionFormat?: string;
  assertion?: string;
  reason?: string;
  statements?: McqOptionView[];
  matchListA?: McqOptionView[];
  matchListB?: McqOptionView[];
  hasDiagram?: boolean;
  questionDiagramSvg?: string;
  solutionDiagramSvg?: string;
};

export type McqOptionView = {
  id: string;
  text: string;
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

export type SessionQuestionTile = {
  number: number;
  questionId: string;
  status: "current" | "correct" | "wrong" | "skipped" | "marked" | "unattempted";
  /** Official NEET paper question number (1–180). */
  questionNo?: number;
  variantNo?: number;
  sourceType?: string;
};

export type QuestionVariantRef = {
  questionId: string;
  variantNo: number;
  variantType?: string | null;
  difficulty: number;
  hasSolution: boolean;
  questionTextPreview: string;
};

export type QuestionFamily = {
  parentQuestionId: string;
  paperQuestionNo: number;
  activeQuestionId: string;
  pyq: QuestionPublic;
  variants: QuestionVariantRef[];
};

export type QuestionSetMode = "pyq" | "variants" | "all";

export type PracticeSessionView = {
  id: string;
  packId: string;
  exam: string;
  mode?: "practice" | "test";
  status: string;
  questionCount: number;
  currentIndex: number;
  correctCount: number;
  wrongCount: number;
  skipCount: number;
  totalMarks: number;
  maxMarks: number;
  adaptiveLevel: number;
  startedAt: string;
  completedAt: string | null;
  currentQuestionId: string | null;
  filterSubject?: string;
  filterChapter?: string;
  filterTopic?: string;
  markedForReviewIds?: string[];
  questionTiles?: SessionQuestionTile[];
};

export type WrongAttemptView = {
  attemptId: string;
  questionId: string;
  sessionId: string;
  packId: string;
  mode: string;
  selectedAnswer: string;
  correctAnswer: string;
  subject: string;
  chapter: string;
  exam: string;
  year: number;
  questionNo: number;
  hasSolution: boolean;
  solutionImageUrl: string;
  answeredAt: string;
  revised: boolean;
};

export type SessionBreakdownRow = {
  label: string;
  subject: string;
  chapter: string | null;
  correct: number;
  wrong: number;
  skipped: number;
  accuracyPercent: number;
};

export type SessionQuestionReview = {
  number: number;
  questionId: string;
  status: string;
  selectedAnswer: string;
  correctAnswer: string;
  hasSolution: boolean;
  solutionImageUrl: string;
  subject: string;
  chapter: string;
  questionNo: number;
  difficulty: number;
};

export type SessionResultView = {
  session: PracticeSessionView;
  timeTakenSeconds: number;
  accuracyPercent: number;
  countsForRank: boolean;
  subjectBreakdown: SessionBreakdownRow[];
  chapterBreakdown: SessionBreakdownRow[];
  weakChaptersInSession: ChapterProgress[];
  strongChaptersInSession: ChapterProgress[];
  aiInsights: string[];
  wrongAttempts: WrongAttemptView[];
  questionReviews: SessionQuestionReview[];
};

export type RevisionSummary = {
  pending: number;
  revised: number;
};

export type RevisionItemView = {
  questionId: string;
  packId: string;
  source: string;
  wrongAttemptId: string | null;
  sessionId: string | null;
  exam: string;
  year: number;
  subject: string;
  chapter: string;
  questionNo: number;
  addedAt: string;
  revisedAt: string | null;
  pending: boolean;
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
  solutionTextPreview?: string;
  options?: McqOptionView[];
  sourceType?: string;
  parentQuestionId?: string | null;
  variantNo?: number;
  variantType?: string | null;
  questionFormat?: string;
  assertion?: string;
  reason?: string;
  statements?: McqOptionView[];
  matchListA?: McqOptionView[];
  matchListB?: McqOptionView[];
  hasDiagram?: boolean;
  questionDiagramSvg?: string;
  solutionDiagramSvg?: string;
};

export type SubmitResult = {
  /** Always false in test mode — correctness is hidden until test submit. */
  correct: boolean;
  /** Empty in test mode. */
  correctAnswer: string;
  marksAwarded: number;
  sessionTotalMarks: number;
  sessionMaxMarks: number;
  correctCount: number;
  wrongCount: number;
  skipCount: number;
  adaptiveLevel: number;
  sessionStatus: string;
  nextQuestionId: string | null;
  /** Empty in test mode. */
  solutionImageUrl: string;
  /** Always false in test mode. */
  hasSolution: boolean;
};

export type SkipResult = {
  skipCount: number;
  correctCount: number;
  wrongCount: number;
  sessionTotalMarks: number;
  sessionMaxMarks: number;
  adaptiveLevel: number;
  sessionStatus: string;
  nextQuestionId: string | null;
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
  /** Last 28 days — questions answered per day (index 0 oldest, 27 today). */
  weeklyActivity: number[];
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
  category?: string | null;
  context?: string | null;
  aggregate: { count: number; average: number };
};

export type QuestionFeedbackCategory =
  | "general"
  | "wrong_answer"
  | "typo"
  | "image_issue"
  | "ai_variant"
  | "other";

export type QuestionFeedbackContext = "solve" | "practice" | "test";

export type QuestionFeedbackView = {
  yourScore: number;
  comment: string | null;
  category: string | null;
  context: string | null;
  aggregate: { count: number; average: number };
};

export type AdminFeedbackRow = {
  id: string;
  questionId: string;
  userId: string;
  userEmail: string;
  score: number;
  comment: string | null;
  category: string | null;
  context: string | null;
  ratedAt: string;
  exam: string;
  year: number;
  questionNo: number;
  subject: string;
  packId: string;
  variantNo: number;
};

export type AdminFeedbackPage = {
  items: AdminFeedbackRow[];
  total: number;
  totalPages: number;
  page: number;
  size: number;
};

async function request<T>(path: string, init?: RequestInit, timeoutMs = 25_000): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    touchSessionActivity();
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Request timed out — the server may still be starting. Try again in a moment.");
    }
    throw new Error("Cannot reach server — if you restarted the backend, wait a few seconds and try again.");
  } finally {
    window.clearTimeout(timeout);
  }

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
  params: {
    subject?: string;
    chapter?: string;
    topic?: string;
    difficulty?: string;
    q?: string;
    page?: number;
    size?: number;
  }
) {
  const q = new URLSearchParams({ packId });
  if (params.subject) q.set("subject", params.subject);
  if (params.chapter) q.set("chapter", params.chapter);
  if (params.topic) q.set("topic", params.topic);
  if (params.difficulty) q.set("difficulty", params.difficulty);
  if (params.q) q.set("q", params.q);
  if (params.page != null) q.set("page", String(params.page));
  if (params.size != null) q.set("size", String(params.size));
  return getJson<PageResponse<QuestionPublic>>(`/api/questions?${q}`);
}

export function fetchQuestion(questionId: string) {
  return getJson<QuestionDetail>(`/api/questions/${encodeURIComponent(questionId)}`);
}

export function fetchQuestionFamily(questionId: string) {
  return getJson<QuestionFamily>(`/api/questions/${encodeURIComponent(questionId)}/family`);
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
  /** True when folder comes from MongoDB only (re-sync target). */
  installed?: boolean;
};

export type ImportSourceStatus = {
  localConfigured: boolean;
  remoteConfigured: boolean;
  publicFilesBaseUrl: string | null;
};

export function fetchAdminImportFolders() {
  return request<{ folders: ImportFolderOption[]; count: number; source: ImportSourceStatus }>(
    "/api/admin/import/folders"
  );
}

export type ImportJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export type ImportJobDetail = {
  packId: string;
  questionsImported: number;
  variantsImported: number;
};

export type ImportJobView = {
  jobId: string;
  type: string;
  folderName: string | null;
  status: ImportJobStatus;
  message: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  packId: string | null;
  questionsImported: number | null;
  variantsImported: number | null;
  packsProcessed: number | null;
  packIds: string[] | null;
  details: ImportJobDetail[] | null;
};

export type ImportJobStart = {
  jobId: string;
  status: string;
  message: string;
};

const IMPORT_POLL_MS = 2500;
const IMPORT_MAX_WAIT_MS = 30 * 60 * 1000;

export function fetchAdminImportJob(jobId: string) {
  return request<ImportJobView>(`/api/admin/import/jobs/${encodeURIComponent(jobId)}`);
}

export type ImportProgressHandler = (job: ImportJobView) => void;

async function waitForImportJob(
  jobId: string,
  onUpdate?: ImportProgressHandler
): Promise<AdminActionResult> {
  const started = Date.now();
  while (Date.now() - started < IMPORT_MAX_WAIT_MS) {
    const job = await fetchAdminImportJob(jobId);
    onUpdate?.(job);
    if (job.status === "SUCCEEDED") {
      return {
        message: job.message ?? "Import complete",
        jobId: job.jobId,
        packId: job.packId,
        questionsImported: job.questionsImported,
        variantsImported: job.variantsImported,
        packsProcessed: job.packsProcessed,
        packIds: job.packIds,
        details: job.details,
      };
    }
    if (job.status === "FAILED") {
      throw new Error(job.error || job.message || "Import failed");
    }
    await new Promise((resolve) => window.setTimeout(resolve, IMPORT_POLL_MS));
  }
  throw new Error(
    `Import still running (job ${jobId}). Poll GET /api/admin/import/jobs/${jobId} or check server logs.`
  );
}

async function startAndWaitImport(
  start: () => Promise<ImportJobStart>,
  onUpdate?: ImportProgressHandler
): Promise<AdminActionResult> {
  const started = await start();
  return waitForImportJob(started.jobId, onUpdate);
}

export function adminImportNeet(onUpdate?: ImportProgressHandler) {
  return startAndWaitImport(
    () => request<ImportJobStart>("/api/admin/import/neet", { method: "POST" }),
    onUpdate
  );
}

export function adminImportAll(onUpdate?: ImportProgressHandler) {
  return startAndWaitImport(
    () => request<ImportJobStart>("/api/admin/import/all", { method: "POST" }),
    onUpdate
  );
}

export function adminImportFolder(folderName: string, onUpdate?: ImportProgressHandler) {
  return startAndWaitImport(
    () =>
      request<ImportJobStart>(`/api/admin/import/folder/${encodeURIComponent(folderName)}`, {
        method: "POST",
      }),
    onUpdate
  );
}

export type AdminPackRow = {
  packId: string;
  exam: string;
  year: number;
  sourceFolder: string;
  questionCount: number;
  demo: boolean;
};

export function fetchAdminPacks() {
  return request<{ packs: AdminPackRow[]; count: number }>("/api/admin/packs");
}

export function adminDeletePack(packId: string) {
  return request<AdminActionResult>(`/api/admin/packs/${encodeURIComponent(packId)}`, {
    method: "DELETE",
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
  startQuestionId?: string;
  mode?: "practice" | "test";
  questionCount?: number;
  /** pyq = original paper only; variants = AI drills; all = both */
  questionSet?: QuestionSetMode;
}) {
  return request<PracticeSessionView>("/api/practice/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type RetakeTestFilter = "wrong" | "skipped" | "unanswered" | "mistakes";

export function createRetakeTestSession(sessionId: string, filter: RetakeTestFilter) {
  return request<PracticeSessionView>(
    `/api/practice/sessions/${encodeURIComponent(sessionId)}/retake-test`,
    {
      method: "POST",
      body: JSON.stringify({ filter }),
    }
  );
}

export function fetchWrongAttempts(filters?: {
  mode?: "practice" | "test" | "all";
  subject?: string;
  chapter?: string;
  exam?: string;
  year?: number;
  sessionId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.mode && filters.mode !== "all") params.set("mode", filters.mode);
  if (filters?.subject) params.set("subject", filters.subject);
  if (filters?.chapter) params.set("chapter", filters.chapter);
  if (filters?.exam) params.set("exam", filters.exam);
  if (filters?.year) params.set("year", String(filters.year));
  if (filters?.sessionId) params.set("sessionId", filters.sessionId);
  const q = params.toString();
  return request<WrongAttemptView[]>(`/api/practice/wrong-attempts${q ? `?${q}` : ""}`);
}

export function fetchSessionResult(sessionId: string) {
  return request<SessionResultView>(`/api/practice/sessions/${encodeURIComponent(sessionId)}/result`);
}

export function fetchRevisionSummary() {
  return request<RevisionSummary>("/api/revision/summary");
}

export function fetchRevisionQueue(status?: "pending" | "revised" | "all") {
  const q = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
  return request<RevisionItemView[]>(`/api/revision/queue${q}`);
}

export function addToRevisionQueue(body: {
  questionId: string;
  source?: string;
  wrongAttemptId?: string;
  sessionId?: string;
}) {
  return request<RevisionItemView>("/api/revision/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function markRevisionRevised(questionId: string) {
  return request<RevisionItemView>(`/api/revision/${encodeURIComponent(questionId)}/mark-revised`, {
    method: "POST",
  });
}

export function markRevisionPending(questionId: string) {
  return request<RevisionItemView>(`/api/revision/${encodeURIComponent(questionId)}/mark-pending`, {
    method: "POST",
  });
}

export function toggleMarkForReview(sessionId: string, questionId: string) {
  return request<PracticeSessionView>(
    `/api/practice/sessions/${encodeURIComponent(sessionId)}/mark-review`,
    {
      method: "POST",
      body: JSON.stringify({ questionId }),
    }
  );
}

export function finishPracticeSession(sessionId: string) {
  return request<SessionResultView>(
    `/api/practice/sessions/${encodeURIComponent(sessionId)}/finish`,
    { method: "POST" }
  );
}

export function fetchPracticeSession(sessionId: string) {
  return request<PracticeSessionView>(`/api/practice/sessions/${encodeURIComponent(sessionId)}`);
}

export function fetchPracticeQuestion(questionId: string) {
  return request<PracticeQuestion>(
    `/api/practice/questions/${encodeURIComponent(questionId)}`
  );
}

export function fetchPracticeSolution(questionId: string) {
  return request<{
    hasSolution: boolean;
    solutionImageUrl: string;
    solutionTextPreview: string;
  }>(`/api/practice/questions/${encodeURIComponent(questionId)}/solution`);
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

export type VariantCheckResult = {
  correct: boolean;
  correctAnswer: string;
  hasSolution: boolean;
  solutionImageUrl: string;
  solutionTextPreview: string;
};

/** Practice-only: check an AI variant without recording a session attempt. */
export function checkVariantPracticeAnswer(body: {
  questionId: string;
  selectedAnswer: string;
}) {
  return request<VariantCheckResult>("/api/practice/variant-check", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function skipPracticeQuestion(body: { sessionId: string; questionId: string }) {
  return request<SkipResult>("/api/practice/skip", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchProgress() {
  return request<ProgressSummary>("/api/practice/progress").then((p) => ({
    ...p,
    weakChapters: p.weakChapters ?? [],
    byPack: p.byPack ?? [],
    weeklyActivity: p.weeklyActivity ?? [],
  }));
}

export function fetchLeaderboard(limit = 50, period: LeaderboardPeriod = "monthly") {
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

export function submitQuestionFeedback(
  questionId: string,
  body: {
    score?: number;
    comment?: string;
    category?: QuestionFeedbackCategory;
    context?: QuestionFeedbackContext;
  }
) {
  return request<QuestionFeedbackView>(
    `/api/questions/${encodeURIComponent(questionId)}/feedback`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
}

export function fetchQuestionFeedback(questionId: string) {
  return request<QuestionFeedbackView>(
    `/api/questions/${encodeURIComponent(questionId)}/feedback`
  );
}

export function fetchAdminQuestionFeedback(params?: {
  questionId?: string;
  page?: number;
  size?: number;
}) {
  const q = new URLSearchParams();
  if (params?.questionId) q.set("questionId", params.questionId);
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.size != null) q.set("size", String(params.size));
  const suffix = q.toString() ? `?${q}` : "";
  return request<AdminFeedbackPage>(`/api/admin/question-feedback${suffix}`);
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
  | "pitfalls"
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
  subtopic: string;
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

export function fetchBookmarkStatusBatch(questionIds: string[]) {
  const ids = [...new Set(questionIds.filter(Boolean))];
  if (ids.length === 0) {
    return Promise.resolve({} as Record<string, boolean>);
  }
  const qs = new URLSearchParams({ ids: ids.join(",") });
  return request<Record<string, boolean>>(`/api/bookmarks/batch-status?${qs}`);
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

export type AdminQuestionSearchRow = {
  questionId: string;
  packId: string;
  questionNo: number;
  exam: string;
  year: number;
  subject: string;
  chapter: string;
  questionTextPreview: string;
  sourceType: string;
  variantNo: number;
};

export type AdminFormulaCard = {
  name: string;
  formula: string;
  description: string;
};

export type AdminQuestionDetail = QuestionDetail & {
  variantType: string | null;
  questionFormat: string;
  assertion: string;
  reason: string;
  statements: McqOptionView[];
  solutionDiagramSvg: string;
  hints: string[];
  formulaCards: AdminFormulaCard[];
  conceptExplanation: string;
  commonMistakes: string[];
  practicePattern: string;
  revisionNotes: string;
  whyWrongByAnswer: Record<string, string>;
  adminLockedFields: string[];
};

export type AdminAiPromptFeature = {
  id: PracticeAiFeature;
  label: string;
  questionScoped: boolean;
  userScoped: boolean;
  usesSelectedAnswer: boolean;
};

export type AdminAiPromptView = {
  feature: PracticeAiFeature;
  label: string;
  systemPrompt: string;
  userPrompt: string;
  notes: string;
};

export function adminSearchQuestions(params: { q: string; packId?: string; page?: number; size?: number }) {
  const qs = new URLSearchParams({ q: params.q });
  if (params.packId) qs.set("packId", params.packId);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.size != null) qs.set("size", String(params.size));
  return request<PageResponse<AdminQuestionSearchRow>>(`/api/admin/questions/search?${qs}`);
}

export function fetchAdminQuestion(questionId: string) {
  return request<AdminQuestionDetail>(`/api/admin/questions/${encodeURIComponent(questionId)}`);
}

export function updateAdminQuestionContent(
  questionId: string,
  body: Partial<{
    questionTextPreview: string;
    solutionTextPreview: string;
    answer: string;
    options: McqOptionView[];
    questionFormat: string;
    assertion: string;
    reason: string;
    statements: McqOptionView[];
    questionDiagramSvg: string;
    solutionDiagramSvg: string;
  }>
) {
  return request<AdminQuestionDetail>(`/api/admin/questions/${encodeURIComponent(questionId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updateAdminQuestionEnrichment(
  questionId: string,
  body: Partial<{
    hints: string[];
    revisionNotes: string;
    conceptExplanation: string;
    commonMistakes: string[];
    practicePattern: string;
    whyWrongByAnswer: Record<string, string>;
    formulaCards: AdminFormulaCard[];
    clearFeatures: PracticeAiFeature[];
  }>
) {
  return request<AdminQuestionDetail>(`/api/admin/questions/${encodeURIComponent(questionId)}/enrichment`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function fetchAdminAiPromptFeatures() {
  return request<AdminAiPromptFeature[]>("/api/admin/practice-ai/prompt-features");
}

export function fetchAdminAiPrompt(params: {
  feature: PracticeAiFeature;
  questionId?: string;
  selectedAnswer?: string;
}) {
  const qs = new URLSearchParams({ feature: params.feature });
  if (params.questionId) qs.set("questionId", params.questionId);
  if (params.selectedAnswer) qs.set("selectedAnswer", params.selectedAnswer);
  return request<AdminAiPromptView>(`/api/admin/practice-ai/prompt?${qs}`);
}

export function adminSeedSampleBookmarks(limit = 8) {
  return request<AdminActionResult>(`/api/admin/bookmarks/seed-sample?limit=${limit}`, {
    method: "POST",
  });
}

export function adminClearMyBookmarks() {
  return request<AdminActionResult>("/api/admin/bookmarks/clear-mine", { method: "POST" });
}
