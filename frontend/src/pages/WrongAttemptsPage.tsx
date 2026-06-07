import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchWrongAttempts,
  markRevisionPending,
  markRevisionRevised,
  WrongAttemptView,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import PracticeStudyAssistant from "../components/PracticeStudyAssistant";
import { examDisplayName } from "../utils/labels";

type ModeFilter = "all" | "practice" | "test";
type RevisionFilter = "all" | "pending" | "revised";

export default function WrongAttemptsPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<WrongAttemptView[]>([]);
  const [mode, setMode] = useState<ModeFilter>(
    (searchParams.get("mode") as ModeFilter) || "all"
  );
  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [chapter, setChapter] = useState(searchParams.get("chapter") || "");
  const [exam, setExam] = useState(searchParams.get("exam") || "");
  const [year, setYear] = useState(searchParams.get("year") || "");
  const [sessionId, setSessionId] = useState(searchParams.get("sessionId") || "");
  const [revisionFilter, setRevisionFilter] = useState<RevisionFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
      [...new Set(items.filter((i) => !subject || i.subject === subject).map((i) => i.chapter).filter(Boolean))].sort(),
    [items, subject]
  );
  const exams = useMemo(
    () => [...new Set(items.map((i) => i.exam).filter(Boolean))].sort(),
    [items]
  );
  const years = useMemo(
    () => [...new Set(items.map((i) => String(i.year)).filter(Boolean))].sort((a, b) => Number(b) - Number(a)),
    [items]
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (revisionFilter === "pending" && item.revised) return false;
      if (revisionFilter === "revised" && !item.revised) return false;
      return true;
    });
  }, [items, revisionFilter]);

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
      <main className="dashboard-page pt-4">
        <p className="muted">Loading wrong attempts…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="dashboard-page pt-4">
        <p className="muted">
          <Link to="/login?next=/review/wrong-attempts">Sign in</Link> to review wrong attempts.
        </p>
      </main>
    );
  }

  const pendingCount = items.filter((i) => !i.revised).length;

  return (
    <main className="dashboard-page wrong-review-page pt-4 lg:pt-6">
      <header className="wrong-review-page__head">
        <h1 className="practice-page-title">Wrong attempts</h1>
        <p className="practice-page-desc">
          Review mistakes from Practice and Test. Wrong answers are auto-added to your revision queue.
          {pendingCount > 0 && ` ${pendingCount} pending revision.`}
        </p>
      </header>

      <div className="wrong-review-filters glass-card">
        <label>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as ModeFilter)}>
            <option value="all">Practice + Test</option>
            <option value="practice">Practice only</option>
            <option value="test">Test only</option>
          </select>
        </label>
        <label>
          Subject
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chapter
          <select value={chapter} onChange={(e) => setChapter(e.target.value)}>
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Exam
          <select value={exam} onChange={(e) => setExam(e.target.value)}>
            <option value="">All exams</option>
            {exams.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label>
          Year
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label>
          Revision
          <select value={revisionFilter} onChange={(e) => setRevisionFilter(e.target.value as RevisionFilter)}>
            <option value="all">All</option>
            <option value="pending">Pending revision</option>
            <option value="revised">Revised</option>
          </select>
        </label>
      </div>

      {sessionId && (
        <p className="wrong-review-session-filter muted">
          Showing mistakes from session ·{" "}
          <button type="button" className="wrong-review-clear-filter" onClick={() => setSessionId("")}>
            Clear
          </button>
        </p>
      )}

      {error && <p className="error-text">{error}</p>}

      {filtered.length === 0 ? (
        <p className="muted wrong-review-empty">No wrong attempts match these filters.</p>
      ) : (
        <ul className="wrong-review-list">
          {filtered.map((item) => (
            <li key={item.attemptId} className="wrong-review-item glass-card">
              <div className="wrong-review-item__head">
                <strong>
                  {examDisplayName(item.exam, item.year)} {item.year} · Q{item.questionNo}
                </strong>
                <div className="wrong-review-item__badges">
                  <span className={`wrong-review-item__mode wrong-review-item__mode--${item.mode}`}>
                    {item.mode === "test" ? "Test" : "Practice"}
                  </span>
                  <span
                    className={`wrong-review-item__revision${item.revised ? " wrong-review-item__revision--done" : ""}`}
                  >
                    {item.revised ? "Revised" : "Pending revision"}
                  </span>
                </div>
              </div>
              <p className="wrong-review-item__meta">
                {item.subject} · {item.chapter}
              </p>
              <dl className="wrong-review-item__facts">
                <div>
                  <dt>Your answer</dt>
                  <dd>{item.selectedAnswer}</dd>
                </div>
                <div>
                  <dt>Correct</dt>
                  <dd>{item.correctAnswer}</dd>
                </div>
              </dl>

              {expandedId === item.attemptId && (
                <div className="wrong-review-item__explain">
                  {item.hasSolution && item.solutionImageUrl && (
                    <img src={item.solutionImageUrl} alt="Solution" className="wrong-review-item__solution" />
                  )}
                  <PracticeStudyAssistant
                    questionId={item.questionId}
                    selectedAnswer={item.selectedAnswer}
                    submitted
                    correct={false}
                    prominent
                    hasSolution={item.hasSolution}
                    layout="inline"
                  />
                </div>
              )}

              <div className="wrong-review-item__actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setExpandedId(expandedId === item.attemptId ? null : item.attemptId)}
                >
                  {expandedId === item.attemptId ? "Hide explanation" : "Explanation"}
                </button>
                <Link to={`/solve/${item.questionId}`} className="btn btn-sm">
                  Retry question
                </Link>
                <Link
                  to={`/bank?exam=NEET&subject=${encodeURIComponent(item.subject)}&chapter=${encodeURIComponent(item.chapter)}`}
                  className="btn btn-sm"
                >
                  Similar PYQs
                </Link>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busyId === item.questionId}
                  onClick={() => toggleRevised(item)}
                >
                  {item.revised ? "Mark pending" : "Mark as revised"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
