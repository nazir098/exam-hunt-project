import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  checkVariantPracticeAnswer,
  fetchPracticeQuestion,
  fetchPracticeSession,
  fetchQuestionFamily,
  finishPracticeSession,
  PracticeQuestion,
  PracticeSessionView,
  type QuestionFamily,
  SubmitResult,
  skipPracticeQuestion,
  submitPracticeAnswer,
  toggleMarkForReview,
  type PracticeAiFeature,
  type VariantCheckResult,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import AiMarkdown from "../components/AiMarkdown";
import AppLoader from "../components/AppLoader";
import PageLoadShell from "../components/PageLoadShell";
import PracticeStudyAssistant, { explainFeatureForResult } from "../components/PracticeStudyAssistant";
import ProductModeBanner from "../components/ProductModeBanner";
import QuestionFeedbackPanel from "../components/QuestionFeedbackPanel";
import QuestionSecondaryActions from "../components/QuestionSecondaryActions";
import QuestionVariantSwitcher from "../components/QuestionVariantSwitcher";
import TextMcqQuestion from "../components/TextMcqQuestion";
import VariantSwitchLoader from "../components/VariantSwitchLoader";
import ZoomableImage from "../components/ZoomableImage";
import SessionExpiredDialog from "../components/SessionExpiredDialog";
import SessionQuestionNav from "../components/SessionQuestionNav";
import TestRunSidebar from "../components/TestRunSidebar";
import SessionTimer from "../components/SessionTimer";
import { useSessionEngagement } from "../hooks/useSessionEngagement";
import { sessionRoute, type ProductMode } from "../navigation/modes";
import { difficultyLabel, examDisplayName, questionHeadingTitle } from "../utils/labels";
import { formatVariantTypeLabel, isAiVariantQuestion } from "../utils/variantLabels";
import { familyParentId, isSamePaperQuestion, variantSwitchLoaderForTarget } from "../utils/questionFamily";
import {
  beginVariantSwitch,
  clearVariantSwitchGate,
  resolveContentLoadingEnd,
  type VariantSwitchGate,
} from "../utils/variantSwitchTiming";
import { hasDistinctSolution } from "../utils/questionSolution";
import {
  cacheBustImageUrl,
  hybridDiagramUrl,
  isImageQuestion,
} from "../utils/questionRender";

const OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
];

function variantMcqProps(q: PracticeQuestion) {
  const isVariant = isAiVariantQuestion(q);
  return {
    questionFormat: q.questionFormat,
    variantType: q.variantType,
    assertion: q.assertion,
    reason: q.reason,
    statements: q.statements,
    matchListA: q.matchListA,
    matchListB: q.matchListB,
    questionId: q.questionId,
    questionImageUrl: hybridDiagramUrl(q),
    questionDiagramSvg: q.questionDiagramSvg,
    assetPlacements: q.assetPlacements,
    variantTheme: isVariant,
    variantLabel: isVariant ? formatVariantTypeLabel(q.variantType, q.variantNo) : undefined,
  };
}

function optionLabel(value: string) {
  return `Option ${value}`;
}

type PracticeAnswerReview = {
  correct: boolean;
  correctAnswer: string;
  selectedAnswer: string;
  hasSolution: boolean;
  solutionImageUrl: string;
};

function sessionAnchorQuestionId(
  question: Pick<PracticeQuestion, "questionId" | "parentQuestionId" | "sourceType"> | null,
  routeQuestionId: string
): string {
  if (
    question?.sourceType === "ai_variant" &&
    question.parentQuestionId &&
    question.parentQuestionId !== question.questionId
  ) {
    return question.parentQuestionId;
  }
  return routeQuestionId;
}

function isAiVariantPreview(
  question: Pick<PracticeQuestion, "questionId" | "parentQuestionId" | "sourceType"> | null,
  routeQuestionId: string
): boolean {
  return sessionAnchorQuestionId(question, routeQuestionId) !== routeQuestionId;
}

async function resolveSessionQuestionAccess(
  questionId: string,
  tileIds: Set<string>
): Promise<{ allowed: boolean; question?: PracticeQuestion }> {
  if (tileIds.has(questionId)) {
    return { allowed: true };
  }
  try {
    const question = await fetchPracticeQuestion(questionId);
    const parentId = question.parentQuestionId?.trim();
    if (parentId && tileIds.has(parentId)) {
      return { allowed: true, question };
    }
  } catch {
    /* not a session variant */
  }
  return { allowed: false };
}

function sequentialNav(tiles: PracticeSessionView["questionTiles"], anchorQuestionId: string) {
  const idx = tiles?.findIndex((t) => t.questionId === anchorQuestionId) ?? -1;
  if (idx < 0 || !tiles) return { prevId: null, nextId: null };
  return {
    prevId: idx > 0 ? tiles[idx - 1].questionId : null,
    nextId: idx < tiles.length - 1 ? tiles[idx + 1].questionId : null,
  };
}

type SessionCounts = {
  correctCount: number;
  wrongCount: number;
  skipCount: number;
  sessionTotalMarks: number;
  sessionMaxMarks: number;
  adaptiveLevel: number;
  sessionStatus: string;
  nextQuestionId: string | null;
};

type TilePatchDetails = {
  selectedAnswer?: string;
  correctAnswer?: string;
  solutionImageUrl?: string;
};

function patchSessionAfterAction(
  session: PracticeSessionView,
  actedQuestionId: string,
  tileStatus: "correct" | "wrong" | "skipped",
  res: SessionCounts,
  details?: TilePatchDetails
): PracticeSessionView {
  const nextId = res.nextQuestionId;
  const tiles = session.questionTiles?.map((t) => {
    if (t.questionId === actedQuestionId) {
      return {
        ...t,
        status: tileStatus,
        ...(details?.selectedAnswer !== undefined ? { selectedAnswer: details.selectedAnswer } : {}),
        ...(details?.correctAnswer !== undefined ? { correctAnswer: details.correctAnswer } : {}),
        ...(details?.solutionImageUrl !== undefined ? { solutionImageUrl: details.solutionImageUrl } : {}),
      };
    }
    if (nextId && t.questionId === nextId) return { ...t, status: "current" as const };
    if (t.status === "current") return { ...t, status: "unattempted" as const };
    return t;
  });
  const nextIndex = nextId
    ? (tiles?.findIndex((t) => t.questionId === nextId) ?? session.currentIndex)
    : Math.max(0, (tiles?.length ?? session.questionCount) - 1);
  return {
    ...session,
    correctCount: res.correctCount,
    wrongCount: res.wrongCount,
    skipCount: res.skipCount,
    totalMarks: res.sessionTotalMarks,
    maxMarks: res.sessionMaxMarks,
    adaptiveLevel: res.adaptiveLevel,
    status: res.sessionStatus,
    currentQuestionId: nextId ?? actedQuestionId,
    currentIndex: nextIndex >= 0 ? nextIndex : Math.max(0, session.questionCount - 1),
    questionTiles: tiles,
  };
}

function tileStatusFromSubmit(
  res: Pick<SubmitResult, "correct" | "correctCount" | "wrongCount">,
  session: PracticeSessionView
): "correct" | "wrong" {
  if (typeof res.correct === "boolean") {
    return res.correct ? "correct" : "wrong";
  }
  return res.wrongCount > session.wrongCount ? "wrong" : "correct";
}

function submitTileDetails(
  res: Pick<SubmitResult, "correctAnswer" | "solutionImageUrl">,
  selectedAnswer: string
): TilePatchDetails {
  return {
    selectedAnswer,
    correctAnswer: res.correctAnswer,
    solutionImageUrl: res.solutionImageUrl,
  };
}

export default function PracticeQuestionPage() {
  const { sessionId = "", questionId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeMode: ProductMode = location.pathname.startsWith("/test/session/") ? "test" : "practice";
  const { user, loading: authLoading, refreshProgress } = useAuth();
  const [session, setSession] = useState<PracticeSessionView | null>(null);
  const [q, setQ] = useState<PracticeQuestion | null>(null);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");
  const [loadTick, setLoadTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [aiTrigger, setAiTrigger] = useState<PracticeAiFeature | null>(null);
  const [variantCheck, setVariantCheck] = useState<VariantCheckResult | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [family, setFamily] = useState<QuestionFamily | null>(null);
  const questionCacheRef = useRef(new Map<string, PracticeQuestion>());
  const variantSwitchGateRef = useRef<VariantSwitchGate | null>(null);
  const qRef = useRef<PracticeQuestion | null>(null);
  const loadedSessionIdRef = useRef<string | null>(null);
  const sessionRef = useRef<PracticeSessionView | null>(null);
  const visitedIdsRef = useRef<string[]>([]);
  const [visitedIds, setVisitedIds] = useState<string[]>([]);
  sessionRef.current = session;
  qRef.current = q;
  const familyParent = familyParentId(questionId ?? "", q?.parentQuestionId);

  useEffect(() => {
    if (!questionId) {
      setFamily(null);
      return;
    }
    let cancelled = false;
    fetchQuestionFamily(questionId)
      .then((data) => {
        if (!cancelled) setFamily(data);
      })
      .catch(() => {
        if (!cancelled) setFamily(null);
      });
    return () => {
      cancelled = true;
    };
  }, [familyParent]);

  useEffect(() => {
    setFamily((prev) =>
      prev && prev.activeQuestionId !== questionId
        ? { ...prev, activeQuestionId: questionId }
        : prev
    );
  }, [questionId]);

  useEffect(() => {
    setFeedbackOpen(false);
  }, [questionId]);

  useEffect(() => () => clearVariantSwitchGate(variantSwitchGateRef), []);

  useEffect(() => {
    setResult(null);
    setVariantCheck(null);
    setShowSolution(false);
    setSelected("");
  }, [questionId]);

  const resultPath = useCallback(
    (sid: string) => (routeMode === "test" ? `/test/result/${sid}` : `/practice/result/${sid}`),
    [routeMode]
  );

  const sessionPath = useCallback(
    (sid: string, qid: string) => sessionRoute(routeMode, sid, qid),
    [routeMode]
  );

  useEffect(() => {
    questionCacheRef.current.clear();
    loadedSessionIdRef.current = null;
    visitedIdsRef.current = [];
    setVisitedIds([]);
    setSession(null);
    setQ(null);
  }, [sessionId]);

  useEffect(() => {
    if (routeMode !== "test" || !questionId) return;
    if (visitedIdsRef.current.includes(questionId)) return;
    visitedIdsRef.current = [...visitedIdsRef.current, questionId];
    setVisitedIds(visitedIdsRef.current);
  }, [questionId, routeMode]);

  const loadQuestionById = useCallback(
    async (qid: string, opts?: { prefetch?: boolean }) => {
      const cached = questionCacheRef.current.get(qid);
      const cacheStale =
        cached?.sourceType === "ai_variant" &&
        (!cached.options?.length || !cached.questionFormat);

      if (cached && !cacheStale) {
        if (opts?.prefetch) return cached;
        setSelected("");
        setShowSolution(false);
        setResult(null);
        setVariantCheck(null);
        setQ(cached);
        if (!opts?.prefetch) resolveContentLoadingEnd(variantSwitchGateRef, qid, setContentLoading);
        return cached;
      }

      if (!opts?.prefetch) {
        if (variantSwitchGateRef.current?.targetId !== qid) {
          setContentLoading(true);
        }
        setSelected("");
        setShowSolution(false);
        setResult(null);
        setVariantCheck(null);
      }
      try {
        const question = await fetchPracticeQuestion(qid);
        questionCacheRef.current.set(qid, question);
        if (!opts?.prefetch) {
          setSelected("");
          setShowSolution(false);
          setResult(null);
          setVariantCheck(null);
          setQ(question);
        }
        return question;
      } finally {
        if (!opts?.prefetch) resolveContentLoadingEnd(variantSwitchGateRef, qid, setContentLoading);
      }
    },
    []
  );

  const prefetchNextQuestion = useCallback(
    (tiles: PracticeSessionView["questionTiles"], currentId: string) => {
      const { nextId } = sequentialNav(tiles, currentId);
      if (nextId) void loadQuestionById(nextId, { prefetch: true });
    },
    [loadQuestionById]
  );

  const prefetchFamilyVariants = useCallback(() => {
    if (!family) return;
    const ids = [
      family.pyq.questionId,
      ...family.variants.map((v) => v.questionId),
    ];
    for (const id of ids) {
      if (id === questionId || questionCacheRef.current.has(id)) continue;
      void loadQuestionById(id, { prefetch: true });
    }
  }, [family, loadQuestionById, questionId]);

  const loadSession = useCallback(async () => {
    setError("");
    setResult(null);
    setSelected("");
    setShowSolution(false);

    if (routeMode === "test" && loadedSessionIdRef.current === sessionId && sessionRef.current) {
      return sessionRef.current;
    }

    const s = await fetchPracticeSession(sessionId);
    loadedSessionIdRef.current = sessionId;
    setSession(s);
    return s;
  }, [sessionId, routeMode]);

  const onSessionEngagementUpdate = useCallback((updated: PracticeSessionView) => {
    setSession(updated);
  }, []);

  useSessionEngagement({
    sessionId,
    routeMode,
    enabled: session?.status === "active",
    onSessionUpdate: onSessionEngagementUpdate,
  });

  const applyQuestion = useCallback(
    async (s: PracticeSessionView, qid: string) => {
      const sessionSnapshot = s;
      const tileIds = new Set(sessionSnapshot.questionTiles?.map((t) => t.questionId) ?? []);
      let accessQuestion: PracticeQuestion | undefined;
      let inSession = tileIds.has(qid);
      if (!inSession) {
        const access = await resolveSessionQuestionAccess(qid, tileIds);
        inSession = access.allowed;
        accessQuestion = access.question;
      }
      if (sessionSnapshot.status === "completed" && !inSession) {
        setError("This session has ended. Start a new one from Practice or Test.");
        return;
      }
      if (sessionSnapshot.status === "active" && !inSession && sessionSnapshot.currentQuestionId) {
        navigate(sessionPath(sessionId, sessionSnapshot.currentQuestionId), { replace: true });
        return;
      }
      if (sessionSnapshot.status === "active" && !sessionSnapshot.currentQuestionId) {
        setError("This session has ended.");
        return;
      }
      try {
        if (accessQuestion) {
          questionCacheRef.current.set(qid, accessQuestion);
        }
        await loadQuestionById(qid);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load question";
        if (msg.toLowerCase().includes("not found") && sessionSnapshot.currentQuestionId) {
          navigate(sessionPath(sessionId, sessionSnapshot.currentQuestionId), { replace: true });
          return;
        }
        throw e;
      }
      const loaded = questionCacheRef.current.get(qid);
      const anchorId = sessionAnchorQuestionId(loaded ?? null, qid);
      prefetchNextQuestion(sessionSnapshot.questionTiles, anchorId);
      const tile = sessionSnapshot.questionTiles?.find((t) => t.questionId === anchorId);
      if (
        routeMode === "practice" &&
        tile &&
        (tile.status === "correct" || tile.status === "wrong") &&
        tile.selectedAnswer
      ) {
        setSelected(tile.selectedAnswer);
      }
    },
    [sessionId, navigate, sessionPath, loadQuestionById, prefetchNextQuestion, routeMode]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    loadSession().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [user, authLoading, loadSession, navigate, sessionId, loadTick]);

  useEffect(() => {
    if (authLoading || !user || !session) return;
    if (loadedSessionIdRef.current !== sessionId) return;
    let cancelled = false;
    applyQuestion(session, questionId).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load question");
    });
    return () => {
      cancelled = true;
    };
  }, [questionId, session?.id, user, authLoading, applyQuestion, sessionId]);

  function retryLoad() {
    loadedSessionIdRef.current = null;
    setSession(null);
    setQ(null);
    setError("");
    setLoadTick((t) => t + 1);
  }

  async function checkVariant() {
    if (!selected || !session || !q) return;
    setBusy(true);
    setError("");
    try {
      const res = await checkVariantPracticeAnswer({
        questionId,
        selectedAnswer: selected,
      });
      setVariantCheck(res);
      setShowSolution(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check answer");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!selected || !session) return;
    const anchorQid = q ? sessionAnchorQuestionId(q, questionId) : questionId;
    setBusy(true);
    setError("");
    try {
      const res = await submitPracticeAnswer({
        sessionId: session.id,
        questionId: anchorQid,
        selectedAnswer: selected,
      });
      const tileStatus = tileStatusFromSubmit(res, session);
      const tileDetails = submitTileDetails(res, selected);
      if (routeMode === "test") {
        const patched = patchSessionAfterAction(session, anchorQid, tileStatus, res, tileDetails);
        setSession(patched);
        setBusy(false);
        if (res.nextQuestionId) {
          void loadQuestionById(res.nextQuestionId, { prefetch: true });
          navigate(sessionPath(sessionId, res.nextQuestionId));
        } else {
          navigate(sessionPath(sessionId, questionId), { replace: true });
        }
        return;
      }
      setSession(patchSessionAfterAction(session, anchorQid, tileStatus, res, tileDetails));
      setResult(res);
      if (res.nextQuestionId) {
        void loadQuestionById(res.nextQuestionId, { prefetch: true });
      }
      void refreshProgress();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function skipQuestion() {
    if (!session || result) return;
    const anchorQid = q ? sessionAnchorQuestionId(q, questionId) : questionId;
    setBusy(true);
    setError("");
    try {
      const res = await skipPracticeQuestion({ sessionId: session.id, questionId: anchorQid });
      if (routeMode === "test") {
        setSession(patchSessionAfterAction(session, anchorQid, "skipped", res));
        if (res.nextQuestionId) {
          void loadQuestionById(res.nextQuestionId, { prefetch: true });
          navigate(sessionPath(sessionId, res.nextQuestionId));
        } else {
          navigate(sessionPath(sessionId, questionId), { replace: true });
        }
        return;
      }
      setSession(patchSessionAfterAction(session, anchorQid, "skipped", res));
      if (res.nextQuestionId) {
        void loadQuestionById(res.nextQuestionId, { prefetch: true });
        navigate(sessionPath(sessionId, res.nextQuestionId));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not skip question");
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    if (result?.nextQuestionId) {
      void loadQuestionById(result.nextQuestionId, { prefetch: true });
      navigate(sessionPath(sessionId, result.nextQuestionId));
    } else {
      navigate(resultPath(sessionId));
    }
  }

  async function toggleReview() {
    if (!session || routeMode !== "test") return;
    setBusy(true);
    try {
      const updated = await toggleMarkForReview(session.id, questionId);
      setSession(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update review mark");
    } finally {
      setBusy(false);
    }
  }

  async function submitPracticeSession() {
    if (!session || routeMode !== "practice" || session.status !== "active") return;
    const unanswered =
      session.questionCount -
      session.correctCount -
      session.wrongCount -
      (session.skipCount ?? 0);
    const msg =
      unanswered > 0
        ? `Submit practice session? ${unanswered} question(s) will remain unanswered.`
        : "Submit practice session and view your results?";
    if (!window.confirm(msg)) return;
    setBusy(true);
    setError("");
    try {
      const result = await finishPracticeSession(session.id);
      void refreshProgress();
      navigate(resultPath(session.id), { state: { result } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit session");
    } finally {
      setBusy(false);
    }
  }

  async function submitTestEarly() {
    if (!session || routeMode !== "test" || session.status !== "active") return;
    const unanswered =
      session.questionCount -
      session.correctCount -
      session.wrongCount -
      (session.skipCount ?? 0);
    const msg =
      unanswered > 0
        ? `Submit test now? ${unanswered} question(s) will be counted as skipped.`
        : "Submit test and view your results?";
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const result = await finishPracticeSession(session.id);
      void refreshProgress();
      navigate(resultPath(session.id), { state: { result } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit test");
    } finally {
      setBusy(false);
    }
  }

  function goPrev() {
    const anchorId = sessionAnchorQuestionId(q, questionId);
    const { prevId } = sequentialNav(session?.questionTiles, anchorId);
    if (prevId) {
      navigate(sessionPath(sessionId, prevId));
    }
  }

  function goSequentialNext() {
    const anchorId = sessionAnchorQuestionId(q, questionId);
    const { nextId } = sequentialNav(session?.questionTiles, anchorId);
    if (nextId) {
      navigate(sessionPath(sessionId, nextId));
      return;
    }
    if (routeMode === "test") return;
    if (result?.nextQuestionId) {
      navigate(sessionPath(sessionId, result.nextQuestionId));
      return;
    }
    goNext();
  }

  function triggerAi(feature: PracticeAiFeature) {
    setAiTrigger(feature);
  }

  function goToTile(qid: string) {
    if (session?.status === "completed") return;
    if (qid === sessionAnchorQuestionId(q, questionId)) return;
    navigate(sessionPath(sessionId, qid));
  }

  const pageLoading =
    authLoading || (!user && !error) || Boolean(user && !error && !session);

  function questionMatchesRoute(
    question: PracticeQuestion | null,
    routeId: string
  ): boolean {
    if (!question) return false;
    if (question.questionId === routeId) return true;
    if (question.parentQuestionId === routeId) return true;
    return sessionAnchorQuestionId(question, routeId) === routeId;
  }

  const samePaperSwitchPending =
    Boolean(q) && isSamePaperQuestion(questionId, q) && (contentLoading || q!.questionId !== questionId);

  const questionShellPending =
    !q ||
    (!samePaperSwitchPending && (contentLoading || !questionMatchesRoute(q, questionId)));

  const questionContentReady =
    Boolean(q) && q!.questionId === questionId && questionMatchesRoute(q, questionId);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (busy || pageLoading || !questionContentReady || session?.status === "completed") return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "ArrowLeft") {
        const anchorId = sessionAnchorQuestionId(q, questionId);
        const { prevId: pid } = sequentialNav(session?.questionTiles, anchorId);
        if (pid) {
          e.preventDefault();
          navigate(sessionPath(sessionId, pid));
        }
        return;
      }

      if (e.key === "ArrowRight") {
        const anchorId = sessionAnchorQuestionId(q, questionId);
        const { nextId: nid } = sequentialNav(session?.questionTiles, anchorId);
        if (nid) {
          e.preventDefault();
          navigate(sessionPath(sessionId, nid));
          return;
        }
        if (routeMode === "practice" && result?.nextQuestionId) {
          e.preventDefault();
          navigate(sessionPath(sessionId, result.nextQuestionId));
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    busy,
    pageLoading,
    session,
    questionId,
    sessionId,
    navigate,
    sessionPath,
    routeMode,
    result,
    questionContentReady,
  ]);

  const isMarked =
    session?.markedForReviewIds?.includes(questionId) ?? false;

  const loaderLabel =
    authLoading || !user
      ? "Checking your session…"
      : routeMode === "test"
        ? "Loading your test…"
        : "Loading practice…";
  const loaderHint =
    routeMode === "test"
      ? "Syncing questions and progress"
      : "Fetching session and question";

  const backTo = routeMode === "test" ? "/test/create" : "/practice";
  const backLabel = routeMode === "test" ? "Test" : "Practice";

  if (pageLoading) {
    return (
      <main className={`practice-run-page practice-run-page--${routeMode}`}>
        <header className="practice-run-header">
          <div className="practice-run-header__sticky sticky-below-header">
            <div className="practice-run-header__top">
              <Link to={backTo} className="practice-run-header__back">
                <span className="material-symbols-outlined">arrow_back</span>
                {backLabel}
              </Link>
              <ProductModeBanner mode={routeMode} inline />
            </div>
          </div>
        </header>
        <div className="practice-run-layout">
          <div className="practice-run-main">
            <section className="glass-card content-loader-panel">
              <AppLoader
                variant="inline"
                label={loaderLabel}
                hint={loaderHint}
                mode={routeMode === "test" ? "test" : "practice"}
                icon={routeMode === "test" ? "timer" : "school"}
              />
            </section>
          </div>
        </div>
      </main>
    );
  }

  if (error || !user || !session) {
    return (
      <PageLoadShell
        error={error || "This session could not be loaded."}
        onRetry={retryLoad}
        backHref={routeMode === "test" ? "/test/create" : "/practice"}
        backLabel={routeMode === "test" ? "Back to tests" : "Back to practice"}
        className="practice-run-page"
        loaderMode={routeMode === "test" ? "test" : "practice"}
      >
        {null}
      </PageLoadShell>
    );
  }

  const sessionEnded = session.status === "completed";
  const pageClassName = `practice-run-page practice-run-page--${routeMode}${
    sessionEnded ? " practice-run-page--session-ended" : ""
  }`;

  if (!q) {
    return (
      <main className={pageClassName}>
        <header className="practice-run-header">
          <div className="practice-run-header__sticky sticky-below-header">
            <div className="practice-run-header__top">
              <Link to={backTo} className="practice-run-header__back">
                <span className="material-symbols-outlined">arrow_back</span>
                {backLabel}
              </Link>
              <ProductModeBanner mode={routeMode} inline />
            </div>
          </div>
        </header>
        <div className="practice-run-layout">
          <div className="practice-run-main">
            <section className="glass-card content-loader-panel">
              <AppLoader
                variant="inline"
                label="Loading question…"
                hint="Fetching question content"
                mode={routeMode === "test" ? "test" : "practice"}
                icon={routeMode === "test" ? "timer" : "school"}
              />
            </section>
          </div>
        </div>
        {sessionEnded && <SessionExpiredDialog mode={routeMode} sessionId={sessionId} />}
      </main>
    );
  }

  const diff = difficultyLabel(q.difficulty);
  const answered = session.correctCount + session.wrongCount;
  const sessionAnchorId = sessionAnchorQuestionId(q, questionId);
  const variantPreview = isAiVariantPreview(q, questionId);
  const variantChecked = !!variantCheck;
  const canSubmit =
    !!selected && !result && !busy && session.status === "active" && !variantPreview;
  const canCheckVariant =
    !!selected &&
    !variantChecked &&
    !result &&
    !busy &&
    session.status === "active" &&
    variantPreview;
  const activeTile = session.questionTiles?.find((t) => t.questionId === sessionAnchorId);
  const practiceAnswerReview: PracticeAnswerReview | null =
    routeMode === "practice" &&
    activeTile &&
    (activeTile.status === "correct" || activeTile.status === "wrong")
      ? {
          correct: activeTile.status === "correct",
          correctAnswer: activeTile.correctAnswer ?? "",
          selectedAnswer: activeTile.selectedAnswer ?? selected,
          hasSolution: q.hasSolution,
          solutionImageUrl: activeTile.solutionImageUrl ?? "",
        }
      : routeMode === "practice" && result
        ? {
            correct: result.correct,
            correctAnswer: result.correctAnswer,
            selectedAnswer: selected,
            hasSolution: result.hasSolution,
            solutionImageUrl: result.solutionImageUrl,
          }
        : null;
  const practiceRevealed = !!practiceAnswerReview;
  const isTestActive = routeMode === "test" && session.status === "active";
  const isAnsweredTile =
    activeTile?.status === "correct" || activeTile?.status === "wrong" || activeTile?.status === "skipped";
  const tileLocked =
    routeMode === "test" &&
    !practiceRevealed &&
    session.status === "active" &&
    activeTile?.status === "skipped";
  const testAnswerSaved = isTestActive && !result && !!activeTile && isAnsweredTile;
  const remaining =
    session.questionCount - answered - (session.skipCount ?? 0);
  const { prevId, nextId } = sequentialNav(session.questionTiles, sessionAnchorId);
  const tileIndex =
    session.questionTiles?.findIndex((t) => t.questionId === sessionAnchorId) ?? -1;
  const navPosition =
    activeTile?.number ??
    (tileIndex >= 0 ? tileIndex + 1 : session.currentIndex + 1);
  const isLastQuestion =
    navPosition >= session.questionCount ||
    (tileIndex >= 0 && tileIndex >= session.questionCount - 1);
  const isSessionCurrentQuestion = session.currentQuestionId === sessionAnchorId;
  const canGoNext =
    !!nextId || (isTestActive && isSessionCurrentQuestion && session.status === "active" && !result);
  const showPracticeSubmit =
    routeMode === "practice" && session.status === "active" && isLastQuestion;
  const showPracticeAssistant =
    routeMode === "practice" && (practiceRevealed || variantChecked);
  const showAssistantPanel =
    questionContentReady &&
    (isTestActive || (routeMode === "practice" && showPracticeAssistant));
  const feedbackCorrect = practiceAnswerReview
    ? practiceAnswerReview.correct
    : activeTile?.status === "correct";
  const feedbackWrong = practiceAnswerReview
    ? !practiceAnswerReview.correct
    : activeTile?.status === "wrong";
  const scoreMarks = result?.sessionTotalMarks ?? session.totalMarks;
  const scoreMax = result?.sessionMaxMarks ?? session.maxMarks;
  const showFormula = q.formulaRelevant;
  const hasSolution = variantChecked
    ? variantCheck?.hasSolution ?? q.hasSolution
    : practiceAnswerReview?.hasSolution ?? q.hasSolution;
  const solutionUrl = variantChecked
    ? variantCheck?.solutionImageUrl
    : practiceAnswerReview?.solutionImageUrl || result?.solutionImageUrl;
  const distinctSolution = q
    ? hasDistinctSolution(q) || Boolean(solutionUrl?.trim())
    : false;

  const assistantProps = {
    questionId,
    selectedAnswer: selected,
    submitted:
      routeMode === "practice" &&
      (practiceRevealed || variantChecked),
    correct: routeMode === "practice"
      ? variantChecked
        ? variantCheck?.correct ?? null
        : feedbackCorrect
          ? true
          : feedbackWrong
            ? false
            : null
      : null,
    prominent: showPracticeAssistant,
    formulaRelevant: q.formulaRelevant,
    hasSolution,
    triggerFeature: aiTrigger,
    onTriggerConsumed: () => setAiTrigger(null),
    examLocked: isTestActive,
    directSolutionReveal: variantChecked && hasSolution,
    prefetchedSolutionImage: variantCheck?.solutionImageUrl ?? "",
    prefetchedSolutionText: variantCheck?.solutionTextPreview ?? "",
  };

  function renderPracticeAnswerActions(isCorrect: boolean) {
    return (
      <div className="practice-run-result__actions practice-run-result__actions--compact">
        {hasSolution && (
          <button
            type="button"
            className="practice-run-result__action practice-run-result__action--primary"
            onClick={() => setShowSolution(true)}
          >
            <span className="material-symbols-outlined">menu_book</span>
            View Solution
          </button>
        )}
        <button
          type="button"
          className="practice-run-result__action"
          onClick={() => triggerAi(explainFeatureForResult(isCorrect))}
        >
          Explain
        </button>
        {!isCorrect && (
          <button type="button" className="practice-run-result__action" onClick={() => triggerAi("explain_basics")}>
            Basics
          </button>
        )}
        {!isCorrect && showFormula && (
          <button type="button" className="practice-run-result__action" onClick={() => triggerAi("formula")}>
            Formula
          </button>
        )}
        <button type="button" className="practice-run-result__action" onClick={() => triggerAi("similar_questions")}>
          Similar
        </button>
        <button
          type="button"
          className="practice-run-result__action practice-run-result__action--next"
          onClick={goSequentialNext}
        >
          Next Question
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    );
  }

  function renderTestMarkReview() {
    if (!isTestActive) return null;
    return (
      <button
        type="button"
        className={`practice-run-mark-review${isMarked ? " is-on" : ""}`}
        disabled={busy}
        onClick={toggleReview}
      >
        <span className="material-symbols-outlined">flag</span>
        <span className="practice-run-mark-review__label">
          {isMarked ? "Flagged" : "Flag"}
        </span>
      </button>
    );
  }

  function renderQuestionLoadingShell() {
    return (
      <section
        className="glass-card content-loader-panel practice-run-question-skeleton"
        aria-busy="true"
        aria-live="polite"
      >
        <AppLoader
          variant="compact"
          label="Loading question…"
          hint="Fetching question content"
          mode={routeMode === "test" ? "test" : "practice"}
          icon="description"
        />
      </section>
    );
  }

  function renderQuestionBlock(includeMarkReview = false) {
    if (!q || !session) return null;
    const sessionNo = activeTile?.number ?? session.currentIndex + 1;
    const goVariant = (qid: string) => {
      if (session.status === "completed") return;
      if (qid === questionId) return;
      if (isSamePaperQuestion(qid, q)) {
        beginVariantSwitch(variantSwitchGateRef, qid, setContentLoading);
      }
      navigate(sessionPath(sessionId, qid));
      void loadQuestionById(qid, { prefetch: true });
    };
    const switchLoader = samePaperSwitchPending
      ? variantSwitchLoaderForTarget(questionId, family)
      : null;
    const mediaLoading = Boolean(switchLoader);
    const isVariant = isAiVariantQuestion(q) || switchLoader?.mode === "ai";
    const variantAnswer = variantCheck?.correctAnswer ?? "";
    const answerRevealed = practiceRevealed || (variantPreview && variantChecked);
    const revealedAnswer =
      practiceAnswerReview?.correctAnswer ??
      (variantPreview && variantChecked ? variantAnswer : "");
    return (
      <section
        key={questionId}
        className={`practice-run-question glass-card${isVariant ? " practice-run-question--variant" : ""}`}
      >
        {(routeMode !== "practice" || includeMarkReview) && (
          <div className="practice-run-question__head">
            {routeMode !== "practice" && (
              <div className="practice-run-question__titles">
                <p className="practice-run-question__eyebrow">
                  Session Q{sessionNo} of {session.questionCount}
                  {session.filterSubject ? ` · ${session.filterSubject}` : ""}
                </p>
                <h1 className="practice-run-question__title">
                  {questionHeadingTitle(
                    q.exam,
                    q.questionNo,
                    q.topic || q.chapter,
                    isVariant ? formatVariantTypeLabel(q.variantType, q.variantNo) : null
                  )}
                </h1>
              </div>
            )}
            {includeMarkReview && renderTestMarkReview()}
          </div>
        )}
        {routeMode === "practice" && (
          <QuestionVariantSwitcher
            questionId={questionId}
            family={family}
            onSelect={goVariant}
            onPrefetchVariants={prefetchFamilyVariants}
          />
        )}
        <div
          className={`practice-run-question__media${
            mediaLoading
              ? switchLoader?.mode === "ai"
                ? " practice-run-question__media--variant-generating"
                : " practice-run-question__media--variant-loading"
              : ""
          }`}
        >
          {mediaLoading ? (
            switchLoader?.mode === "ai" ? (
              <VariantSwitchLoader mode={switchLoader.mode} label={switchLoader.label} />
            ) : (
              <AppLoader
                variant="compact"
                label="Loading question…"
                mode={routeMode === "test" ? "test" : "practice"}
                icon="description"
              />
            )
          ) : isImageQuestion(q) ? (
            <ZoomableImage
              src={cacheBustImageUrl(q.questionImageUrl, q.questionId)}
              alt={`Question ${q.questionNo}`}
            />
          ) : (
            <TextMcqQuestion
              questionText={q.questionTextPreview || "No question text"}
              options={q.options ?? []}
              selected={selected}
              onSelect={setSelected}
              disabled={sessionEnded || busy || answerRevealed}
              correctAnswer={revealedAnswer}
              showCorrect={answerRevealed && Boolean(revealedAnswer)}
              showWrong={
                answerRevealed && !!selected && !!revealedAnswer && selected !== revealedAnswer
              }
              {...variantMcqProps(q)}
            />
          )}
        </div>
      </section>
    );
  }

  function renderTestRevisitNav() {
    if (!session || !q) return null;
    const anchorId = sessionAnchorQuestionId(q, questionId);
    const { nextId } = sequentialNav(session.questionTiles, anchorId);
    const answeredTiles =
      session.questionTiles?.filter(
        (t) => t.status === "correct" || t.status === "wrong" || t.status === "skipped"
      ).length ?? 0;
    const allAnswered = answeredTiles >= session.questionCount;
    return (
      <>
        {allAnswered && !nextId && (
          <p className="practice-run-test-finish-hint muted">
            All questions answered — tap <strong>Submit test</strong> when you&apos;re ready.
          </p>
        )}
        <div className="practice-run-actions practice-run-actions--pair">
          <button
            type="button"
            className="practice-run-nav-btn"
            disabled={!prevId || busy}
            onClick={goPrev}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Previous
          </button>
          <button
            type="button"
            className="practice-run-nav-btn"
            disabled={!nextId || busy}
            onClick={() => nextId && navigate(sessionPath(sessionId, nextId))}
          >
            Next
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </>
    );
  }

  function renderPracticeInlineFeedback(review: PracticeAnswerReview) {
    if (!q) return null;
    return (
      <section
        className={`practice-run-result practice-run-result--compact practice-run-result--inline glass-card is-revealed${
          review.correct ? " practice-run-result--correct" : " practice-run-result--wrong"
        }`}
        aria-live="polite"
      >
        <div className="practice-run-result__banner practice-run-result__banner--compact practice-run-result__banner--inline">
          <span className="practice-run-result__icon-wrap" aria-hidden>
            <span
              className="material-symbols-outlined practice-run-result__icon"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {review.correct ? "check_circle" : "cancel"}
            </span>
          </span>
          <div className="practice-run-result__content">
            <h2 className="practice-run-result__title">
              {review.correct ? "Correct!" : "Incorrect"}
            </h2>
            <p className="practice-run-result__delta">{review.correct ? "+4 Marks" : "−1 Mark"}</p>
          </div>
          {hasSolution && (
            <button
              type="button"
              className="practice-run-result__action practice-run-result__action--primary"
              onClick={() => setShowSolution((open) => !open)}
              aria-pressed={showSolution}
            >
              <span className="material-symbols-outlined">menu_book</span>
              {showSolution ? "Hide Solution" : "View Solution"}
            </button>
          )}
        </div>
      </section>
    );
  }

  function renderPracticeSolutionPanel() {
    if (!q || !showSolution || !hasSolution) return null;
    const imgUrl = solutionUrl?.trim();
    return (
      <section className="solve-page__solution glass-card" aria-label="Official solution">
        <div className="solve-page__solution-head">
          <span className="material-symbols-outlined">menu_book</span>
          <h2 className="solve-page__solution-title">Official solution</h2>
        </div>
        {imgUrl ? (
          <div className="practice-run-question__media solve-page__solution-media">
            <ZoomableImage
              src={cacheBustImageUrl(imgUrl, q.questionId)}
              alt={`Solution for question ${q.questionNo}`}
            />
          </div>
        ) : q.solutionDiagramSvg?.trim() ? (
          <div className="solve-page__solution-text text-mcq-paper">
            <div
              className="variant-diagram__svg"
              dangerouslySetInnerHTML={{ __html: q.solutionDiagramSvg }}
            />
          </div>
        ) : q.solutionTextPreview?.trim() ? (
          <div className="solve-page__solution-text text-mcq-paper">
            <AiMarkdown text={q.solutionTextPreview} className="ai-markdown--paper" />
          </div>
        ) : (
          <p className="muted">Solution is marked available but not loaded — try re-syncing the pack.</p>
        )}
      </section>
    );
  }

  async function handleNextQuestion() {
    if (!session || busy) return;
    if (isTestActive) {
      if (nextId) navigate(sessionPath(sessionId, nextId));
      return;
    }
    if (showPracticeSubmit) {
      await submitPracticeSession();
      return;
    }
    if (isSessionCurrentQuestion && session.status === "active" && !result && !variantPreview) {
      await skipQuestion();
      return;
    }
    if (nextId) {
      navigate(sessionPath(sessionId, nextId));
    }
  }

  function renderPracticeSkippedReview() {
    return (
      <section className="practice-run-result practice-run-result--compact glass-card practice-run-result--locked is-revealed">
        <div className="practice-run-result__banner practice-run-result__banner--compact">
          <span
            className="material-symbols-outlined practice-run-result__icon"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            skip_next
          </span>
          <div>
            <h2 className="practice-run-result__title">Skipped</h2>
            <p className="practice-run-result__score-line">
              Current Score: {scoreMarks}/{scoreMax}
            </p>
          </div>
        </div>
      </section>
    );
  }

  function renderVariantPracticeResult() {
    if (!variantCheck || !variantPreview) return null;
    return (
      <section
        className={`practice-run-result practice-run-result--compact glass-card practice-run-result--variant is-revealed${
          variantCheck.correct ? " practice-run-result--correct" : " practice-run-result--wrong"
        }`}
      >
        <div className="practice-run-result__banner practice-run-result__banner--compact">
          <span
            className="material-symbols-outlined practice-run-result__icon"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {variantCheck.correct ? "check_circle" : "cancel"}
          </span>
          <div>
            <h2 className="practice-run-result__title">
              {variantCheck.correct ? "Correct" : "Incorrect"}
            </h2>
            {!variantCheck.correct && (
              <p className="practice-run-result__answer-line">
                Correct answer: {optionLabel(variantCheck.correctAnswer)}
              </p>
            )}
            <p className="practice-run-result__answer-line muted practice-run-result__variant-note">
              Variant practice — session score unchanged. Switch to <strong>Original</strong> to
              submit for marks.
            </p>
          </div>
        </div>
        {renderPracticeAnswerActions(variantCheck.correct)}
      </section>
    );
  }

  function renderSessionFooterNav(extraClass = "") {
    return (
      <footer
        className={`solve-page__footer-nav practice-run-footer-nav${extraClass ? ` ${extraClass}` : ""}`}
        aria-label="Question navigation"
      >
        <button
          type="button"
          className="practice-run-nav-btn solve-page__nav-btn"
          disabled={!prevId || busy}
          onClick={goPrev}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="solve-page__nav-label">Prev</span>
        </button>
        <span className="solve-page__nav-pos">
          {session ? `${navPosition} / ${session.questionCount}` : ""}
        </span>
        {showPracticeSubmit ? (
          <button
            type="button"
            className="practice-run-nav-btn solve-page__nav-btn practice-run-nav-btn--submit"
            disabled={busy}
            onClick={() => void submitPracticeSession()}
          >
            <span className="solve-page__nav-label">Submit session</span>
            <span className="material-symbols-outlined">task_alt</span>
          </button>
        ) : (
          <button
            type="button"
            className="practice-run-nav-btn solve-page__nav-btn"
            disabled={!canGoNext || busy}
            onClick={() => void handleNextQuestion()}
          >
            <span className="solve-page__nav-label">Next</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        )}
      </footer>
    );
  }

  function renderQuestionNavRow() {
    const submitLabel = variantPreview
      ? busy
        ? "Checking…"
        : selected
          ? "Check answer"
          : "Select option"
      : busy
        ? "Submitting…"
        : selected
          ? "Submit"
          : "Select option";

    return (
      <>
        {variantPreview && !variantChecked && !practiceRevealed && (
          <p className="practice-run-variant-preview-hint muted">
            Practice this AI variation with <strong>Check answer</strong>. Switch to{" "}
            <strong>Original</strong> when you&apos;re ready to submit for session marks.
          </p>
        )}
        <div className="solve-page__actions practice-run-submit-row">
          {practiceRevealed && practiceAnswerReview ? (
            <button
              type="button"
              className={`practice-submit-btn solve-page__check-btn${
                practiceAnswerReview.correct
                  ? " practice-run-result--correct"
                  : " practice-run-result--wrong"
              }`}
              disabled
            >
              <span className="material-symbols-outlined">
                {practiceAnswerReview.correct ? "check_circle" : "cancel"}
              </span>
              {practiceAnswerReview.correct ? "Correct" : "Incorrect"}
            </button>
          ) : variantPreview ? (
            <button
              type="button"
              className="practice-submit-btn solve-page__check-btn practice-run-submit--variant"
              disabled={!canCheckVariant}
              onClick={checkVariant}
            >
              <span className="material-symbols-outlined">done</span>
              {submitLabel}
            </button>
          ) : (
            <button
              type="button"
              className="practice-submit-btn solve-page__check-btn"
              disabled={!canSubmit}
              onClick={submit}
            >
              <span className="material-symbols-outlined">done</span>
              {submitLabel}
            </button>
          )}
        </div>

        {routeMode === "practice" && (practiceRevealed || (!result && !variantChecked)) && (
          <QuestionSecondaryActions
            questionId={questionId}
            hasSolution={!practiceRevealed && hasSolution && distinctSolution}
            solutionAllowed={variantChecked && !practiceRevealed}
            solutionOpen={showSolution}
            onToggleSolution={
              variantChecked && !practiceRevealed
                ? () => setShowSolution((v) => !v)
                : undefined
            }
            onReport={() => {
              setFeedbackOpen(true);
              requestAnimationFrame(() => {
                document.getElementById("question-report")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              });
            }}
          />
        )}

        {!practiceRevealed && !variantChecked && routeMode === "practice" && !result && (
          <p className="solve-page__submit-hint muted">
            Answer will be revealed after you submit.
          </p>
        )}

        {practiceRevealed && practiceAnswerReview && renderPracticeInlineFeedback(practiceAnswerReview)}
        {practiceRevealed && renderPracticeSolutionPanel()}

        {renderSessionFooterNav("solve-page__footer-nav--desktop")}
        <p className="practice-run-keyboard-hint muted hidden lg:block">
          Use ← → arrow keys to move between questions
        </p>
      </>
    );
  }

  const showSessionFooter =
    questionContentReady &&
    !testAnswerSaved &&
    !!session &&
    (routeMode === "practice" || (!result && !tileLocked));

  return (
    <main className={pageClassName}>
      <header className="practice-run-header">
        <div className="practice-run-header__sticky sticky-below-header">
          <div className="practice-run-header__top">
            <Link to={backTo} className="practice-run-header__back">
              <span className="material-symbols-outlined">arrow_back</span>
              {backLabel}
            </Link>
            <ProductModeBanner mode={routeMode} inline />
            {routeMode === "practice" && session.status === "active" && (
              <button
                type="button"
                className="practice-run-submit-session"
                disabled={busy}
                onClick={() => void submitPracticeSession()}
              >
                Submit session
              </button>
            )}
            {routeMode === "test" && session.status === "active" && (
              <button type="button" className="practice-run-submit-test" disabled={busy} onClick={submitTestEarly}>
                Submit test
              </button>
            )}
          </div>
          {isTestActive ? (
            <div className="practice-run-header__score-row practice-run-header__score-row--test">
              <div className="practice-run-header__progress-meta practice-run-header__progress-meta--test">
                <span>Answered: {answered}</span>
                <span>Remaining: {Math.max(0, remaining)}</span>
              </div>
              <SessionTimer
                activeSeconds={session.activeSeconds ?? 0}
                engagedSince={session.engagedSince}
                label="Time"
                compact
              />
            </div>
          ) : (
            <div className="practice-run-header__dashboard">
              <div className="practice-run-header__dashboard-main">
                <div className="practice-run-header__score-block">
                  <span className="practice-run-header__score-label">
                    <span className="material-symbols-outlined" aria-hidden>
                      trophy
                    </span>
                    Score
                  </span>
                  <strong className="practice-run-header__score-value">
                    {scoreMarks}/{scoreMax}
                  </strong>
                </div>

                <div
                  className="practice-run-header__status-icons"
                  aria-label={`${session.correctCount} correct, ${session.wrongCount} wrong, ${session.skipCount ?? 0} skipped`}
                >
                  <div className="practice-run-header__status-item practice-run-header__status-item--ok">
                    <span className="practice-run-header__status-icon" aria-hidden>
                      <span className="material-symbols-outlined">check</span>
                    </span>
                    <span className="practice-run-header__status-count">{session.correctCount}</span>
                  </div>
                  <div className="practice-run-header__status-item practice-run-header__status-item--bad">
                    <span className="practice-run-header__status-icon" aria-hidden>
                      <span className="material-symbols-outlined">close</span>
                    </span>
                    <span className="practice-run-header__status-count">{session.wrongCount}</span>
                  </div>
                  <div className="practice-run-header__status-item practice-run-header__status-item--skip">
                    <span className="practice-run-header__status-icon" aria-hidden>
                      <span className="material-symbols-outlined">skip_next</span>
                    </span>
                    <span className="practice-run-header__status-count">{session.skipCount ?? 0}</span>
                  </div>
                </div>

                {session.status === "active" && (
                  <SessionTimer
                    activeSeconds={session.activeSeconds ?? 0}
                    engagedSince={session.engagedSince}
                    label="Time"
                    compact
                  />
                )}
              </div>

              <div className="practice-run-header__dashboard-footer">
                <span>Answered: {answered}</span>
                <span>Remaining: {Math.max(0, remaining)}</span>
              </div>
            </div>
          )}
          {session.questionTiles && session.questionTiles.length > 0 && (
            <SessionQuestionNav
              tiles={session.questionTiles}
              activeQuestionId={sessionAnchorId}
              onSelect={goToTile}
              showMarked={routeMode === "test"}
              markedIds={session.markedForReviewIds}
              visitedIds={visitedIds}
              examMode={isTestActive}
              practiceMode={routeMode === "practice"}
              hideHeadMeta={routeMode === "practice"}
            />
          )}
        </div>
      </header>

      <div className={`practice-run-layout${showPracticeAssistant ? " practice-run-layout--result" : ""}`}>
        <div className="practice-run-main practice-run-main--busy-host">
          {routeMode !== "test" && questionContentReady && (
            <div className="practice-run-meta">
              <span className="practice-run-chip">{examDisplayName(q.exam, q.year)} {q.year}</span>
              <span className="practice-run-chip practice-run-chip--paper">
                {q.sourceType === "ai_variant" && q.variantNo
                  ? `Variant V${q.variantNo} · Paper Q${q.questionNo}`
                  : `Paper Q${q.questionNo}`}
              </span>
              {q.subject && <span className="practice-run-chip">{q.subject}</span>}
              <span className="practice-run-chip">{diff}</span>
              {q.chapter && <span className="practice-run-chip practice-run-chip--muted">{q.chapter}</span>}
              <span className="practice-run-chip practice-run-chip--accent">
                Level {session.adaptiveLevel}/3
              </span>
            </div>
          )}

          {testAnswerSaved ? (
            questionShellPending ? (
              renderQuestionLoadingShell()
            ) : (
              <>
                {renderQuestionBlock(true)}
                {renderTestRevisitNav()}
              </>
            )
          ) : tileLocked ? (
            questionShellPending ? (
              renderQuestionLoadingShell()
            ) : (
              <>
                {renderQuestionBlock(false)}
                {renderPracticeSkippedReview()}
                {renderSessionFooterNav("solve-page__footer-nav--desktop")}
              </>
            )
          ) : questionShellPending && !samePaperSwitchPending ? (
            renderQuestionLoadingShell()
          ) : (
            <>
              {renderQuestionBlock(isTestActive)}

              {questionContentReady && isImageQuestion(q) && (
                <section className="practice-run-options" aria-label="Answer options">
                  <p className="practice-run-options__label">Select one option</p>
                  <div className="practice-run-options__list">
                    {OPTIONS.map((opt) => {
                      const active =
                        selected === opt.value ||
                        practiceAnswerReview?.selectedAnswer === opt.value;
                      const variantAnswer = variantCheck?.correctAnswer ?? "";
                      const answerRevealed =
                        practiceRevealed || (variantPreview && variantChecked);
                      const revealedAnswer =
                        practiceAnswerReview?.correctAnswer ??
                        (variantPreview && variantChecked ? variantAnswer : "");
                      const isOptCorrect = answerRevealed && revealedAnswer === opt.value;
                      const isOptWrong =
                        answerRevealed && active && revealedAnswer !== opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={sessionEnded || busy || answerRevealed}
                          onClick={() => setSelected(opt.value)}
                          className={`practice-run-option${active ? " is-selected" : ""}${
                            isOptCorrect ? " is-correct" : ""
                          }${isOptWrong ? " is-wrong" : ""}`}
                          aria-label={`Option ${opt.label}`}
                          aria-pressed={active}
                        >
                          <span className="practice-run-option__badge">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {error && <p className="practice-run-error">{error}</p>}

              {questionContentReady && renderQuestionNavRow()}
              {questionContentReady && renderVariantPracticeResult()}
            </>
          )}

          {busy && (
            <section
              className="content-loader-panel content-loader-panel--overlay"
              aria-live="polite"
              aria-busy="true"
            >
              <AppLoader
                variant="compact"
                label={
                  routeMode === "test"
                    ? "Updating test…"
                    : variantPreview
                      ? "Checking answer…"
                      : "Saving answer…"
                }
                mode={routeMode === "test" ? "test" : "practice"}
                icon="sync"
              />
            </section>
          )}
        </div>

        <aside
          className={`practice-run-aside hidden lg:block${showAssistantPanel ? "" : " practice-run-aside--hidden"}`}
        >
          {routeMode === "practice" && feedbackOpen && (
            <QuestionFeedbackPanel
              questionId={questionId}
              context="practice"
              compact
              hideToggle
              expanded={feedbackOpen}
              onExpandedChange={setFeedbackOpen}
              className="solve-page__feedback"
            />
          )}
          {isTestActive ? (
            <TestRunSidebar assistant={assistantProps} />
          ) : (
            showAssistantPanel && <PracticeStudyAssistant {...assistantProps} layout="sidebar" />
          )}
        </aside>
      </div>

      {routeMode === "practice" && !isTestActive && (
        <div className="solve-page__mobile-rail lg:hidden">
          {feedbackOpen && (
            <div id="question-report">
              <QuestionFeedbackPanel
                questionId={questionId}
                context="practice"
                compact
                hideToggle
                expanded={feedbackOpen}
                onExpandedChange={setFeedbackOpen}
                className="solve-page__feedback"
              />
            </div>
          )}
          {showAssistantPanel && (
            <div className="practice-run-ai-inline">
              <PracticeStudyAssistant {...assistantProps} layout="inline" />
            </div>
          )}
        </div>
      )}

      {isTestActive && (
        <div className="solve-page__mobile-rail lg:hidden">
          <div className="practice-run-ai-inline">
            <TestRunSidebar assistant={assistantProps} />
          </div>
        </div>
      )}

      {showSessionFooter && renderSessionFooterNav("solve-page__footer-nav--fixed")}
      {sessionEnded && <SessionExpiredDialog mode={routeMode} sessionId={sessionId} />}
    </main>
  );
}
