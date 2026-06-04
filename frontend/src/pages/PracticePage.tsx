import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  createPracticeSession,
  ExamCatalogEntry,
  fetchExams,
  fetchLeaderboard,
  fetchPacks,
  PackSummary,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import DashboardPerformanceSnapshot from "../components/DashboardPerformanceSnapshot";
import PracticeAdvancedBuilder from "../components/PracticeAdvancedBuilder";
import PracticeGuestLanding from "../components/PracticeGuestLanding";
import {
  activeSession,
  buildRecommendedPractice,
  DAILY_GOAL_QUESTIONS,
  formatPackLabel,
  pickDefaultPack,
  pickPackByYear,
  resolveSubjectName,
  sessionResumeUrl,
  todayQuestionsAnswered,
} from "../utils/practiceHub";
import { buildDashboardStats, computeStreakDays, meaningfulSessions, sessionAccuracy } from "../utils/dashboardStats";

export default function PracticePage() {
  const { user, progress, loading: authLoading, refreshProgress } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [catalog, setCatalog] = useState<ExamCatalogEntry[]>([]);
  const [exam, setExam] = useState("NEET");
  const [packId, setPackId] = useState("");
  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [chapter, setChapter] = useState(searchParams.get("chapter") || "");
  const [adaptive, setAdaptive] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([fetchPacks(), fetchExams()])
      .then(([p, e]) => {
        setPacks(p);
        setCatalog(e);
        const fromUrl = searchParams.get("packId");
        const match = fromUrl && p.some((x) => x.packId === fromUrl) ? fromUrl : pickDefaultPack(p)?.packId || "";
        if (match) setPackId(match);
      })
      .catch((e) => setError(e.message));
  }, [searchParams]);

  useEffect(() => {
    const s = searchParams.get("subject");
    const c = searchParams.get("chapter");
    if (s) setSubject(s);
    if (c) setChapter(c);
  }, [searchParams]);

  useEffect(() => {
    if (user) refreshProgress();
  }, [user, refreshProgress]);

  useEffect(() => {
    if (!user) {
      setLeaderboardRank(null);
      return;
    }
    fetchLeaderboard(100, "weekly")
      .then((d) => setLeaderboardRank(d.you?.rank ?? null))
      .catch(() => setLeaderboardRank(null));
  }, [user?.id, progress?.totalAttempts]);

  const selectedPack = packs.find((p) => p.packId === packId);
  const showGuestLanding = !user && !authLoading;

  const sessions = useMemo(
    () => meaningfulSessions(progress?.recentSessions ?? []),
    [progress?.recentSessions]
  );
  const resume = useMemo(() => activeSession(progress), [progress]);
  const recommended = useMemo(
    () => buildRecommendedPractice(packs, progress),
    [packs, progress]
  );
  const todayDone = useMemo(() => todayQuestionsAnswered(sessions), [sessions]);
  const goalPct = Math.min(100, Math.round((todayDone / DAILY_GOAL_QUESTIONS) * 100));
  const stats = useMemo(() => buildDashboardStats(progress), [progress]);
  const streak = computeStreakDays(stats.sessions);
  const rankLabel =
    leaderboardRank != null ? `#${leaderboardRank}` : (progress?.totalAttempts ?? 0) > 0 ? "Unranked" : "—";

  const startQuick = useCallback(
    async (opts: {
      packId?: string;
      subject?: string;
      chapter?: string;
      adaptive?: boolean;
    }) => {
      if (!user) {
        navigate(`/login?next=${encodeURIComponent("/practice")}`);
        return;
      }
      const pid = opts.packId || packId || pickDefaultPack(packs)?.packId;
      if (!pid) {
        setError("Import NEET packs first (Admin) or check your connection.");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const session = await createPracticeSession({
          exam: "NEET",
          packId: pid,
          subject: opts.subject,
          chapter: opts.chapter,
          adaptive: opts.adaptive ?? true,
        });
        const qId = session.currentQuestionId;
        if (!qId) throw new Error("Session has no questions");
        navigate(`/practice/${session.id}/${qId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start session");
      } finally {
        setBusy(false);
      }
    },
    [user, navigate, packId, packs]
  );

  async function startSession() {
    await startQuick({ packId, subject: subject || undefined, chapter: chapter || undefined, adaptive });
  }

  const defaultPack = pickDefaultPack(packs);
  const pack2025 = pickPackByYear(packs, 2025);

  const quickCards = useMemo(
    () => [
      {
        id: "adaptive",
        icon: "auto_awesome",
        title: "Adaptive Practice",
        subtitle: "Difficulty shifts with every answer",
        featured: true,
        run: () => startQuick({ packId: defaultPack?.packId, adaptive: true }),
      },
      {
        id: "full2025",
        icon: "assignment",
        title: "NEET 2025 Full Test",
        subtitle: pack2025
          ? `${pack2025.questionCount} PYQs · all subjects`
          : "Latest year pack · all subjects",
        run: () => startQuick({ packId: pack2025?.packId ?? defaultPack?.packId, adaptive: false }),
      },
      {
        id: "physics",
        icon: "science",
        title: "Physics Practice",
        subtitle: "Focused session · Physics only",
        run: () =>
          startQuick({
            packId: defaultPack?.packId,
            subject: resolveSubjectName(defaultPack, "Physics"),
            adaptive: true,
          }),
      },
      {
        id: "chemistry",
        icon: "biotech",
        title: "Chemistry Practice",
        subtitle: "Focused session · Chemistry only",
        run: () =>
          startQuick({
            packId: defaultPack?.packId,
            subject: resolveSubjectName(defaultPack, "Chemistry"),
            adaptive: true,
          }),
      },
    ],
    [defaultPack, pack2025, startQuick]
  );

  if (showGuestLanding) {
    return (
      <main className="dashboard-page practice-page practice-page--landing pt-4 lg:pt-6">
        <PracticeGuestLanding
          packs={packs}
          catalog={catalog}
          packId={packId}
          subject={subject}
          adaptive={adaptive}
          onPackId={setPackId}
          onSubject={setSubject}
          onAdaptive={setAdaptive}
        />
        {error && <p className="error-text practice-landing-error">{error}</p>}
      </main>
    );
  }

  const resumeUrl = resume ? sessionResumeUrl(resume) : null;

  return (
    <main className="dashboard-page practice-page practice-page--hub pt-4 lg:pt-6">
      <header className="practice-hub-hero glass-card">
        <div className="practice-hub-hero__text">
          <p className="page-eyebrow">Practice arena</p>
          <h1 className="practice-page-title">Start solving in seconds</h1>
          <p className="practice-page-desc">
            Tap a quick start — marks save on every submit (+4 correct, −1 wrong).
          </p>
        </div>
        <div className="practice-hub-hero__badge" aria-hidden>
          <span className="material-symbols-outlined">bolt</span>
        </div>
      </header>

      {error && !busy && <p className="error-text practice-hub-error">{error}</p>}

      {resume && resumeUrl && (
        <section className="practice-continue glass-card" aria-label="Continue previous session">
          <div className="practice-continue__content">
            <span className="practice-continue__icon material-symbols-outlined">play_circle</span>
            <div>
              <h2 className="practice-section-title">Continue previous session</h2>
              <p className="practice-continue__meta">
                {formatPackLabel(resume.packId)} · Question {resume.currentIndex + 1} of{" "}
                {resume.questionCount} · {resume.totalMarks}/{resume.maxMarks} marks so far
              </p>
            </div>
          </div>
          <Link to={resumeUrl} className="btn primary practice-continue__cta">
            Resume now
          </Link>
        </section>
      )}

      {recommended && (
        <section className="practice-recommended glass-card" aria-label="Recommended practice">
          <p className="practice-recommended__eyebrow">
            <span className="material-symbols-outlined">recommend</span>
            Recommended for you
          </p>
          <h2 className="practice-recommended__title">{recommended.title}</h2>
          <p className="practice-recommended__sub">{recommended.subtitle}</p>
          <button
            type="button"
            className="btn primary btn-block practice-recommended__cta"
            disabled={busy}
            onClick={() =>
              startQuick({
                packId: recommended.packId,
                subject: recommended.subject,
                chapter: recommended.chapter,
                adaptive: recommended.adaptive,
              })
            }
          >
            {busy ? "Starting…" : recommended.cta}
          </button>
        </section>
      )}

      <section className="practice-quick" aria-label="Quick start">
        <div className="practice-section-head">
          <h2 className="practice-section-title">Quick start</h2>
          <span className="practice-section-meta">One tap → first question</span>
        </div>
        <div className="practice-quick-grid">
          {quickCards.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`practice-quick-card${card.featured ? " practice-quick-card--featured" : ""}`}
              disabled={busy || !defaultPack}
              onClick={card.run}
            >
              <span className="material-symbols-outlined practice-quick-card__icon">{card.icon}</span>
              <span className="practice-quick-card__title">{card.title}</span>
              <span className="practice-quick-card__sub">{card.subtitle}</span>
              <span className="practice-quick-card__go">
                Start <span className="material-symbols-outlined">arrow_forward</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="practice-goal glass-card" aria-label="Today's goal">
        <div className="practice-goal__head">
          <div>
            <h2 className="practice-section-title">Today&apos;s goal</h2>
            <p className="practice-goal__sub">
              {todayDone >= DAILY_GOAL_QUESTIONS
                ? "Goal crushed — keep the streak alive."
                : `${DAILY_GOAL_QUESTIONS - todayDone} more to hit your daily target`}
            </p>
          </div>
          <span className="practice-goal__count">
            {todayDone}/{DAILY_GOAL_QUESTIONS}
          </span>
        </div>
        <div className="practice-goal__track">
          <div className="practice-goal__fill" style={{ width: `${goalPct}%` }} />
        </div>
        {todayDone === 0 && (
          <button
            type="button"
            className="btn primary btn-sm practice-goal__btn"
            disabled={busy}
            onClick={() => startQuick({ adaptive: true })}
          >
            Answer your first question today
          </button>
        )}
      </section>

      <DashboardPerformanceSnapshot
        accuracy={progress?.accuracyPercent ?? 0}
        questionsSolved={progress?.totalAttempts ?? 0}
        streakDays={streak}
        rankLabel={rankLabel}
        progress={progress}
      />

      <section className="practice-recent glass-card" aria-label="Recent sessions">
        <div className="practice-section-head">
          <h2 className="practice-section-title">Recent sessions</h2>
          <Link to="/analytics" className="practice-recent__link">
            Analytics
          </Link>
        </div>
        {sessions.length === 0 ? (
          <p className="practice-recent__empty muted">
            No sessions yet — pick a quick start card above to begin.
          </p>
        ) : (
          <ul className="practice-recent-list">
            {sessions.slice(0, 6).map((s) => {
              const url = sessionResumeUrl(s);
              const acc = sessionAccuracy(s);
              return (
                <li key={s.id} className="practice-recent-item">
                  <div className="practice-recent-item__main">
                    <strong>{formatPackLabel(s.packId)}</strong>
                    <span className="practice-recent-item__meta">
                      {s.status} · {acc}% · {s.totalMarks}/{s.maxMarks} marks
                    </span>
                  </div>
                  {url ? (
                    <Link to={url} className="btn btn-sm primary">
                      Resume
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => startQuick({ packId: s.packId, adaptive: true })}
                    >
                      Again
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PracticeAdvancedBuilder
        exam={exam}
        packId={packId}
        subject={subject}
        chapter={chapter}
        adaptive={adaptive}
        packs={packs}
        catalog={catalog}
        selectedPack={selectedPack}
        busy={busy}
        error={error}
        onExam={setExam}
        onPackId={setPackId}
        onSubject={setSubject}
        onChapter={setChapter}
        onAdaptive={setAdaptive}
        onStart={startSession}
      />
    </main>
  );
}
