import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ChapterProgress, PracticeSessionView } from "../api";
import {
  adminImportNeet,
  ExamCatalogEntry,
  fetchExams,
  fetchPacks,
  fetchQuestions,
  PackSummary,
  QuestionPublic,
  YearCatalogEntry,
} from "../api";
import BankResultsFeed, { BANK_PAGE_SIZE } from "./BankResultsFeed";
import BankSearchSection from "./BankSearchSection";
import BankSubjectGrid from "./BankSubjectGrid";
import ComingSoon from "./ComingSoon";
import AppLoader from "./AppLoader";
import FilterPanel, { activeFilterCount } from "./FilterPanel";
import PracticeBankCoachRail, { type BankSessionStart } from "./PracticeBankCoachRail";
import PracticeBankStartBanner from "./PracticeBankStartBanner";
import { buildSubjectTiles } from "../utils/bankSubjects";
import { useAuth } from "../auth/AuthContext";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";
import { findExam } from "../utils/exams";
import {
  bankDisplayPacks,
  clampPracticeQuestionCount,
  DEFAULT_PRACTICE_QUESTIONS,
  estimatedDrillMinutes,
  formatPackLabel,
  practicePoolMax,
} from "../utils/practiceHub";

export type { BankSessionStart };

type Props = {
  className?: string;
  onStartSession?: (opts: BankSessionStart) => void;
  sessionBusy?: boolean;
  resumeSession?: PracticeSessionView | null;
  resumeUrl?: string | null;
};

export default function QuestionBankSection({
  className = "",
  onStartSession,
  sessionBusy = false,
  resumeSession = null,
  resumeUrl = null,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();

  const examFilter = searchParams.get("exam") || "NEET";
  const yearFilter = searchParams.get("year") || "";
  const subject = searchParams.get("subject") || "";
  const chapter = searchParams.get("chapter") || "";
  const topic = searchParams.get("topic") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const qSearch = (searchParams.get("q") || "").toLowerCase();
  const page = Number(searchParams.get("page") || "0");
  const pageSize = BANK_PAGE_SIZE;
  const activePackId = searchParams.get("packId") || "";

  const [catalog, setCatalog] = useState<ExamCatalogEntry[]>([]);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const skipResultsScrollRef = useRef(true);
  const [error, setError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [questionCount, setQuestionCount] = useState(DEFAULT_PRACTICE_QUESTIONS);
  const [adaptive, setAdaptive] = useState(true);
  const { user, progress } = useAuth();
  const { settings } = usePlatformSettings();

  const selectedExam = findExam(catalog, examFilter);
  const neetAvailable = packs.length > 0 || (findExam(catalog, "NEET")?.availableYears ?? 0) > 0;
  const bankPacks = useMemo(() => bankDisplayPacks(packs), [packs]);
  const subjectTiles = useMemo(() => buildSubjectTiles(bankPacks), [bankPacks]);
  const showComingSoon = examFilter !== "NEET" && selectedExam?.status !== "available";
  const neetYears: YearCatalogEntry[] = useMemo(() => {
    const fromCatalog = findExam(catalog, "NEET")?.years ?? [];
    const availableFromCatalog = fromCatalog.filter((y) => y.status === "available");
    if (availableFromCatalog.length > 0) return availableFromCatalog;
    return bankPacks.map((p) => ({
      year: p.year,
      status: "available" as const,
      packId: p.packId,
      questionCount: p.questionCount,
      message: null,
    }));
  }, [catalog, bankPacks]);

  useEffect(() => {
    setCatalogLoading(true);
    Promise.allSettled([fetchExams(), fetchPacks()]).then(([examsResult, packsResult]) => {
      if (examsResult.status === "fulfilled") setCatalog(examsResult.value);
      if (packsResult.status === "fulfilled") setPacks(packsResult.value);
      if (examsResult.status === "rejected" && packsResult.status === "rejected") {
        setError(
          examsResult.reason instanceof Error ? examsResult.reason.message : "Could not load question bank"
        );
      }
    }).finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (catalog.length && !searchParams.get("exam")) {
      const next = new URLSearchParams(searchParams);
      next.set("exam", "NEET");
      setSearchParams(next, { replace: true });
    }
  }, [catalog, searchParams, setSearchParams]);

  const resolvedPackId = useMemo(() => {
    if (showComingSoon) return "";
    if (activePackId && packs.some((p) => p.packId === activePackId)) return activePackId;
    if (yearFilter) {
      const fromCatalog = neetYears.find(
        (y) => String(y.year) === yearFilter && y.status === "available" && y.packId
      );
      if (fromCatalog?.packId) return fromCatalog.packId;
    }
    return packs[0]?.packId || "";
  }, [showComingSoon, activePackId, packs, yearFilter, neetYears]);

  const pack = useMemo(
    () => packs.find((p) => p.packId === resolvedPackId) ?? null,
    [packs, resolvedPackId]
  );

  const facetPoolMax = useMemo(
    () => practicePoolMax(pack, subject || undefined, chapter || undefined, "pyq"),
    [pack, subject, chapter]
  );
  const poolMax = useMemo(() => {
    if (totalElements > 0) return Math.min(facetPoolMax, totalElements);
    return facetPoolMax;
  }, [facetPoolMax, totalElements]);
  const sessionSize = useMemo(
    () => clampPracticeQuestionCount(questionCount, poolMax),
    [questionCount, poolMax]
  );

  useEffect(() => {
    setQuestionCount((c) => clampPracticeQuestionCount(c, poolMax));
  }, [poolMax]);

  const bankStats = useMemo(() => {
    const subjects = pack?.facets?.subjects?.length ?? 0;
    const chapters = pack?.facets?.chapters?.length ?? 0;
    return {
      questions: totalElements > 0 ? totalElements : pack?.questionCount ?? 0,
      subjects,
      chapters,
      year: pack?.year,
    };
  }, [pack, totalElements]);

  useEffect(() => {
    if (!resolvedPackId || showComingSoon) {
      setQuestions([]);
      setTotalElements(0);
      setTotalPages(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchQuestions(resolvedPackId, {
      subject: subject || undefined,
      chapter: chapter || undefined,
      topic: topic || undefined,
      difficulty: difficulty || undefined,
      q: qSearch || undefined,
      page,
      size: pageSize,
    })
      .then((res) => {
        setQuestions(res.content);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [resolvedPackId, subject, chapter, topic, difficulty, qSearch, page, pageSize, showComingSoon]);

  useEffect(() => {
    if (loading || !resolvedPackId) return;
    if (skipResultsScrollRef.current) {
      skipResultsScrollRef.current = false;
      return;
    }
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page, subject, chapter, topic, difficulty, qSearch, resolvedPackId, loading]);

  function goToPage(nextPage: number) {
    updateParam("page", String(Math.max(0, nextPage)));
  }

  const subjects = pack?.facets?.subjects || [];
  const chapters = (pack?.facets?.chapters || []).filter((c) => !subject || c.subject === subject);
  const topics = [...new Set(questions.map((q) => q.topic).filter(Boolean))].sort();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "subject") {
      next.delete("chapter");
      next.delete("topic");
    }
    if (key === "year" && value) {
      const yearEntry = neetYears.find((y) => String(y.year) === value);
      if (yearEntry?.status === "coming_soon") return;
      if (yearEntry?.packId) next.set("packId", yearEntry.packId);
    }
    if (key !== "page") next.set("page", "0");
    setSearchParams(next);
  }

  function clearFilters() {
    const next = new URLSearchParams(searchParams);
    ["year", "subject", "chapter", "topic", "difficulty", "q", "packId"].forEach((k) => next.delete(k));
    next.set("exam", "NEET");
    next.set("page", "0");
    setSearchParams(next);
  }

  function goToNeet() {
    const next = new URLSearchParams();
    next.set("exam", "NEET");
    setSearchParams(next);
  }

  function selectPack(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("packId", id);
    next.set("page", "0");
    setSearchParams(next);
  }

  const totalShown = totalElements;
  const weakChapters = progress?.weakChapters ?? [];
  const filterCount = activeFilterCount({
    exam: examFilter !== "NEET" ? examFilter : "",
    year: yearFilter,
    subject,
    chapter,
    topic,
    difficulty,
  });

  const filterProps = {
    totalShown,
    examFilter: "NEET",
    resolvedPackId,
    activePackYear: pack?.year,
    yearFilter,
    subject,
    chapter,
    topic,
    difficulty,
    filteredPacks: bankPacks,
    neetYears,
    subjects,
    chapters,
    topics,
    onUpdateParam: updateParam,
    onPackChange: selectPack,
    questionCount,
    poolMax,
    onQuestionCount: setQuestionCount,
    adaptive,
    onAdaptiveChange: setAdaptive,
  };

  function applyWeakChapter(ch: ChapterProgress) {
    const next = new URLSearchParams(searchParams);
    next.set("exam", "NEET");
    next.set("subject", ch.subject);
    next.set("chapter", ch.chapter);
    next.delete("page");
    setSearchParams(next);
  }

  function practiceWeakAreas() {
    const primary = weakChapters[0];
    if (primary) applyWeakChapter(primary);
  }

  const startBankSession = useCallback(() => {
    if (!resolvedPackId || !onStartSession) return;
    onStartSession({
      packId: resolvedPackId,
      subject: subject || undefined,
      chapter: chapter || undefined,
      topic: topic || undefined,
      difficulty: difficulty || undefined,
      questionCount: sessionSize,
      adaptive,
    });
  }, [
    resolvedPackId,
    onStartSession,
    subject,
    chapter,
    topic,
    difficulty,
    sessionSize,
    adaptive,
  ]);

  const estMinutes = estimatedDrillMinutes(sessionSize);

  const coachRailProps = {
    weakChapters,
    resumeSession,
    resumeUrl,
    packLabel: pack ? formatPackLabel(pack.packId) : undefined,
    learningInsightText: settings.learningInsightText,
    learningInsightHighlight: settings.learningInsightHighlight,
    signedIn: Boolean(user),
    onPracticeWeakAreas: practiceWeakAreas,
    onApplyWeakChapter: applyWeakChapter,
  };

  const canStartSession =
    Boolean(resolvedPackId) && sessionSize > 0 && totalElements > 0 && Boolean(onStartSession);

  const activeChips: { key: string; label: string }[] = [];
  if (yearFilter) activeChips.push({ key: "year", label: yearFilter });
  if (subject) activeChips.push({ key: "subject", label: subject });
  if (chapter) activeChips.push({ key: "chapter", label: chapter });
  if (topic) activeChips.push({ key: "topic", label: topic });
  if (difficulty) activeChips.push({ key: "difficulty", label: difficulty });

  if (showComingSoon) {
    return (
      <section className={`practice-bank-section ${className}`.trim()} id="question-bank">
        <ComingSoon
          examName={selectedExam?.name || examFilter}
          description={
            selectedExam?.description || "This exam is on our roadmap and will be available soon."
          }
          onBack={goToNeet}
        />
      </section>
    );
  }

  return (
    <section
      className={`practice-bank-section bank-page px-margin-mobile ${className}`.trim()}
      id="question-bank"
      aria-label="Question bank"
    >
      {pack && (
        <ul className="practice-bank-stats practice-bank-stats--row" aria-label="Bank overview">
          <li>
            <strong>{bankStats.questions}</strong>
            <span>Questions</span>
          </li>
          <li>
            <strong>{bankStats.chapters}</strong>
            <span>Chapters</span>
          </li>
          <li>
            <strong>{bankStats.subjects}</strong>
            <span>Subjects</span>
          </li>
          {bankStats.year && (
            <li>
              <strong>{bankStats.year}</strong>
              <span>Year</span>
            </li>
          )}
        </ul>
      )}

      <div
        className={`fixed inset-0 z-[60] transition-transform duration-300 lg:hidden ${
          filtersOpen ? "" : "translate-x-full pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setFiltersOpen(false)}
          aria-hidden
        />
        <div className="absolute right-0 top-0 bottom-0 w-[min(100vw,20rem)] bg-surface-container-high p-lg flex flex-col custom-scrollbar overflow-y-auto">
          <FilterPanel {...filterProps} onClose={() => setFiltersOpen(false)} />
        </div>
      </div>

      <div className="practice-bank-grid">
        <aside className="practice-bank-grid__filters hidden lg:flex">
          <div className="practice-bank-rail practice-bank-rail--filters">
            <div className="practice-bank-rail__body custom-scrollbar">
              <FilterPanel {...filterProps} />
            </div>
            <footer className="practice-bank-rail__foot">
              <p className="practice-bank-rail__foot-stat">
                <strong>{totalShown.toLocaleString()}</strong> matching
              </p>
              <p className="practice-bank-rail__foot-hint muted">
                Session: {sessionSize} questions · ~{estMinutes} min
              </p>
            </footer>
          </div>
        </aside>

        <div className="practice-bank-grid__main space-y-gutter min-w-0">
          <BankSearchSection onOpenFilters={() => setFiltersOpen(true)} />

          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-sm">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className="badge-pill"
                  onClick={() => updateParam(chip.key, "")}
                  aria-label={`Remove ${chip.label} filter`}
                >
                  {chip.label} ×
                </button>
              ))}
              <button type="button" className="font-caption text-primary" onClick={clearFilters}>
                Clear all
              </button>
            </div>
          )}

          {catalogLoading && !neetAvailable && (
            <section className="glass-card content-loader-panel">
              <AppLoader
                variant="inline"
                label="Loading question bank…"
                hint="Checking available NEET papers"
                icon="menu_book"
              />
            </section>
          )}

          {!catalogLoading && !neetAvailable && !loading && (
            <div className="neet-import-hint card">
              <h2>NEET data not loaded yet</h2>
              {user?.admin ? (
                <>
                  <p className="muted">
                    Import published NEET folders from your extractor ({importBusy ? "running…" : "ready"}).
                  </p>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={importBusy}
                    onClick={async () => {
                      setImportBusy(true);
                      setImportMsg("");
                      try {
                        const res = await adminImportNeet();
                        setImportMsg(
                          typeof res.message === "string"
                            ? res.message
                            : `Imported ${res.questionsImported ?? "?"} questions`
                        );
                        window.location.reload();
                      } catch (e) {
                        setImportMsg(e instanceof Error ? e.message : "Import failed");
                      } finally {
                        setImportBusy(false);
                      }
                    }}
                  >
                    {importBusy ? "Importing…" : "Import all NEET data"}
                  </button>
                  <Link to="/admin" className="btn" style={{ marginTop: "0.5rem", display: "inline-block" }}>
                    More admin tools
                  </Link>
                  {importMsg && <p className="muted">{importMsg}</p>}
                </>
              ) : (
                <>
                  <p className="muted">An administrator must import published NEET manifests.</p>
                  <p className="muted">Sign in with the admin account, then open Admin to sync data.</p>
                </>
              )}
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
          {loading && neetAvailable && (
            <section className="glass-card content-loader-panel">
              <AppLoader
                variant="inline"
                label="Loading questions…"
                hint="Fetching question bank"
                icon="menu_book"
              />
            </section>
          )}

          {neetAvailable && subjectTiles.length > 0 && !subject && (
            <BankSubjectGrid tiles={subjectTiles} exam={examFilter} compact />
          )}

          {!loading && neetAvailable && resolvedPackId && questions.length > 0 && (
            <BankResultsFeed
              ref={resultsRef}
              questions={questions}
              packId={resolvedPackId}
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              packLabel={pack ? `NEET ${pack.year}` : undefined}
              filterCount={filterCount}
              loading={loading}
              sessionSize={sessionSize}
              estMinutes={estMinutes}
              onNextPage={() => goToPage(page + 1)}
              onPrevPage={() => goToPage(page - 1)}
            />
          )}

          {!loading && questions.length === 0 && resolvedPackId && neetAvailable && (
            <p className="muted state-msg">No questions match these filters.</p>
          )}

          <aside className="practice-bank-coach-mobile lg:hidden" aria-label="Practice coach">
            <PracticeBankCoachRail {...coachRailProps} />
          </aside>
        </div>

        <aside className="practice-bank-grid__coach hidden lg:flex">
          <div className="practice-bank-rail practice-bank-rail--coach">
            <div className="practice-bank-rail__body custom-scrollbar">
              <PracticeBankCoachRail {...coachRailProps} />
            </div>
          </div>
        </aside>
      </div>

      {onStartSession && (
        <div className="practice-bank-start-banner-anchor">
          <PracticeBankStartBanner
            sessionSize={sessionSize}
            estMinutes={estMinutes}
            adaptive={adaptive}
            pack={pack}
            busy={sessionBusy}
            disabled={!canStartSession}
            signedIn={Boolean(user)}
            onStart={startBankSession}
          />
        </div>
      )}
    </section>
  );
}
