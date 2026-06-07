import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  adminImportNeet,
  ExamCatalogEntry,
  fetchExams,
  fetchPack,
  fetchPacks,
  fetchQuestions,
  PackSummary,
  QuestionPublic,
  YearCatalogEntry,
} from "../api";
import BankResultsFeed, { BANK_PAGE_SIZE } from "../components/BankResultsFeed";
import BankSearchSection from "../components/BankSearchSection";
import BankSubjectGrid from "../components/BankSubjectGrid";
import ComingSoon from "../components/ComingSoon";
import FilterPanel, { activeFilterCount } from "../components/FilterPanel";
import { buildSubjectTiles } from "../utils/bankSubjects";
import { useAuth } from "../auth/AuthContext";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";
import { primaryWeakChapter } from "../utils/weakChapters";
import { defaultExamId, findExam } from "../utils/exams";
import { bankDisplayPacks } from "../utils/practiceHub";

export default function BrowsePage() {
  const { pathname } = useLocation();
  const { packId: packIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const examFilter = searchParams.get("exam") || "NEET";
  const yearFilter = searchParams.get("year") || "";
  const subject = searchParams.get("subject") || "";
  const chapter = searchParams.get("chapter") || "";
  const topic = searchParams.get("topic") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const qSearch = (searchParams.get("q") || "").toLowerCase();
  const page = Number(searchParams.get("page") || "0");
  const pageSize = BANK_PAGE_SIZE;

  const [catalog, setCatalog] = useState<ExamCatalogEntry[]>([]);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [pack, setPack] = useState<PackSummary | null>(null);
  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const skipResultsScrollRef = useRef(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const { user, progress } = useAuth();
  const { settings } = usePlatformSettings();

  const selectedExam = findExam(catalog, examFilter);
  const neetAvailable = packs.length > 0 || (findExam(catalog, "NEET")?.availableYears ?? 0) > 0;
  const bankPacks = useMemo(() => bankDisplayPacks(packs), [packs]);
  const subjectTiles = useMemo(() => buildSubjectTiles(bankPacks), [bankPacks]);
  const showComingSoon = examFilter !== "NEET" && selectedExam?.status !== "available";
  const neetYears: YearCatalogEntry[] =
    findExam(catalog, "NEET")?.years ||
    packs.map((p) => ({
      year: p.year,
      status: "available" as const,
      packId: p.packId,
      questionCount: p.questionCount,
      message: null,
    }));

  useEffect(() => {
    Promise.allSettled([fetchExams(), fetchPacks()]).then(([examsResult, packsResult]) => {
      if (examsResult.status === "fulfilled") {
        setCatalog(examsResult.value);
      } else {
        console.warn("Exam catalog unavailable:", examsResult.reason);
      }
      if (packsResult.status === "fulfilled") {
        setPacks(packsResult.value);
      } else {
        setError(packsResult.reason instanceof Error ? packsResult.reason.message : "Could not load packs");
      }
      if (examsResult.status === "rejected" && packsResult.status === "rejected") {
        setError(
          examsResult.reason instanceof Error ? examsResult.reason.message : "Could not load question bank"
        );
      }
    });
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
      next.set("exam", defaultExamId(catalog));
      setSearchParams(next, { replace: true });
    }
  }, [catalog, searchParams, setSearchParams]);

  const activePackId = packIdParam || searchParams.get("packId") || "";

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

  useEffect(() => {
    if (showComingSoon || pathname !== "/bank" || !resolvedPackId || packIdParam) return;
    navigate(`/pack/${resolvedPackId}?${searchParams.toString()}`, { replace: true });
  }, [showComingSoon, pathname, resolvedPackId, packIdParam, navigate, searchParams]);

  useEffect(() => {
    if (!resolvedPackId || showComingSoon) return;
    fetchPack(resolvedPackId)
      .then((p) => setPack(p as PackSummary))
      .catch((e) => setError(e.message));
  }, [resolvedPackId, showComingSoon]);

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
  const chapters = (pack?.facets?.chapters || []).filter(
    (c) => !subject || c.subject === subject
  );
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
      if (yearEntry?.packId) {
        navigate(`/pack/${yearEntry.packId}?${next.toString()}`);
        return;
      }
    }
    if (key !== "page") next.set("page", "0");
    setSearchParams(next);
  }

  function clearFilters() {
    const next = new URLSearchParams(searchParams);
    ["year", "subject", "chapter", "topic", "difficulty", "q"].forEach((k) => next.delete(k));
    next.set("exam", "NEET");
    next.set("page", "0");
    setSearchParams(next);
  }

  function goToNeet() {
    const next = new URLSearchParams();
    next.set("exam", "NEET");
    navigate(`/bank?${next.toString()}`);
  }

  const totalShown = totalElements;
  const weak = primaryWeakChapter(progress?.weakChapters);
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
    onPackChange: (id: string) => navigate(`/pack/${id}?${searchParams.toString()}`),
    learningInsightText: settings.learningInsightText,
    learningInsightHighlight: settings.learningInsightHighlight,
    weakChapter: weak,
    onApplyWeakChapter: weak
      ? () => {
          const next = new URLSearchParams(searchParams);
          next.set("exam", "NEET");
          next.set("subject", weak.subject);
          next.set("chapter", weak.chapter);
          next.delete("page");
          setSearchParams(next);
        }
      : undefined,
  };

  const activeChips: { key: string; label: string }[] = [];
  if (yearFilter) activeChips.push({ key: "year", label: yearFilter });
  if (subject) activeChips.push({ key: "subject", label: subject });
  if (chapter) activeChips.push({ key: "chapter", label: chapter });
  if (topic) activeChips.push({ key: "topic", label: topic });
  if (difficulty) activeChips.push({ key: "difficulty", label: difficulty });

  if (showComingSoon) {
    return (
      <main className="bank-page px-margin-mobile">
          <ComingSoon
            examName={selectedExam?.name || examFilter}
            description={
              selectedExam?.description ||
              "This exam is on our roadmap and will be available soon."
            }
            onBack={goToNeet}
          />
      </main>
    );
  }

  return (
    <main className="bank-page px-margin-mobile">
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
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-surface-container-high p-lg flex flex-col custom-scrollbar overflow-y-auto">
          <FilterPanel {...filterProps} onClose={() => setFiltersOpen(false)} />
        </div>
      </div>

      <BankSearchSection onOpenFilters={() => setFiltersOpen(true)} />

      {neetAvailable && subjectTiles.length > 0 && !packIdParam && (
        <BankSubjectGrid tiles={subjectTiles} exam={examFilter} />
      )}

      <div className="lg:grid lg:grid-cols-[minmax(240px,280px)_1fr] lg:gap-gutter lg:items-start">
        <aside className="hidden lg:block sticky-below-header max-h-below-header overflow-y-auto custom-scrollbar">
          <FilterPanel {...filterProps} />
        </aside>

      <div className="space-y-gutter min-w-0">
        <div className="space-y-gutter">
        {!neetAvailable && !loading && (
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
                <p className="muted">An administrator must import published NEET manifests from pdf-qa-extractor.</p>
                <p className="muted">Sign in with the admin account, then open Admin to sync data.</p>
              </>
            )}
          </div>
        )}

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-sm mb-md">
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

        {error && <p className="error-text">{error}</p>}
        {loading && neetAvailable && <p className="muted state-msg">Loading questions…</p>}

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
            onNextPage={() => goToPage(page + 1)}
            onPrevPage={() => goToPage(page - 1)}
          />
        )}

        {!loading && questions.length === 0 && resolvedPackId && neetAvailable && (
          <p className="muted state-msg">No questions match these filters.</p>
        )}
        </div>
      </div>
      </div>
    </main>
  );
}
