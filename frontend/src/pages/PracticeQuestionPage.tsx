import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  checkVariantPracticeAnswer,
  fetchPracticeQuestion,
  fetchPracticeSession,
  finishPracticeSession,
  PracticeQuestion,
  PracticeSessionView,
  SubmitResult,
  skipPracticeQuestion,
  submitPracticeAnswer,
  toggleMarkForReview,
  type PracticeAiFeature,
  type VariantCheckResult,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import AppLoader from "../components/AppLoader";
import PageLoadShell from "../components/PageLoadShell";
import PracticeStudyAssistant, { explainFeatureForResult } from "../components/PracticeStudyAssistant";
import ProductModeBanner from "../components/ProductModeBanner";
import QuestionFeedbackPanel from "../components/QuestionFeedbackPanel";
import QuestionVariantSwitcher from "../components/QuestionVariantSwitcher";
import TextMcqQuestion from "../components/TextMcqQuestion";
import VariantSwitchLoader from "../components/VariantSwitchLoader";
import SessionQuestionNav from "../components/SessionQuestionNav";
import TestRunSidebar from "../components/TestRunSidebar";
import SessionTimer from "../components/SessionTimer";
import { sessionRoute, type ProductMode } from "../navigation/modes";
import { difficultyLabel, examDisplayName } from "../utils/labels";
import { formatVariantTypeLabel, VARIANT_SWITCH_IDLE, type VariantSwitchState } from "../utils/variantLabels";

const OPTIONS = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
];

function imageSrc(url: string) {
  if (url.startsWith("http")) return url;
  return url;
}

function usesTextVariantLayout(q: PracticeQuestion) {
  if (q.options && q.options.length > 0) return true;
  if (q.questionDiagramSvg?.trim()) return true;
  if (q.assertion?.trim() || q.reason?.trim()) return true;
  if (q.statements && q.statements.length > 0) return true;
  if (q.matchListA && q.matchListA.length > 0) return true;
  if (q.sourceType === "ai_variant" && q.questionTextPreview?.trim()) return true;
  return false;
}

function isImageQuestion(q: PracticeQuestion) {
  return Boolean(q.questionImageUrl?.trim()) && !usesTextVariantLayout(q);
}

function variantMcqProps(q: PracticeQuestion) {
  return {
    questionFormat: q.questionFormat,
    variantType: q.variantType,
    assertion: q.assertion,
    reason: q.reason,
    statements: q.statements,
    matchListA: q.matchListA,
    matchListB: q.matchListB,
    questionId: q.questionId,
    questionImageUrl: q.questionImageUrl,
    questionDiagramSvg: q.questionDiagramSvg,
  };
}

function optionLabel(value: string) {
  return `Option ${value}`;
}

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

function patchSessionAfterAction(
  session: PracticeSessionView,
  actedQuestionId: string,
  tileStatus: "correct" | "wrong" | "skipped",
  res: SessionCounts
): PracticeSessionView {
  const nextId = res.nextQuestionId;
  const tiles = session.questionTiles?.map((t) => {
    if (t.questionId === actedQuestionId) return { ...t, status: tileStatus };
    if (nextId && t.questionId === nextId) return { ...t, status: "current" as const };
    if (t.status === "current") return { ...t, status: "unattempted" as const };
    return t;
  });
  const nextIndex = nextId
    ? (tiles?.findIndex((t) => t.questionId === nextId) ?? session.currentIndex)
    : session.questionCount;
  return {
    ...session,
    correctCount: res.correctCount,
    wrongCount: res.wrongCount,
    skipCount: res.skipCount,
    totalMarks: res.sessionTotalMarks,
    maxMarks: res.sessionMaxMarks,
    adaptiveLevel: res.adaptiveLevel,
    status: res.sessionStatus,
    currentQuestionId: nextId,
    currentIndex: nextIndex >= 0 ? nextIndex : session.questionCount,
    questionTiles: tiles,
  };
}

function answeredTileStatus(
  session: PracticeSessionView,
  res: Pick<SubmitResult, "correctCount" | "wrongCount">
): "correct" | "wrong" {
  return res.wrongCount > session.wrongCount ? "wrong" : "correct";
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
  const [aiTrigger, setAiTrigger] = useState<PracticeAiFeature | null>(null);
  const [variantSwitch, setVariantSwitch] = useState<VariantSwitchState>(VARIANT_SWITCH_IDLE);
  const [variantCheck, setVariantCheck] = useState<VariantCheckResult | null>(null);
  const questionCacheRef = useRef(new Map<string, PracticeQuestion>());
  const loadedSessionIdRef = useRef<string | null>(null);
  const sessionRef = useRef<PracticeSessionView | null>(null);
  const visitedIdsRef = useRef<string[]>([]);
  const [visitedIds, setVisitedIds] = useState<string[]>([]);
  sessionRef.current = session;

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

  useEffect(() => {
    setVariantSwitch(VARIANT_SWITCH_IDLE);
  }, [questionId]);

  const loadQuestionById = useCallback(
    async (qid: string, opts?: { prefetch?: boolean }) => {
      const cached = questionCacheRef.current.get(qid);
      if (!opts?.prefetch) {
        setQ(null);
        setSelected("");
        setShowSolution(false);
        setResult(null);
        setVariantCheck(null);
      }
      const cacheStale =
        cached?.sourceType === "ai_variant" &&
        (!cached.options?.length || !cached.questionFormat);
      if (cached && !cacheStale && opts?.prefetch) {
        return cached;
      }
      if (cached && !cacheStale && !opts?.prefetch) {
        setQ(cached);
        return cached;
      }
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

  const applyQuestion = useCallback(
    async (s: PracticeSessionView, qid: string) => {
      const tileIds = new Set(s.questionTiles?.map((t) => t.questionId) ?? []);
      const access = await resolveSessionQuestionAccess(qid, tileIds);
      const inSession = access.allowed;
      if (s.status === "completed" && !inSession) {
        setError("This session has ended. Start a new one from Practice or Test.");
        return;
      }
      if (s.status === "active" && !inSession && s.currentQuestionId) {
        navigate(sessionPath(sessionId, s.currentQuestionId), { replace: true });
        return;
      }
      if (s.status === "active" && !s.currentQuestionId) {
        setError("This session has ended.");
        return;
      }
      try {
        if (access.question) {
          questionCacheRef.current.set(qid, access.question);
        }
        await loadQuestionById(qid);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load question";
        if (msg.toLowerCase().includes("not found") && s.currentQuestionId) {
          navigate(sessionPath(sessionId, s.currentQuestionId), { replace: true });
          return;
        }
        throw e;
      }
      if (routeMode === "test") {
        const loaded = questionCacheRef.current.get(qid);
        const anchorId = sessionAnchorQuestionId(loaded ?? null, qid);
        prefetchNextQuestion(s.questionTiles, anchorId);
      }
    },
    [sessionId, navigate, sessionPath, routeMode, loadQuestionById, prefetchNextQuestion]
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
    setBusy(true);
    setError("");
    try {
      const res = await submitPracticeAnswer({
        sessionId: session.id,
        questionId,
        selectedAnswer: selected,
      });
      if (routeMode === "test") {
        const patched = patchSessionAfterAction(
          session,
          questionId,
          answeredTileStatus(session, res),
          res
        );
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
      setSession(patchSessionAfterAction(session, questionId, answeredTileStatus(session, res), res));
      setResult(res);
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
      } else {
        void refreshProgress();
        navigate(resultPath(session.id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not skip question");
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    if (result?.nextQuestionId) {
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
    if (prevId) navigate(sessionPath(sessionId, prevId));
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
    if (qid === sessionAnchorQuestionId(q, questionId)) return;
    navigate(sessionPath(sessionId, qid));
  }

  const pageLoading =
    authLoading || (!user && !error) || Boolean(user && !error && (!session || !q));

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (busy || pageLoading) return;
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
        <ProductModeBanner mode={routeMode} compact />
        <header className="practice-run-header sticky-below-header">
          <div className="practice-run-header__top">
            <Link to={backTo} className="practice-run-header__back">
              <span className="material-symbols-outlined">arrow_back</span>
              {backLabel}
            </Link>
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

  if (error || !user || !q || !session) {
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

  const diff = difficultyLabel(q.difficulty);
  const answered = session.correctCount + session.wrongCount;
  const currentQ = answered + (result ? 0 : 1);
  const progressPct = Math.round((answered / session.questionCount) * 100);
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
  const isTestActive = routeMode === "test" && session.status === "active";
  const isAnsweredTile =
    activeTile?.status === "correct" || activeTile?.status === "wrong" || activeTile?.status === "skipped";
  const tileLocked =
    routeMode === "practice" &&
    !result &&
    session.status === "active" &&
    activeTile &&
    isAnsweredTile;
  const testAnswerSaved = isTestActive && !result && !!activeTile && isAnsweredTile;
  const remaining =
    session.questionCount - answered - (session.skipCount ?? 0);
  const { prevId, nextId } = sequentialNav(session.questionTiles, sessionAnchorId);
  const isSessionCurrentQuestion = session.currentQuestionId === sessionAnchorId;
  const canGoNext =
    !!nextId || (isSessionCurrentQuestion && session.status === "active" && !result);
  const showPracticeAssistant =
    routeMode === "practice" && (!!result || !!tileLocked || variantChecked);
  const showAssistantPanel = routeMode === "practice" || isTestActive;
  const feedbackCorrect = result ? result.correct : activeTile?.status === "correct";
  const feedbackWrong = result ? !result.correct : activeTile?.status === "wrong";
  const scoreMarks = result?.sessionTotalMarks ?? session.totalMarks;
  const scoreMax = result?.sessionMaxMarks ?? session.maxMarks;
  const showFormula = q.formulaRelevant;
  const hasSolution = variantChecked
    ? variantCheck?.hasSolution ?? q.hasSolution
    : result?.hasSolution ?? q.hasSolution;
  const solutionUrl = variantChecked
    ? variantCheck?.solutionImageUrl
    : result?.solutionImageUrl;

  const assistantProps = {
    questionId,
    selectedAnswer: selected,
    submitted:
      routeMode === "practice" &&
      (!!result || feedbackCorrect || feedbackWrong || variantChecked),
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

  function renderQuestionBlock(includeMarkReview = false) {
    if (!q || !session) return null;
    const sessionNo = activeTile?.number ?? session.currentIndex + 1;
    const isVariant = q.sourceType === "ai_variant" && (q.variantNo ?? 0) > 0;
    const variantAnswer = variantCheck?.correctAnswer ?? "";
    const goVariant = (qid: string) => {
      if (qid !== questionId) navigate(sessionPath(sessionId, qid));
    };
    return (
      <section key={questionId} className="practice-run-question glass-card">
        <div className="practice-run-question__head">
          <div className="practice-run-question__titles">
            <p className="practice-run-question__eyebrow">
              Session Q{sessionNo} of {session.questionCount}
              {session.filterSubject ? ` · ${session.filterSubject}` : ""}
            </p>
            <h1 className="practice-run-question__title">
              {isVariant
                ? `${formatVariantTypeLabel(q.variantType, q.variantNo)} · Paper Q${q.questionNo}`
                : `NEET Paper · Question ${q.questionNo}`}
            </h1>
          </div>
          {includeMarkReview && renderTestMarkReview()}
        </div>
        {routeMode === "practice" && (
          <QuestionVariantSwitcher
            questionId={questionId}
            onSelect={goVariant}
            onSwitchStateChange={setVariantSwitch}
          />
        )}
        <div
          className={`practice-run-question__media${
            variantSwitch.active
              ? variantSwitch.mode === "ai"
                ? " practice-run-question__media--variant-generating"
                : " practice-run-question__media--variant-loading"
              : ""
          }`}
        >
          {variantSwitch.active && variantSwitch.mode ? (
            <VariantSwitchLoader mode={variantSwitch.mode} label={variantSwitch.label} />
          ) : isImageQuestion(q) ? (
            <img
              src={imageSrc(q.questionImageUrl)}
              alt={`Question ${q.questionNo}`}
              draggable={false}
            />
          ) : (
            <TextMcqQuestion
              questionText={q.questionTextPreview || "No question text"}
              options={q.options ?? []}
              selected={selected}
              onSelect={setSelected}
              disabled={busy || !!result || (variantPreview && variantChecked)}
              correctAnswer={variantPreview && variantChecked ? variantAnswer : ""}
              showCorrect={variantPreview && variantChecked && Boolean(variantAnswer)}
              showWrong={
                variantPreview &&
                variantChecked &&
                !!selected &&
                selected !== variantAnswer
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

  function renderPracticeResult(res: SubmitResult) {
    return (
      <section
        className={`practice-run-result practice-run-result--compact glass-card is-revealed${
          res.correct ? " practice-run-result--correct" : " practice-run-result--wrong"
        }`}
      >
        <div className="practice-run-result__banner practice-run-result__banner--compact">
          <span
            className="material-symbols-outlined practice-run-result__icon"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {res.correct ? "check_circle" : "cancel"}
          </span>
          <div>
            <h2 className="practice-run-result__title">
              {res.correct ? "Correct" : "Incorrect"}
            </h2>
            {!res.correct && (
              <p className="practice-run-result__answer-line">
                Correct Answer: {optionLabel(res.correctAnswer)}
              </p>
            )}
            <p className="practice-run-result__delta">{res.correct ? "+4 Marks" : "−1 Mark"}</p>
            <p className="practice-run-result__score-line">
              Current Score: {scoreMarks}/{scoreMax}
            </p>
          </div>
        </div>

        {hasSolution && solutionUrl && (
          <div className="practice-run-solution practice-run-solution--compact">
            <div className={`practice-run-solution__panel${showSolution ? " is-open" : ""}`}>
              <img src={imageSrc(solutionUrl)} alt="Solution" draggable={false} />
            </div>
          </div>
        )}

        {renderPracticeAnswerActions(res.correct)}

        <QuestionFeedbackPanel
          questionId={questionId}
          context="practice"
          compact
          className="glass-card"
        />
      </section>
    );
  }

  async function handleNextQuestion() {
    if (!session || busy) return;
    if (isTestActive) {
      if (nextId) navigate(sessionPath(sessionId, nextId));
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

  function renderPracticeLockedReview() {
    return (
      <section
        className={`practice-run-result practice-run-result--compact glass-card practice-run-result--locked is-revealed${
          feedbackCorrect ? " practice-run-result--correct" : " practice-run-result--wrong"
        }`}
      >
        <div className="practice-run-result__banner practice-run-result__banner--compact">
          <span
            className="material-symbols-outlined practice-run-result__icon"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {feedbackCorrect ? "check_circle" : activeTile?.status === "skipped" ? "skip_next" : "cancel"}
          </span>
          <div>
            <h2 className="practice-run-result__title">
              {feedbackCorrect ? "Correct" : activeTile?.status === "skipped" ? "Skipped" : "Incorrect"}
            </h2>
            {feedbackCorrect && (
              <>
                <p className="practice-run-result__delta">+4 Marks</p>
                <p className="practice-run-result__score-line">
                  Current Score: {scoreMarks}/{scoreMax}
                </p>
              </>
            )}
            {feedbackWrong && (
              <>
                <p className="practice-run-result__answer-line muted">
                  You already answered this question. Use Explain or Study Mode to review.
                </p>
                <p className="practice-run-result__delta">−1 Mark</p>
                <p className="practice-run-result__score-line">
                  Current Score: {scoreMarks}/{scoreMax}
                </p>
              </>
            )}
            {activeTile?.status === "skipped" && (
              <p className="practice-run-result__score-line">
                Current Score: {scoreMarks}/{scoreMax}
              </p>
            )}
          </div>
        </div>
        {(feedbackCorrect || feedbackWrong) && renderPracticeAnswerActions(!!feedbackCorrect)}
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

  function renderQuestionNavRow() {
    return (
      <>
      {variantPreview && !variantChecked && (
        <p className="practice-run-variant-preview-hint muted">
          Practice this AI variation with <strong>Check answer</strong>. Switch to{" "}
          <strong>Original</strong> when you&apos;re ready to submit for session marks.
        </p>
      )}
      <div className="practice-run-actions practice-run-actions--trio">
        <button
          type="button"
          className="practice-run-nav-btn"
          disabled={!prevId || busy}
          onClick={goPrev}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Previous
        </button>
        {variantPreview ? (
          <button
            type="button"
            className="practice-submit-btn practice-run-submit practice-run-submit--center practice-run-submit--variant"
            disabled={!canCheckVariant}
            onClick={checkVariant}
          >
            <span className="material-symbols-outlined">done</span>
            {busy ? "Checking…" : selected ? "Check answer" : "Select option"}
          </button>
        ) : (
          <button
            type="button"
            className="practice-submit-btn practice-run-submit practice-run-submit--center"
            disabled={!canSubmit}
            onClick={submit}
          >
            <span className="material-symbols-outlined">send</span>
            {busy ? "Submitting…" : selected ? "Submit" : "Select option"}
          </button>
        )}
        <button
          type="button"
          className="practice-run-nav-btn"
          disabled={!canGoNext || busy}
          onClick={handleNextQuestion}
        >
          Next
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
      <p className="practice-run-keyboard-hint muted">Use ← → arrow keys to move between questions</p>
      </>
    );
  }

  return (
    <main className={`practice-run-page practice-run-page--${routeMode}`}>
      <ProductModeBanner mode={routeMode} compact />
      <header className="practice-run-header sticky-below-header">
        <div className="practice-run-header__top">
          <Link to={backTo} className="practice-run-header__back">
            <span className="material-symbols-outlined">arrow_back</span>
            {backLabel}
          </Link>
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
            <SessionTimer startedAt={session.startedAt} label="Time" compact />
          </div>
        ) : (
          <>
            <div className="practice-run-header__score-row">
              <div className="practice-run-header__score-block">
                <span className="practice-run-header__score-label">Score</span>
                <strong className="practice-run-header__score-value">
                  {scoreMarks}/{scoreMax}
                </strong>
              </div>
              {session.status === "active" && (
                <SessionTimer startedAt={session.startedAt} label="Time" compact />
              )}
            </div>
            <div
              className="practice-run-header__stats"
              aria-label={`Score ${scoreMarks} of ${scoreMax}, ${answered} answered, ${remaining} remaining`}
            >
              <span className="practice-run-header-chip practice-run-header-chip--ok">
                <span className="material-symbols-outlined" aria-hidden>
                  check
                </span>
                {session.correctCount}
              </span>
              <span className="practice-run-header-chip practice-run-header-chip--bad">
                <span className="material-symbols-outlined" aria-hidden>
                  close
                </span>
                {session.wrongCount}
              </span>
              <span className="practice-run-header-chip practice-run-header-chip--skip">
                <span className="material-symbols-outlined" aria-hidden>
                  skip_next
                </span>
                {session.skipCount ?? 0}
              </span>
              <span className="practice-run-header-chip practice-run-header-chip--q">
                Session {currentQ}/{session.questionCount}
              </span>
            </div>
            <div className="practice-run-header__progress-meta">
              <span>Answered: {answered}</span>
              <span>Remaining: {Math.max(0, remaining)}</span>
            </div>
            <div
              className="practice-run-progress"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="practice-run-progress__fill" style={{ width: `${progressPct}%` }} />
            </div>
          </>
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
          />
        )}
      </header>

      <div className={`practice-run-layout${showPracticeAssistant ? " practice-run-layout--result" : ""}`}>
        <div className="practice-run-main practice-run-main--busy-host">
          {routeMode !== "test" && (
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

          {result ? (
            renderPracticeResult(result)
          ) : testAnswerSaved ? (
            <>
              {renderQuestionBlock(true)}
              {renderTestRevisitNav()}
            </>
          ) : tileLocked ? (
            <>
              {renderQuestionBlock(false)}
              {renderPracticeLockedReview()}
            </>
          ) : (
            <>
              {renderQuestionBlock(isTestActive)}

              {isImageQuestion(q) && (
                <section className="practice-run-options" aria-label="Answer options">
                  <p className="practice-run-options__label">Select one option</p>
                  <div className="practice-run-options__list">
                    {OPTIONS.map((opt) => {
                      const active = selected === opt.value;
                      const variantAnswer = variantCheck?.correctAnswer ?? "";
                      const isOptCorrect =
                        variantPreview && variantChecked && variantAnswer === opt.value;
                      const isOptWrong =
                        variantPreview && variantChecked && active && variantAnswer !== opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={busy || (variantPreview && variantChecked)}
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

              {renderQuestionNavRow()}
              {renderVariantPracticeResult()}
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
          {isTestActive ? (
            <TestRunSidebar assistant={assistantProps} />
          ) : (
            showAssistantPanel && <PracticeStudyAssistant {...assistantProps} layout="sidebar" />
          )}
        </aside>
      </div>

      {showAssistantPanel && !isTestActive && (
        <div className="practice-run-ai-inline lg:hidden">
          <PracticeStudyAssistant {...assistantProps} layout="inline" />
        </div>
      )}
      {isTestActive && (
        <div className="practice-run-ai-inline lg:hidden">
          <TestRunSidebar assistant={assistantProps} />
        </div>
      )}
    </main>
  );
}
