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
import Scorecard from "../components/Scorecard";
import HintTooltip from "../components/HintTooltip";
import { PRACTICE_MODE_HINT } from "../navigation/modeHints";

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
    <main className="practice-page pb-28 lg:pb-10 pt-4 lg:pt-6 space-y-md">
      <header className="practice-page-header">
        <h1 className="practice-page-title">
          Practice
          <HintTooltip text={PRACTICE_MODE_HINT} />
        </h1>
        <p className="practice-page-desc">
          Adaptive NEET sessions — marks save when you submit each answer.
        </p>
      </header>

      {user && <Scorecard progress={progress} showDetails />}

      <section className="practice-config glass-card">
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
        <p className="muted practice-note">
          20 questions per session · submit each answer to record marks
        </p>
      </section>
    </main>
  );
}
