import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchWrongAttempts,
  markRevisionPending,
  markRevisionRevised,
  WrongAttemptView,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import WrongAttemptCard from "../components/WrongAttemptCard";
import {
  countWrongTab,
  matchesWrongTab,
  searchWrongAttempts,
  sortWrongAttempts,
  type WrongSort,
  type WrongTab,
} from "../utils/wrongAttemptsUi";

type ModeFilter = "all" | "practice" | "test";
type RevisionFilter = "all" | "pending" | "revised";

const TABS: { id: WrongTab; label: string }[] = [
  { id: "priority", label: "High Priority" },
  { id: "due-today", label: "Due Today" },
  { id: "recent", label: "Recently Wrong" },
  { id: "all", label: "All" },
];

export default function WrongAttemptsPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<WrongAttemptView[]>([]);
  const [mode, setMode] = useState<ModeFilter>(
    (searchParams.get("mode") as ModeFilter) || "all"
  );
  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [chapter, setChapter] = useState(searchParams.get("chapter") || "");
  const [exam] = useState(searchParams.get("exam") || "");
  const [year] = useState(searchParams.get("year") || "");
  const [sessionId, setSessionId] = useState(searchParams.get("sessionId") || "");
  const [revisionFilter, setRevisionFilter] = useState<RevisionFilter>("all");
  const [activeTab, setActiveTab] = useState<WrongTab>("priority");
  const [sort, setSort] = useState<WrongSort>("latest");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchWrongAttempts({
        mode: mode === "all" ? undefined : mode,
        subject: subject || undefined,
        chapter: chapter || undefined,
        exam: exam || undefined,
        year: year ? Number(year) : undefined,
        sessionId: sessionId || undefined,
      });
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load wrong attempts");
    } finally {
      setLoading(false);
    }
  }, [user, mode, subject, chapter, exam, year, sessionId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load();
  }, [user, authLoading, load]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (mode !== "all") params.set("mode", mode);
    if (subject) params.set("subject", subject);
    if (chapter) params.set("chapter", chapter);
    if (exam) params.set("exam", exam);
    if (year) params.set("year", year);
    if (sessionId) params.set("sessionId", sessionId);
    setSearchParams(params, { replace: true });
  }, [mode, subject, chapter, exam, year, sessionId, setSearchParams]);

  const subjects = useMemo(
    () => [...new Set(items.map((i) => i.subject).filter(Boolean))].sort(),
    [items]
  );
  const chapters = useMemo(
    () =>
      [
        ...new Set(
          items.filter((i) => !subject || i.subject === subject).map((i) => i.chapter).filter(Boolean)
        ),
      ].sort(),
    [items, subject]
  );

  const revisionFiltered = useMemo(() => {
    return items.filter((item) => {
      if (revisionFilter === "pending" && item.revised) return false;
      if (revisionFilter === "revised" && !item.revised) return false;
      return true;
    });
  }, [items, revisionFilter]);

  const tabCounts = useMemo(
    () =>
      Object.fromEntries(TABS.map((tab) => [tab.id, countWrongTab(revisionFiltered, tab.id)])) as Record<
        WrongTab,
        number
      >,
    [revisionFiltered]
  );

  const displayed = useMemo(() => {
    const tabbed = revisionFiltered.filter((item) => matchesWrongTab(item, activeTab));
    const searched = searchWrongAttempts(tabbed, search);
    return sortWrongAttempts(searched, sort);
  }, [revisionFiltered, activeTab, search, sort]);

  async function toggleRevised(item: WrongAttemptView) {
    setBusyId(item.questionId);
    try {
      if (item.revised) {
        await markRevisionPending(item.questionId);
      } else {
        await markRevisionRevised(item.questionId);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update revision status");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="dashboard-page wrong-v2-page pt-4 lg:pt-6">
        <p className="muted">Loading wrong attempts…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="dashboard-page wrong-v2-page pt-4 lg:pt-6">
        <div className="wrong-v2-guest glass-card">
          <h1 className="practice-page-title">Wrong attempts</h1>
          <p className="practice-page-desc">
            Review mistakes from practice and tests. Sign in to track revision and explanations.
          </p>
          <div className="wrong-v2-guest__actions">
            <Link to="/register?next=%2Freview%2Fwrong-attempts" className="btn primary">
              Get started
            </Link>
            <Link to="/login?next=%2Freview%2Fwrong-attempts" className="btn">
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page wrong-v2-page pt-4 lg:pt-6">
      <header className="wrong-v2-page__head">
        <h1 className="practice-page-title">Wrong attempts</h1>
        <p className="practice-page-desc">
          Review mistakes from practice and tests. Wrong answers are added to your revision queue automatically.
        </p>
      </header>

      <div className="wrong-v2-toolbar glass-card">
        <div className="wrong-v2-filters">
          <label className="wrong-v2-filter">
            <span>Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as ModeFilter)}>
              <option value="all">Practice + Test</option>
              <option value="practice">Practice only</option>
              <option value="test">Test only</option>
            </select>
          </label>
          <label className="wrong-v2-filter">
            <span>Subject</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="wrong-v2-filter">
            <span>Chapter</span>
            <select value={chapter} onChange={(e) => setChapter(e.target.value)}>
              <option value="">All chapters</option>
              {chapters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="wrong-v2-filter">
            <span>Revision Status</span>
            <select
              value={revisionFilter}
              onChange={(e) => setRevisionFilter(e.target.value as RevisionFilter)}
            >
              <option value="all">All</option>
              <option value="pending">Pending revision</option>
              <option value="revised">Revised</option>
            </select>
          </label>
        </div>
        <label className="wrong-v2-search">
          <span className="material-symbols-outlined" aria-hidden>
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wrong attempts…"
            aria-label="Search wrong attempts"
          />
        </label>
      </div>

      <div className="wrong-v2-tabs-bar">
        <nav className="wrong-v2-tabs" aria-label="Wrong attempt categories">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`wrong-v2-tabs__btn${activeTab === tab.id ? " wrong-v2-tabs__btn--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} ({tabCounts[tab.id]})
            </button>
          ))}
        </nav>
        <label className="wrong-v2-sort">
          <span>Sort by:</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as WrongSort)}>
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="subject">Subject</option>
          </select>
        </label>
      </div>

      {sessionId && (
        <p className="wrong-v2-session-banner">
          Showing mistakes from one session ·{" "}
          <button type="button" onClick={() => setSessionId("")}>
            Clear filter
          </button>
        </p>
      )}

      {error && <p className="error-text">{error}</p>}

      {displayed.length === 0 ? (
        <div className="wrong-v2-empty glass-card">
          <span className="material-symbols-outlined" aria-hidden>
            task_alt
          </span>
          <p>No wrong attempts match these filters.</p>
        </div>
      ) : (
        <ul className="wrong-v2-list">
          {displayed.map((item) => (
            <li key={item.attemptId}>
              <WrongAttemptCard
                item={item}
                busy={busyId === item.questionId}
                onToggleRevised={toggleRevised}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
