import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ExamCatalogEntry,
  fetchExams,
  fetchPack,
  fetchPacks,
  fetchQuestions,
  PackSummary,
  QuestionPublic,
  YearCatalogEntry,
} from "../api";
import BankSearchSection from "../components/BankSearchSection";
import ComingSoon from "../components/ComingSoon";
import FilterPanel, { activeFilterCount } from "../components/FilterPanel";
import QuestionCard from "../components/QuestionCard";
import { defaultExamId, findExam } from "../utils/exams";
import { filterQuestionsForPractice } from "../utils/practice";

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

  const [catalog, setCatalog] = useState<ExamCatalogEntry[]>([]);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [pack, setPack] = useState<PackSummary | null>(null);
  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedExam = findExam(catalog, examFilter);
  const neetAvailable = packs.length > 0 || (findExam(catalog, "NEET")?.availableYears ?? 0) > 0;
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
    Promise.all([fetchExams(), fetchPacks()])
      .then(([exams, packList]) => {
        setCatalog(exams);
        setPacks(packList);
      })
      .catch((e) => setError(e.message));
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
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchQuestions(resolvedPackId, {
      subject: subject || undefined,
      chapter: chapter || undefined,
      page,
      size: 60,
    })
      .then((res) => {
        setQuestions(res.content);
        setTotalElements(res.totalElements);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [resolvedPackId, subject, chapter, page, showComingSoon]);

  const displayed = useMemo(
    () =>
      filterQuestionsForPractice(questions, {
        topic: topic || undefined,
        difficulty: difficulty || undefined,
        q: qSearch || undefined,
      }),
    [questions, topic, difficulty, qSearch]
  );

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

  const totalShown = qSearch || topic || difficulty ? displayed.length : totalElements;
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
    filteredPacks: packs,
    neetYears,
    subjects,
    chapters,
    topics,
    onUpdateParam: updateParam,
    onPackChange: (id: string) => navigate(`/pack/${id}?${searchParams.toString()}`),
  };

  const activeChips: { key: string; label: string }[] = [];
  if (yearFilter) activeChips.push({ key: "year", label: yearFilter });
  if (subject) activeChips.push({ key: "subject", label: subject });
  if (chapter) activeChips.push({ key: "chapter", label: chapter });
  if (topic) activeChips.push({ key: "topic", label: topic });
  if (difficulty) activeChips.push({ key: "difficulty", label: difficulty });

  if (showComingSoon) {
    return (
      <main className="bank-page px-margin-mobile pb-8">
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
    <main className="bank-page px-margin-mobile pb-8">
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

      <div className="space-y-gutter">
        <div className="space-y-gutter">
        {!neetAvailable && !loading && (
          <div className="neet-import-hint card">
            <h2>NEET data not loaded yet</h2>
            <p className="muted">
              Import published NEET manifests from pdf-qa-extractor:
            </p>
            <code>POST /api/admin/import/neet</code>
            <p className="muted">or a single year: <code>POST /api/admin/import/folder/2016</code></p>
          </div>
        )}

        {neetYears.some((y) => y.status === "coming_soon") && (
          <section className="neet-roadmap" aria-label="NEET years">
            <p className="neet-roadmap-title">NEET previous years</p>
            <div className="neet-roadmap-grid">
              {neetYears.map((y) =>
                y.status === "available" && y.packId ? (
                  <Link
                    key={y.year}
                    to={`/pack/${y.packId}?exam=NEET&year=${y.year}`}
                    className="neet-year-chip available"
                  >
                    <strong>{y.year}</strong>
                    <span>{y.questionCount} Qs</span>
                  </Link>
                ) : (
                  <span key={y.year} className="neet-year-chip soon" title={y.message || undefined}>
                    <strong>{y.year}</strong>
                    <span>Soon</span>
                  </span>
                )
              )}
            </div>
          </section>
        )}

            <p className="bank-results-count">
              <strong className="text-on-surface">{displayed.length}</strong> questions
              {pack ? ` · NEET ${pack.year}` : ""}
              {filterCount > 0 && <span className="text-primary"> · {filterCount} filters</span>}
            </p>

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

        {!loading && neetAvailable && resolvedPackId && (
          <>
            {displayed.map((q) => (
              <QuestionCard key={q.questionId} question={q} packId={resolvedPackId} />
            ))}
            {displayed.length > 0 && (
              <div className="flex flex-col items-center justify-center py-xxl opacity-50">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                <span className="text-caption tracking-[0.2em] font-bold text-outline">LOADING MORE CHALLENGES</span>
              </div>
            )}
          </>
        )}

        {!loading && displayed.length === 0 && resolvedPackId && neetAvailable && (
          <p className="muted state-msg">No questions match these filters.</p>
        )}

        {resolvedPackId && (
          <div className="flex items-center justify-center gap-md mt-xl">
            <button
              type="button"
              className="glass-card px-md py-sm rounded-lg font-label"
              disabled={page <= 0}
              onClick={() => updateParam("page", String(page - 1))}
            >
              Previous
            </button>
            <span className="muted">Page {page + 1}</span>
            <button
              type="button"
              className="glass-card px-md py-sm rounded-lg font-label"
              disabled={displayed.length < 60}
              onClick={() => updateParam("page", String(page + 1))}
            >
              Next
            </button>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
