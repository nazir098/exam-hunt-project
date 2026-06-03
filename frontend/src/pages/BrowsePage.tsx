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
import ComingSoon from "../components/ComingSoon";
import FilterPanel, { activeFilterCount } from "../components/FilterPanel";
import QuestionCard from "../components/QuestionCard";
import { defaultExamId, findExam } from "../utils/exams";
import { difficultyLabel } from "../utils/labels";

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
  const view = searchParams.get("view") || "grid";

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
    if (showComingSoon || pathname !== "/" || !resolvedPackId || packIdParam) return;
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

  const displayed = useMemo(() => {
    let list = questions;
    if (topic) list = list.filter((q) => q.topic === topic);
    if (difficulty) list = list.filter((q) => difficultyLabel(q.difficulty) === difficulty);
    if (qSearch) {
      list = list.filter(
        (q) =>
          q.topic?.toLowerCase().includes(qSearch) ||
          q.chapter?.toLowerCase().includes(qSearch) ||
          q.subject?.toLowerCase().includes(qSearch) ||
          q.questionTextPreview?.toLowerCase().includes(qSearch)
      );
    }
    return list;
  }, [questions, topic, difficulty, qSearch]);

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
    navigate(`/?${next.toString()}`);
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
      <div className="browse-shell browse-shell--solo">
        <main className="browse-main">
          <ComingSoon
            examName={selectedExam?.name || examFilter}
            description={
              selectedExam?.description ||
              "This exam is on our roadmap and will be available soon."
            }
            onBack={goToNeet}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="browse-shell">
      <aside className="filter-sidebar" aria-label="Filters">
        <FilterPanel {...filterProps} />
      </aside>

      {filtersOpen && (
        <div className="filter-drawer-backdrop" onClick={() => setFiltersOpen(false)}>
          <aside
            className="filter-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
            aria-label="Filters"
          >
            <FilterPanel {...filterProps} onClose={() => setFiltersOpen(false)} />
          </aside>
        </div>
      )}

      <main className="browse-main">
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

        <div className="browse-toolbar">
          <div className="browse-toolbar-left">
            <p className="browse-showing">
              <strong>{displayed.length}</strong> questions
              {pack ? ` · NEET ${pack.year}` : ""}
            </p>
            <button
              type="button"
              className="mobile-filter-btn"
              onClick={() => setFiltersOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
              </svg>
              Filters
              {filterCount > 0 && <span className="filter-badge">{filterCount}</span>}
            </button>
          </div>
          <div className="view-toggle">
            <button
              type="button"
              className={view === "grid" ? "view-btn active" : "view-btn"}
              onClick={() => updateParam("view", "grid")}
              aria-label="Grid view"
            >
              ⊞
            </button>
            <button
              type="button"
              className={view === "list" ? "view-btn active" : "view-btn"}
              onClick={() => updateParam("view", "list")}
              aria-label="List view"
            >
              ☰
            </button>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="active-filters">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="active-filter-chip"
                onClick={() => updateParam(chip.key, "")}
                aria-label={`Remove ${chip.label} filter`}
              >
                {chip.label}
                <span aria-hidden>×</span>
              </button>
            ))}
            <button type="button" className="active-filter-clear" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}
        {loading && neetAvailable && <p className="muted state-msg">Loading questions…</p>}

        {!loading && neetAvailable && resolvedPackId && (
          <div className={view === "list" ? "q-grid q-grid--list" : "q-grid"}>
            {displayed.map((q) => (
              <QuestionCard key={q.questionId} question={q} packId={resolvedPackId} />
            ))}
          </div>
        )}

        {!loading && displayed.length === 0 && resolvedPackId && neetAvailable && (
          <p className="muted state-msg">No questions match these filters.</p>
        )}

        {resolvedPackId && (
          <div className="pager">
            <button
              type="button"
              className="btn"
              disabled={page <= 0}
              onClick={() => updateParam("page", String(page - 1))}
            >
              Previous
            </button>
            <span className="muted">Page {page + 1}</span>
            <button
              type="button"
              className="btn"
              disabled={displayed.length < 60}
              onClick={() => updateParam("page", String(page + 1))}
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
