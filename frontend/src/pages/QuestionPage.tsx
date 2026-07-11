import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { fetchAllPackQuestions, fetchPack, fetchPackSiblingByQuestionNo, fetchQuestion, fetchQuestionFamily, fetchQuestionFresh, QuestionDetail, QuestionFamily, QuestionPublic } from "../api";
import { difficultyLabel, examDisplayName, marksLabel, questionHeadingTitle } from "../utils/labels";
import QuestionSecondaryActions from "../components/QuestionSecondaryActions";
import QuestionFeedbackPanel from "../components/QuestionFeedbackPanel";
import QuestionVariantSwitcher from "../components/QuestionVariantSwitcher";
import TextMcqQuestion from "../components/TextMcqQuestion";
import VariantSwitchLoader from "../components/VariantSwitchLoader";
import AppLoader from "../components/AppLoader";
import ZoomableImage from "../components/ZoomableImage";
import ProductModeBanner from "../components/ProductModeBanner";
import { applySeoConfig } from "../components/Seo";
import { browsePathFromPack, bankApiFilters, filterQuestionsForPractice, hasActiveBankClientFilters } from "../utils/practice";
import { hasDistinctSolution } from "../utils/questionSolution";
import OfficialSolutionBody from "../components/OfficialSolutionBody";
import AdminSolutionEditLink from "../components/AdminSolutionEditLink";
import { familyParentId, isPackSiblingNavigation, isSamePaperQuestion, variantSwitchLoaderForTarget } from "../utils/questionFamily";
import {
  beginVariantSwitch,
  clearVariantSwitchGate,
  resolveContentLoadingEnd,
  type VariantSwitchGate,
} from "../utils/variantSwitchTiming";
import { formatVariantTypeLabel, isAiVariantQuestion } from "../utils/variantLabels";
import {
  cacheBustImageUrl,
  hybridDiagramUrl,
  isImageQuestion,
  textMcqDisplayProps,
  usesQuestionCardLayout,
} from "../utils/questionRender";
import { seoExcerpt, seoPlainText } from "../utils/seoText";

const OPTIONS = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
];

function optionLabel(value: string) {
  return `Option ${value}`;
}

export default function QuestionPage() {
  const { questionId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState<QuestionDetail | null>(null);
  const [siblings, setSiblings] = useState<QuestionPublic[] | null>(null);
  const [siblingsLoading, setSiblingsLoading] = useState(false);
  const [packQuestionCount, setPackQuestionCount] = useState(0);
  const lastNavTotalRef = useRef(0);
  const siblingsLoadRef = useRef<Promise<QuestionPublic[]> | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [checked, setChecked] = useState(false);
  const [answerPeek, setAnswerPeek] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [family, setFamily] = useState<QuestionFamily | null>(null);
  const questionCacheRef = useRef(new Map<string, QuestionDetail>());
  const variantSwitchGateRef = useRef<VariantSwitchGate | null>(null);
  const returnQs = searchParams.toString();
  const familyParent = familyParentId(questionId, q?.parentQuestionId);

  useEffect(() => {
    setError("");
    setChecked(false);
    setAnswerPeek(false);
    setSolutionOpen(false);
    setSelected("");
    if (!questionId) return;

    const samePaper = isSamePaperQuestion(questionId, q);
    const packSibling = isPackSiblingNavigation(questionId, q);
    const cached = questionCacheRef.current.get(questionId);
    const cacheStale =
      cached?.sourceType === "ai_variant" &&
      (!cached.options?.length || !cached.questionFormat);
    if ((samePaper || packSibling) && cached && !cacheStale) {
      setQ(cached);
      resolveContentLoadingEnd(variantSwitchGateRef, questionId, setContentLoading);
      return;
    }
    if (!samePaper && !packSibling) {
      setQ(null);
      setContentLoading(false);
    } else if (variantSwitchGateRef.current?.targetId !== questionId) {
      setContentLoading(true);
    }

    let cancelled = false;
    if (packSibling) {
      clearVariantSwitchGate(variantSwitchGateRef);
    }
    fetchQuestion(questionId)
      .then((data) => {
        questionCacheRef.current.set(questionId, data);
        if (!cancelled) setQ(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (cancelled) {
          if (questionCacheRef.current.has(questionId)) {
            setContentLoading(false);
          }
          return;
        }
        resolveContentLoadingEnd(variantSwitchGateRef, questionId, setContentLoading);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId, user?.id]);

  useEffect(() => {
    if (q?.questionId !== questionId || !contentLoading) return;
    const gate = variantSwitchGateRef.current;
    if (gate?.targetId === questionId) {
      resolveContentLoadingEnd(variantSwitchGateRef, questionId, setContentLoading);
      return;
    }
    setContentLoading(false);
  }, [q?.questionId, questionId, contentLoading]);

  useEffect(() => () => clearVariantSwitchGate(variantSwitchGateRef), []);

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

  const prefetchFamilyVariants = useCallback(() => {
    if (!family) return;
    const ids = [
      family.pyq.questionId,
      ...family.variants.map((v) => v.questionId),
    ];
    for (const id of ids) {
      const cached = questionCacheRef.current.get(id);
      const cacheStale =
        cached?.sourceType === "ai_variant" &&
        (!cached.options?.length || !cached.questionFormat);
      if (cached && !cacheStale) continue;
      void fetchQuestion(id).then((data) => questionCacheRef.current.set(id, data));
    }
  }, [family]);

  useEffect(() => {
    if (!checked) setSolutionOpen(false);
  }, [checked, questionId]);

  useEffect(() => {
    if (!solutionOpen || !checked || !questionId) return;
    let cancelled = false;
    void fetchQuestionFresh(questionId)
      .then((data) => {
        if (cancelled) return;
        questionCacheRef.current.set(questionId, data);
        setQ(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [solutionOpen, checked, questionId]);

  useEffect(() => {
    setFeedbackOpen(false);
  }, [questionId]);

  useEffect(() => {
    setSiblings(null);
    siblingsLoadRef.current = null;
    setPackQuestionCount(0);
  }, [q?.packId, returnQs]);

  useEffect(() => {
    if (!q?.packId) return;
    let cancelled = false;
    fetchPack(q.packId)
      .then((pack) => {
        if (!cancelled && pack.questionCount > 0) setPackQuestionCount(pack.questionCount);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [q?.packId]);

  const loadSiblings = useCallback(async (): Promise<QuestionPublic[]> => {
    if (!q?.packId) return [];
    if (siblings !== null) return siblings;
    if (siblingsLoadRef.current) return siblingsLoadRef.current;
    setSiblingsLoading(true);
    const promise = fetchAllPackQuestions(q.packId, {
      subject: searchParams.get("subject") || undefined,
      chapter: searchParams.get("chapter") || undefined,
    })
      .then((res) =>
        filterQuestionsForPractice(res.content, {
          topic: searchParams.get("topic") || undefined,
          difficulty: searchParams.get("difficulty") || undefined,
        })
      )
      .then((filtered) => {
        setSiblings(filtered);
        return filtered;
      })
      .catch(() => {
        setSiblings([]);
        return [] as QuestionPublic[];
      })
      .finally(() => {
        setSiblingsLoading(false);
        siblingsLoadRef.current = null;
      });
    siblingsLoadRef.current = promise;
    return promise;
  }, [q?.packId, returnQs, siblings, searchParams]);

  useEffect(() => {
    if (!q) return;

    const schemaBase = (stem: string, options?: { label: string; text: string }[]) => ({
      questionText: stem,
      options,
      exam: examDisplayName(q.exam, q.year),
      year: q.year,
      subject: q.subject,
      chapter: q.chapter,
      questionNo: q.questionNo,
      ...(user && q.answer?.trim()
        ? {
            correctAnswer: q.answer,
            correctAnswerText: q.solutionTextPreview || undefined,
            solutionImageUrl: q.solutionImageUrl || undefined,
          }
        : {}),
    });

    const exam = examDisplayName(q.exam, q.year);
    const topic = q.topic || q.chapter || q.subject || "NEET";
    const variantLabel = isAiVariantQuestion(q)
      ? `${formatVariantTypeLabel(q.variantType, q.variantNo)}`
      : `Question ${q.questionNo}`;
    const preview = seoExcerpt(q.questionTextPreview, 135);
    const questionSnippet = preview
      ? preview.length > 60
        ? `${preview.slice(0, 57)}...`
        : preview
      : variantLabel;
    const title = `${exam} ${q.year} ${q.subject} ${questionSnippet} - ${topic} Solution | EduMaster AI`;
    const description =
      preview ||
      `Practice ${exam} ${q.subject} question ${q.questionNo} from ${topic} with answer checking, solution support, and AI study guidance.`;

    applySeoConfig({
      title,
      description,
      path: `/solve/${questionId}`,
      type: "article",
      questionSchema: schemaBase(
        seoPlainText(q.questionTextPreview) || q.questionTextPreview || `${exam} ${q.year} ${q.subject} ${variantLabel}`,
        q.options?.map((opt, i) => ({
          label: String.fromCharCode(65 + i),
          text: seoPlainText(opt.text) || opt.text,
        }))
      ),
    });
  }, [q, questionId, user]);

  const goToQuestion = useCallback(
    (id: string) => {
      if (id === questionId) return;
      if (isSamePaperQuestion(id, q)) {
        beginVariantSwitch(variantSwitchGateRef, id, setContentLoading);
      } else if (isPackSiblingNavigation(id, q)) {
        clearVariantSwitchGate(variantSwitchGateRef);
        setContentLoading(true);
      }
      navigate(`/solve/${id}?${new URLSearchParams(searchParams).toString()}`);
    },
    [navigate, searchParams, questionId, q]
  );

  const anchorQuestionNo = useCallback((): number => {
    if (!q) return 0;
    const anchorId = familyParentId(questionId, q.parentQuestionId);
    if (family?.pyq.questionId === anchorId) return family.pyq.questionNo;
    if (q.parentQuestionId?.trim()) {
      const fromList = siblings?.find((item) => item.questionId === anchorId);
      if (fromList && fromList.questionNo > 0) return fromList.questionNo;
    }
    return q.questionNo;
  }, [q, questionId, family, siblings]);

  const resolveSiblingTarget = useCallback(
    async (direction: "prev" | "next"): Promise<string | null> => {
      if (!q?.packId) return null;
      const anchorId = familyParentId(questionId, q.parentQuestionId);
      const questionNo = anchorQuestionNo();

      if (questionNo > 0 && !hasActiveBankClientFilters(searchParams)) {
        const byNo = await fetchPackSiblingByQuestionNo(
          q.packId,
          questionNo,
          direction,
          bankApiFilters(searchParams)
        );
        if (byNo) return byNo;
        if (direction === "next" && packQuestionCount > 0 && questionNo >= packQuestionCount) {
          return null;
        }
      }

      const list = await loadSiblings();
      const idx = list.findIndex((p) => p.questionId === anchorId);
      if (idx >= 0) {
        const target = direction === "prev" ? list[idx - 1] : list[idx + 1];
        return target?.questionId ?? null;
      }

      if (questionNo > 0) {
        return fetchPackSiblingByQuestionNo(
          q.packId,
          questionNo,
          direction,
          bankApiFilters(searchParams)
        );
      }
      return null;
    },
    [q, questionId, anchorQuestionNo, searchParams, packQuestionCount, loadSiblings]
  );

  const goToSibling = useCallback(
    async (direction: "prev" | "next") => {
      setError("");
      const targetId = await resolveSiblingTarget(direction);
      if (targetId) {
        goToQuestion(targetId);
        return;
      }
      if (hasActiveBankClientFilters(searchParams)) {
        setError("No more questions in this filtered set.");
      }
    },
    [resolveSiblingTarget, goToQuestion, searchParams]
  );
  const nav = useMemo(() => {
    if (!siblings) {
      return { idx: -1, prev: null, next: null, total: 0, loaded: false };
    }
    const anchorId = familyParentId(questionId, q?.parentQuestionId);
    const idx = siblings.findIndex((p) => p.questionId === anchorId);
    return {
      idx,
      prev: idx > 0 ? siblings[idx - 1] : null,
      next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
      total: siblings.length,
      loaded: true,
    };
  }, [siblings, questionId, q?.parentQuestionId]);

  if (nav.loaded && nav.total > 0) {
    lastNavTotalRef.current = nav.total;
  }

  const bankSiblingNav = Boolean(q?.packId);

  const navPositionLabel = useMemo(() => {
    if (!bankSiblingNav || !q) return String(q?.questionNo ?? "");
    const anchorId = familyParentId(questionId, q.parentQuestionId);
    const siblingIdx =
      nav.idx >= 0
        ? nav.idx
        : siblings?.findIndex((p) => p.questionId === anchorId) ?? -1;
    const current =
      q.questionNo > 0
        ? q.questionNo
        : siblingIdx >= 0
          ? siblingIdx + 1
          : 1;
    const filteredTotal = nav.total > 0 ? nav.total : lastNavTotalRef.current;
    const total = packQuestionCount > 0 ? packQuestionCount : filteredTotal;
    if (total > 0) return `${current}/${total}`;
    if (siblingsLoading) return `${current}/…`;
    return String(current);
  }, [bankSiblingNav, nav, packQuestionCount, q, questionId, siblings, siblingsLoading]);

  const packSiblingSwitchPending =
    Boolean(q) && isPackSiblingNavigation(questionId, q) && (contentLoading || q!.questionId !== questionId);

  const optimisticNav = useMemo(() => {
    const no = anchorQuestionNo();
    const total = packQuestionCount;
    if (no <= 0) return { canPrev: false, canNext: false };
    return {
      canPrev: no > 1,
      canNext: total > 0 ? no < total : true,
    };
  }, [anchorQuestionNo, packQuestionCount]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") void goToSibling("prev");
      if (e.key === "ArrowRight") void goToSibling("next");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToSibling]);

  useEffect(() => {
    if (!q?.packId || !hasActiveBankClientFilters(searchParams)) return;
    void loadSiblings();
  }, [q?.packId, returnQs, loadSiblings, searchParams]);

  function backHref() {
    if (q) return browsePathFromPack(q.packId, returnQs);
    return "/practice?exam=NEET#question-bank";
  }

  const correctAnswer = q?.answer?.trim() ?? "";
  const isCorrect = checked && selected === correctAnswer;
  const isWrong = checked && selected !== "" && selected !== correctAnswer;
  const showCorrect = (answerPeek || checked) && Boolean(correctAnswer);
  const showWrong = checked && isWrong;

  const hasSolution =
    Boolean(q?.hasSolution) ||
    Boolean(q?.solutionImageUrl?.trim()) ||
    Boolean(q?.solutionTextPreview?.trim());
  const distinctSolution = q ? hasDistinctSolution(q) : false;
  const showSolutionPanel = solutionOpen && hasSolution && distinctSolution && checked;
  const loginNext = `${location.pathname}${location.search}`;
  const loginHref = `/login?next=${encodeURIComponent(loginNext)}`;

  const variantLoader = useMemo(() => {
    if (!contentLoading || q?.questionId === questionId) return null;
    return variantSwitchLoaderForTarget(questionId, family);
  }, [contentLoading, questionId, family, q?.questionId]);

  const questionPending = Boolean(
    q &&
      (packSiblingSwitchPending || (contentLoading && q.questionId !== questionId))
  );

  const showLastInSetHint =
    bankSiblingNav &&
    ((nav.loaded && !nav.next && nav.idx >= 0) ||
      (!nav.loaded && !optimisticNav.canNext && packQuestionCount > 0));

  function renderFooterNav(extraClass: string, variantChrome: boolean) {
    return (
      <>
        {showLastInSetHint && (
          <p className="solve-page__nav-hint muted">Last question in this set.</p>
        )}
        <footer
          className={`solve-page__footer-nav ${extraClass}${
            variantChrome ? " solve-page__footer-nav--variant" : ""
          }`}
          aria-label="Question navigation"
        >
          <button
            type="button"
            className="practice-run-nav-btn solve-page__nav-btn"
            disabled={
              !bankSiblingNav ||
              siblingsLoading ||
              (nav.loaded ? !nav.prev : !optimisticNav.canPrev)
            }
            onClick={() => void goToSibling("prev")}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="solve-page__nav-label">Prev</span>
          </button>
          <span
            className={`solve-page__nav-pos${
              variantChrome && !navPositionLabel.includes("/")
                ? " solve-page__nav-pos--disc"
                : ""
            }`}
          >
            {navPositionLabel}
          </span>
          <button
            type="button"
            className={`practice-run-nav-btn solve-page__nav-btn${
              variantChrome ? " solve-page__nav-btn--next" : ""
            }`}
            disabled={
              !bankSiblingNav ||
              siblingsLoading ||
              (nav.loaded ? !nav.next : !optimisticNav.canNext)
            }
            onClick={() => void goToSibling("next")}
          >
            <span className="solve-page__nav-label">Next</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </footer>
      </>
    );
  }

  function renderImageOptions() {
    return (
      <section className="practice-run-options" aria-label="Answer options">
        <p className="practice-run-options__label">Select one option</p>
        <div className="practice-run-options__list">
          {OPTIONS.map((opt) => {
            const active = selected === opt.value;
            const isOptCorrect = showCorrect && correctAnswer === opt.value;
            const isOptWrong = showWrong && active;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={checked && isCorrect}
                onClick={() => setSelected(opt.value)}
                className={`practice-run-option${active ? " is-selected" : ""}${
                  isOptCorrect ? " is-correct" : ""
                }${isOptWrong ? " is-wrong" : ""}`}
                aria-label={optionLabel(opt.label)}
                aria-pressed={active}
              >
                <span className="practice-run-option__badge">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <main className="solve-page pt-24">
        <p className="text-error">{error}</p>
        <Link to={backHref()} className="practice-run-header__back solve-page__back glass-card inline-flex mt-md">
          <span className="material-symbols-outlined">arrow_back</span>
          Back to question bank
        </Link>
      </main>
    );
  }

  if (!q) {
    return (
      <main className="solve-page pt-24">
        <Link to={backHref()} className="practice-run-header__back solve-page__back">
          <span className="material-symbols-outlined">arrow_back</span>
          Back to question bank
        </Link>
        <section className="glass-card content-loader-panel">
          <AppLoader
            variant="inline"
            label="Loading question…"
            hint="Fetching question details"
            icon="menu_book"
          />
        </section>
      </main>
    );
  }

  const diff = difficultyLabel(q.difficulty);
  const isAiVariant = isAiVariantQuestion(q) || variantLoader?.mode === "ai";
  const imageMode = isImageQuestion(q);
  const questionCardChrome = isAiVariant || usesQuestionCardLayout(q);
  const mcqCard = textMcqDisplayProps(q);
  const adminEditHref = user?.admin
    ? `/admin/questions/${encodeURIComponent(questionId)}`
    : "";

  return (
    <main className={`solve-page lg:pt-4${questionCardChrome ? " solve-page--variant" : ""}`}>
      <ProductModeBanner mode="solve" compact split={questionCardChrome} />

      <div className="solve-page__meta">
        <Link to={backHref()} className="practice-run-header__back solve-page__back">
          <span className="material-symbols-outlined">arrow_back</span>
          Back to question bank
        </Link>
        <div className="solve-page__breadcrumb hidden md:flex flex-wrap items-center gap-xs text-on-surface-variant font-label-md">
          <span>{q.subject}</span>
          {q.chapter && (
            <>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span>{q.chapter}</span>
            </>
          )}
          {q.topic && (
            <>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="text-primary font-bold">{q.topic}</span>
            </>
          )}
        </div>
        <div className={`solve-page__meta-chips${questionCardChrome ? " solve-page__meta-chips--variant" : ""}`}>
          <span className="practice-run-chip practice-run-chip--meta practice-run-chip--exam">
            {examDisplayName(q.exam, q.year)} {q.year}
          </span>
          <span
            className={`practice-run-chip practice-run-chip--meta practice-run-chip--diff practice-run-chip--diff-${diff.toLowerCase()}`}
          >
            {diff}
          </span>
          <span className="practice-run-chip practice-run-chip--meta practice-run-chip--muted">
            {marksLabel(q.difficulty, q.questionNo)}
          </span>
        </div>
      </div>

      <div className="practice-run-layout">
        <div className="practice-run-main">
          <section
            key={questionId}
            className={`practice-run-question glass-card${questionCardChrome ? " practice-run-question--variant" : ""}`}
          >
            {!questionCardChrome && (
            <div className="practice-run-question__head">
              <div className="practice-run-question__titles">
                <h1 className="practice-run-question__title">
                  {questionPending
                    ? "Loading question…"
                    : questionHeadingTitle(
                        q.exam,
                        q.questionNo,
                        q.topic || q.chapter,
                        null
                      )}
                </h1>
              </div>
            </div>
            )}

            {!questionPending && (
              <QuestionVariantSwitcher
                questionId={questionId}
                family={family}
                onSelect={goToQuestion}
                onPrefetchVariants={prefetchFamilyVariants}
              />
            )}

            <div
              className={`practice-run-question__media${
                variantLoader || questionPending
                  ? variantLoader?.mode === "ai" || questionPending
                    ? " practice-run-question__media--variant-generating"
                    : " practice-run-question__media--variant-loading"
                  : ""
              }`}
            >
              {variantLoader || questionPending ? (
                <VariantSwitchLoader
                  mode={variantLoader?.mode ?? "normal"}
                  label={variantLoader?.label ?? ""}
                />
              ) : imageMode ? (
                <ZoomableImage
                  src={cacheBustImageUrl(q.questionImageUrl, questionId)}
                  alt={`Question ${q.questionNo}`}
                />
              ) : (
                <TextMcqQuestion
                  questionText={q.questionTextPreview || "No question text"}
                  options={q.options ?? []}
                  selected={selected}
                  onSelect={setSelected}
                  disabled={checked && isCorrect}
                  correctAnswer={correctAnswer}
                  showCorrect={showCorrect}
                  showWrong={showWrong}
                  questionFormat={q.questionFormat}
                  variantType={q.variantType}
                  assertion={q.assertion}
                  reason={q.reason}
                  statements={q.statements}
                  matchListA={q.matchListA}
                  matchListB={q.matchListB}
                  questionId={q.questionId}
                  questionImageUrl={hybridDiagramUrl(q)}
                  questionDiagramSvg={q.questionDiagramSvg}
                  assetPlacements={q.assetPlacements}
                  renderMode={q.renderMode}
                  sourceType={q.sourceType}
                  contentTextNormalized={q.contentTextNormalized}
                  adminEditHref={adminEditHref}
                  {...mcqCard}
                />
              )}
            </div>
          </section>

          {!questionPending && imageMode && renderImageOptions()}

          {!questionPending && (
          <>
          <div className="solve-page__actions">
            <button
              type="button"
              className={`practice-submit-btn solve-page__check-btn${
                checked && isCorrect ? " practice-run-result--correct" : ""
              }`}
              disabled={!selected || (checked && isCorrect)}
              onClick={() => setChecked(true)}
            >
              <span className="material-symbols-outlined">
                {checked && isCorrect ? "check_circle" : "done"}
              </span>
              {checked ? (isCorrect ? "Correct" : "Checked") : "Check answer"}
            </button>
          </div>

          <QuestionSecondaryActions
            questionId={questionId}
            hasSolution={user ? distinctSolution : q.hasSolution}
            solutionAllowed={checked}
            solutionOpen={solutionOpen}
            guestSolutionLocked={!user}
            loginHref={loginHref}
            onToggleSolution={() => {
              if (!checked) return;
              setSolutionOpen((v) => !v);
            }}
            onReport={() => {
              setFeedbackOpen(true);
              requestAnimationFrame(() => {
                const target =
                  window.matchMedia("(min-width: 1024px)").matches
                    ? document.querySelector(".practice-run-aside .solve-page__feedback")
                    : document.getElementById("question-report");
                target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              });
            }}
          />

          {!checked && (
            <p className="solve-page__submit-hint muted">
              Answer will be revealed after you check.
            </p>
          )}

          {answerPeek && !checked && correctAnswer && (
            <p className="solve-page__answer-banner" role="status">
              Correct answer: <strong>{optionLabel(correctAnswer)}</strong>
            </p>
          )}

          {showSolutionPanel && (
            <section className="solve-page__solution glass-card" aria-label="Official solution">
              <div className="solve-page__solution-head">
                <span className="material-symbols-outlined">menu_book</span>
                <h2 className="solve-page__solution-title">Official solution</h2>
                {user?.admin ? <AdminSolutionEditLink questionId={questionId} /> : null}
              </div>
              <OfficialSolutionBody
                questionId={questionId}
                questionNo={q.questionNo}
                assetPlacements={q.assetPlacements}
                solutionAssetPlacements={q.solutionAssetPlacements}
                solutionTextPreview={q.solutionTextPreview}
                solutionImageUrl={q.solutionImageUrl}
                solutionDiagramSvg={q.solutionDiagramSvg}
                contentTextNormalized={q.contentTextNormalized}
                renderMode={q.renderMode}
                sourceType={q.sourceType}
              />
            </section>
          )}

          {checked && (
            <section
              className={`practice-run-result practice-run-result--compact glass-card is-revealed${
                isCorrect ? " practice-run-result--correct" : " practice-run-result--wrong"
              }`}
            >
              <div className="practice-run-result__banner practice-run-result__banner--compact">
                <span className="practice-run-result__icon-wrap" aria-hidden>
                  <span
                    className="material-symbols-outlined practice-run-result__icon"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {isCorrect ? "check_circle" : "cancel"}
                  </span>
                </span>
                <div className="practice-run-result__content">
                  <h2 className="practice-run-result__title">
                    {isCorrect ? "Correct" : "Incorrect"}
                  </h2>
                  {!isCorrect && correctAnswer && (
                    <p className="practice-run-result__answer-line practice-run-result__answer-line--key">
                      Correct answer: {optionLabel(correctAnswer)}
                    </p>
                  )}
                  {selected && !isCorrect && (
                    <p className="practice-run-result__answer-line practice-run-result__answer-line--yours">
                      You chose {optionLabel(selected)}
                    </p>
                  )}
                  {isCorrect && selected && (
                    <p className="practice-run-result__answer-line practice-run-result__answer-line--yours">
                      You chose {optionLabel(selected)}
                    </p>
                  )}
                  {!user && (
                    <p className="practice-run-result__guest-unlock">
                      <Link to={loginHref} className="practice-run-result__guest-unlock-link">
                        Sign in
                      </Link>{" "}
                      to see the correct answer
                      {q.hasSolution ? " and the official solution" : ""}.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {renderFooterNav("solve-page__footer-nav--desktop", questionCardChrome)}
          </>
          )}
        </div>

        <aside className="practice-run-aside hidden lg:flex">
          {!questionPending && feedbackOpen && (
            <QuestionFeedbackPanel
              questionId={questionId}
              context="solve"
              compact
              hideToggle
              expanded={feedbackOpen}
              onExpandedChange={setFeedbackOpen}
              className="solve-page__feedback"
            />
          )}
        </aside>
      </div>

      <div className="solve-page__mobile-rail">
        {!questionPending && feedbackOpen && (
          <div id="question-report">
            <QuestionFeedbackPanel
              questionId={questionId}
              context="solve"
              compact
              hideToggle
              expanded={feedbackOpen}
              onExpandedChange={setFeedbackOpen}
              className="solve-page__feedback"
            />
          </div>
        )}
      </div>

      {renderFooterNav("solve-page__footer-nav--fixed", questionCardChrome)}
    </main>
  );
}
