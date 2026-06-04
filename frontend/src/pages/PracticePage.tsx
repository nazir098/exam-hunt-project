import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createPracticeSession,
  ExamCatalogEntry,
  fetchExams,
  fetchPacks,
  PackSummary,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import { sessionIdleMinutes } from "../auth/session";

const EXAM_OPTIONS = [
  { id: "NEET", label: "NEET", live: true },
  { id: "JEE_MAIN", label: "JEE Main", live: false },
  { id: "JEE_ADV", label: "JEE Advanced", live: false },
  { id: "UPSC", label: "UPSC", live: false },
  { id: "CAT", label: "CAT", live: false },
];

export default function PracticePage() {
  const { user, progress, loading: authLoading, refreshProgress } = useAuth();
  const navigate = useNavigate();
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [catalog, setCatalog] = useState<ExamCatalogEntry[]>([]);
  const [exam, setExam] = useState("NEET");
  const [packId, setPackId] = useState("");
  const [subject, setSubject] = useState("");
  const [adaptive, setAdaptive] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([fetchPacks(), fetchExams()])
      .then(([p, e]) => {
        setPacks(p);
        setCatalog(e);
        if (p.length) setPackId(p[0].packId);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (user) refreshProgress();
  }, [user, refreshProgress]);

  const selectedPack = packs.find((p) => p.packId === packId);
  const neetLive = catalog.find((c) => c.id === "NEET")?.status === "available";
  const totalMarks = progress?.byPack.reduce((s, p) => s + p.marks, 0) ?? 0;

  async function startSession() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent("/practice")}`);
      return;
    }
    if (exam !== "NEET" || !packId) {
      setError("NEET is the only exam with live practice data right now.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const session = await createPracticeSession({
        exam,
        packId,
        subject: subject || undefined,
        adaptive,
      });
      const qId = session.currentQuestionId;
      if (!qId) throw new Error("Session has no questions");
      navigate(`/practice/${session.id}/${qId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="practice-landing browse-main">
      <section className="practice-hero">
        <span className="practice-hero-icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
          </svg>
        </span>
        <h1>Adaptive Practice</h1>
        <p className="practice-hero-lead">
          Submit your answer before seeing the solution. Marks follow NEET rules: +4 correct, −1 wrong.
          Difficulty adapts as you go.
        </p>
        <div className="practice-features">
          <div className="practice-feature card">
            <span className="practice-feature-icon">◎</span>
            <strong>You answer</strong>
            <span className="muted">Pick 1–4, then validate</span>
          </div>
          <div className="practice-feature card">
            <span className="practice-feature-icon">⚡</span>
            <strong>AI adapts</strong>
            <span className="muted">Harder when you&apos;re on a roll</span>
          </div>
          <div className="practice-feature card">
            <span className="practice-feature-icon">📈</span>
            <strong>You improve</strong>
            <span className="muted">Progress saved to your account</span>
          </div>
        </div>
      </section>

      {user && (
        <section className="practice-stats card" id="progress">
          <h2>Your progress & scores</h2>
          <p className="muted practice-session-note">
            Stay signed in until you log out, or after {sessionIdleMinutes()} minutes of inactivity.
          </p>
          <div className="practice-stats-grid">
            <div>
              <span className="practice-stat-value">{totalMarks}</span>
              <span className="muted">total marks</span>
            </div>
            <div>
              <span className="practice-stat-value">{progress?.accuracyPercent ?? 0}%</span>
              <span className="muted">accuracy</span>
            </div>
            <div>
              <span className="practice-stat-value">{progress?.totalAttempts ?? 0}</span>
              <span className="muted">questions answered</span>
            </div>
            <div>
              <span className="practice-stat-value">{progress?.correctAttempts ?? 0}</span>
              <span className="muted">correct</span>
            </div>
          </div>

          {progress && progress.byPack.length > 0 && (
            <div className="practice-pack-scores">
              <p className="filter-label">By year</p>
              <ul className="practice-pack-list">
                {progress.byPack.map((p) => (
                  <li key={p.packId}>
                    <strong>{p.packId.replace("NEET_", "NEET ")}</strong>
                    <span>
                      {p.marks} marks · {p.correct}/{p.attempts} correct
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {progress && progress.recentSessions.length > 0 && (
            <div className="practice-recent-sessions">
              <p className="filter-label">Recent practice sessions</p>
              <ul className="practice-pack-list">
                {progress.recentSessions.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <strong>
                      {s.packId.replace("NEET_", "NEET ")} · {s.status}
                    </strong>
                    <span>
                      {s.totalMarks}/{s.maxMarks} marks · {s.correctCount}✓ {s.wrongCount}✗
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(progress?.totalAttempts ?? 0) === 0 && (
            <p className="muted">Start a session below — your marks and accuracy will appear here.</p>
          )}
        </section>
      )}

      <section className="practice-config card">
        <h2>Configure your session</h2>
        {!user && !authLoading && (
          <p className="practice-login-hint">
            <Link to="/login?next=/practice">Sign in</Link> to save marks, progress, and question ratings.
          </p>
        )}

        <div className="filter-block">
          <span className="filter-label">Exam *</span>
          <div className="practice-exam-row">
            {EXAM_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={
                  exam === opt.id
                    ? opt.live && neetLive
                      ? "exam-pill active"
                      : "exam-pill active coming-soon-pill"
                    : "exam-pill"
                }
                disabled={!opt.live}
                onClick={() => opt.live && setExam(opt.id)}
              >
                {opt.label}
                {!opt.live && <span className="pill-soon">Soon</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-block">
          <span className="filter-label">Year / pack</span>
          <select value={packId} onChange={(e) => setPackId(e.target.value)}>
            {packs.map((p) => (
              <option key={p.packId} value={p.packId}>
                NEET {p.year} ({p.questionCount} questions)
              </option>
            ))}
          </select>
        </div>

        {selectedPack?.facets?.subjects && (
          <div className="filter-block">
            <span className="filter-label">Subject (optional)</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">All subjects</option>
              {selectedPack.facets.subjects.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.count})
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="practice-adaptive-toggle">
          <input type="checkbox" checked={adaptive} onChange={(e) => setAdaptive(e.target.checked)} />
          Adaptive difficulty (adjusts after each answer)
        </label>

        {error && <p className="error-text">{error}</p>}

        <button type="button" className="btn primary btn-block practice-start" onClick={startSession} disabled={busy}>
          {busy ? "Starting…" : user ? "Start practice session" : "Sign in & start"}
        </button>
        <p className="muted practice-note">20 questions per session · answers validated on the server</p>
      </section>

      <p className="muted practice-browse-link">
        Prefer to browse without scoring? <Link to="/bank?exam=NEET">Open question bank</Link>
      </p>
    </main>
  );
}
