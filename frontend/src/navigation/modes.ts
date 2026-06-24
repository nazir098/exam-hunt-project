export type ProductMode = "solve" | "practice" | "test";

export const MODES = {
  solve: {
    id: "solve" as const,
    label: "Study Mode",
    button: "Solve",
    helper: "Learn this question without timer or ranking pressure.",
    tooltip: "Learn with hints and explanation",
    rankImpact: false,
    analyticsImpact: false,
  },
  practice: {
    id: "practice" as const,
    label: "Practice Mode",
    button: "Practice",
    helper: "Improve — timed session with instant feedback, solutions, and AI coaching.",
    tooltip: "Timed scoring session for rank",
    rankImpact: true,
    analyticsImpact: true,
  },
  test: {
    id: "test" as const,
    label: "Test Mode",
    button: "Add to Test",
    helper: "Evaluate — exam simulation. Score and solutions unlock after you submit the test.",
    tooltip: "Create a custom timed test",
    rankImpact: false,
    analyticsImpact: true,
  },
} as const;

export function sessionRoute(mode: ProductMode, sessionId: string, questionId: string): string {
  if (mode === "test") {
    return `/test/session/${sessionId}/${encodeURIComponent(questionId)}`;
  }
  return `/practice/${sessionId}/${encodeURIComponent(questionId)}`;
}

export function sessionResultRoute(mode: ProductMode, sessionId: string): string {
  if (mode === "test") {
    return `/test/result/${sessionId}`;
  }
  return `/practice/result/${sessionId}`;
}

export function practiceReviewRoute(sessionId: string, questionId?: string): string {
  const params = new URLSearchParams();
  if (questionId) params.set("q", questionId);
  const query = params.toString();
  return `/practice/result/${encodeURIComponent(sessionId)}/review${query ? `?${query}` : ""}`;
}

export function testReviewRoute(
  sessionId: string,
  filter: string = "wrong",
  questionId?: string
): string {
  const params = new URLSearchParams({ filter });
  if (questionId) params.set("q", questionId);
  return `/test/result/${encodeURIComponent(sessionId)}/review?${params.toString()}`;
}

export function isTestSession(session: { mode?: string }): boolean {
  return session.mode === "test";
}

export function isPracticeSession(session: { mode?: string }): boolean {
  return !session.mode || session.mode === "practice";
}
