import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  createPracticeSession,
  ExamCatalogEntry,
  fetchExams,
  fetchLeaderboard,
  fetchPacks,
  PackSummary,
  PracticeSessionView,
  type QuestionSetMode,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import DashboardPerformanceSnapshot from "../components/DashboardPerformanceSnapshot";
import PracticeAdvancedBuilder from "../components/PracticeAdvancedBuilder";
import PracticeGuestLanding from "../components/PracticeGuestLanding";
import PracticeRecommendedCard from "../components/PracticeRecommendedCard";
import PracticeWeakAreas from "../components/PracticeWeakAreas";
import ProductModeBanner from "../components/ProductModeBanner";
import {
  activeSession,
  buildRecommendedPractice,
  bankDisplayPacks,
  clampPracticeQuestionCount,
  DAILY_GOAL_QUESTIONS,
  DEFAULT_PRACTICE_QUESTIONS,
  formatPackLabel,
  pickDefaultPack,
  pickPackByYear,
  practicePoolMax,
  resolveSubjectName,
  sessionResumeUrl,
  todayQuestionsAnswered,
} from "../utils/practiceHub";
import {
  bestStreakDays,
  buildDashboardStats,
  computeStreakDays,
  meaningfulSessions,
  questionsThisWeek,
  sessionAccuracy,
} from "../utils/dashboardStats";
import { sessionResultRoute } from "../navigation/modes";

function formatSessionStatusLabel(status: string): string {
  if (status === "ACTIVE") return "Active";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatRecentSessionHeadline(session: PracticeSessionView): string {
  const answered = session.correctCount + session.wrongCount;
  const qPos =
    session.status === "ACTIVE"
      ? `Q${session.currentIndex + 1}/${session.questionCount}`
      : `Q${answered}/${session.questionCount}`;
  return `${formatPackLabel(session.packId)} · ${formatSessionStatusLabel(session.status)} · ${qPos}`;
}

export default function PracticePage() {
  const { user, progress, loading: authLoading, refreshProgress } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [catalog, setCatalog] = useState<ExamCatalogEntry[]>([]);
  const [packId, setPackId] = useState("");
  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [chapter, setChapter] = useState(searchParams.get("chapter") || "");
  const [adaptive, setAdaptive] = useState(true);
  const [questionSet, setQuestionSet] = useState<QuestionSetMode>("pyq");
  const [questionCount, setQuestionCount] = useState(DEFAULT_PRACTICE_QUESTIONS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([fetchPacks(), fetchExams()])
      .then(([p, e]) => {
        setPacks(p);
        setCatalog(e);
        const fromUrl = searchParams.get("packId");
        const match = fromUrl && p.some((x) => x.packId === fromUrl) ? fromUrl : pickDefaultPack(bankDisplayPacks(p))?.packId || "";
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

  const practicePacks = useMemo(() => bankDisplayPacks(packs), [packs]);
  const selectedPack = practicePacks.find((p) => p.packId === packId);
  const poolMax = useMemo(
    () => practicePoolMax(selectedPack, subject || undefined, chapter || undefined, questionSet),
    [selectedPack, subject, chapter, questionSet]
  );
  const sessionSize = useMemo(
    () => clampPracticeQuestionCount(questionCount, poolMax),
    [questionCount, poolMax]
  );

  useEffect(() => {
    setQuestionCount((c) => clampPracticeQuestionCount(c, poolMax));
  }, [poolMax]);

  const showGuestLanding = !user && !authLoading;

  const sessions = useMemo(
    () => meaningfulSessions(progress?.recentSessions ?? []),
    [progress?.recentSessions]
  );
  const resume = useMemo(() => activeSession(progress), [progress]);
  const recommended = useMemo(
    () => buildRecommendedPractice(practicePacks, progress),
    [practicePacks, progress]
  );
  const todayDone = useMemo(() => todayQuestionsAnswered(sessions), [sessions]);
  const goalPct = Math.min(100, Math.round((todayDone / DAILY_GOAL_QUESTIONS) * 100));
  const stats = useMemo(() => buildDashboardStats(progress), [progress]);
  const streak = computeStreakDays(stats.sessions);
  const weekQuestions = questionsThisWeek(stats.sessions);
  const bestStreak = bestStreakDays(stats.sessions);
  const rankLabel =
    leaderboardRank != null ? `#${leaderboardRank}` : (progress?.totalAttempts ?? 0) > 0 ? "Unranked" : "—";

  const startQuick = useCallback(
    async (opts: {
      packId?: string;
      subject?: string;
      chapter?: string;
      adaptive?: boolean;
      questionCount?: number;
      questionSet?: QuestionSetMode;
    }) => {
      if (!user) {
        navigate(`/login?next=${encodeURIComponent("/practice")}`);
        return;
      }
      const pid = opts.packId || packId || pickDefaultPack(practicePacks)?.packId;
      if (!pid) {
        setError("Import NEET packs first (Admin) or check your connection.");
        return;
      }
      const pack = practicePacks.find((p) => p.packId === pid);
      const subj = opts.subject;
      const ch = opts.chapter;
      const setMode = opts.questionSet ?? questionSet;
      const count = clampPracticeQuestionCount(
        opts.questionCount ?? questionCount,
        practicePoolMax(pack, subj, ch, setMode)
      );
      setBusy(true);
      setError("");
      try {
        const session = await createPracticeSession({
          exam: "NEET",
          packId: pid,
          subject: subj,
          chapter: ch,
          adaptive: opts.adaptive ?? true,
          mode: "practice",
          questionCount: count,
          questionSet: setMode,
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
    [user, navigate, packId, practicePacks, questionCount, questionSet]
  );

  async function startSession() {
    await startQuick({ packId, subject: subject || undefined, chapter: chapter || undefined, adaptive });
  }

  const defaultPack = pickDefaultPack(practicePacks);
  const pack2025 = pickPackByYear(practicePacks, 2025);

  const quickCards = useMemo(
    () => [
      {
        id: "adaptive",
        icon: "auto_awesome",
        title: "Adaptive Practice",
        subtitle: `${sessionSize} questions · difficulty adjusts`,
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
      {
        id: "biology",
        icon: "genetics",
        title: "Biology Practice",
        subtitle: "Focused session · Biology only",
        run: () =>
          startQuick({
            packId: defaultPack?.packId,
            subject: resolveSubjectName(defaultPack, "Biology"),
            adaptive: true,
          }),
      },
    ],
    [defaultPack, pack2025, startQuick, sessionSize]
  );

  if (showGuestLanding) {
    return (
      <main className="dashboard-page practice-page practice-page--landing pt-4 lg:pt-6">
        <PracticeGuestLanding
          packs={practicePacks}
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
  const recentSessions = sessions.slice(0, 3);

  return (
    <main className="dashboard-page practice-page practice-page--hub pt-4 lg:pt-6">
      <ProductModeBanner mode="practice" />
      <header className="practice-hub-hero practice-hub-hero--compact glass-card">
        <div className="practice-hub-hero__text">
          <h1 className="practice-page-title">Practice Arena</h1>
          <p className="practice-page-desc">
            Timed scoring sessions — counts toward rank, streak, and daily goal.
          </p>
          <p className="practice-page-mode-links">
            <Link to="/test/create">Prepare Test</Link>
            <span aria-hidden> · </span>
            <Link to="/review/wrong-attempts">Review wrong attempts</Link>
            <span aria-hidden> · </span>
            <Link to="/bank?exam=NEET">Study in Solve Mode</Link>
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
                {resume.questionCount} · {resume.totalMarks}/{resume.maxMarks} marks
              </p>
            </div>
          </div>
          <Link to={resumeUrl} className="btn primary practice-continue__cta">
            Resume now
          </Link>
        </section>
      )}

      <div
        className={`practice-session-row${recommended ? "" : " practice-session-row--solo"}`}
      >
        <PracticeAdvancedBuilder
          packId={packId}
          subject={subject}
          chapter={chapter}
          adaptive={adaptive}
          questionSet={questionSet}
          questionCount={questionCount}
          poolMax={poolMax}
          sessionSize={sessionSize}
          packs={practicePacks}
          selectedPack={selectedPack}
          busy={busy}
          error={error}
          onPackId={setPackId}
          onSubject={(v) => {
            setSubject(v);
            setChapter("");
          }}
          onChapter={setChapter}
          onAdaptive={setAdaptive}
          onQuestionSet={setQuestionSet}
          onQuestionCount={setQuestionCount}
          onStart={startSession}
        />

        {recommended && (
          <PracticeRecommendedCard
            recommended={recommended}
            busy={busy}
            onStart={() =>
              startQuick({
                packId: recommended.packId,
                subject: recommended.subject,
                chapter: recommended.chapter,
                adaptive: recommended.adaptive,
                questionCount: recommended.questionCount,
              })
            }
          />
        )}
      </div>

      <PracticeWeakAreas
        chapters={progress?.weakChapters ?? []}
        defaultPackId={defaultPack?.packId}
        loading={authLoading}
      />

      <section className="practice-quick" aria-label="Quick start">
        <div className="practice-section-head">
          <h2 className="practice-section-title">Quick start</h2>
          <span className="practice-section-meta">{sessionSize} questions per session</span>
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
                : `${DAILY_GOAL_QUESTIONS - todayDone} questions left to complete today's goal`}
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
        statHints={{
          accuracy: "Target 60%",
          questions: `This week: ${weekQuestions}`,
          streak: `Best: ${bestStreak} days`,
          rank: "Weekly rank",
        }}
      />

      <section className="practice-recent glass-card" aria-label="Recent sessions">
        <div className="practice-section-head">
          <h2 className="practice-section-title">Recent sessions</h2>
        </div>
        {recentSessions.length === 0 ? (
          <p className="practice-recent__empty muted">
            No sessions yet — use custom session above or a quick start card.
          </p>
        ) : (
          <>
            <ul className="practice-recent-list">
              {recentSessions.map((s) => {
                const url = sessionResumeUrl(s);
                const resultUrl =
                  s.status === "completed"
                    ? sessionResultRoute(s.mode === "test" ? "test" : "practice", s.id)
                    : null;
                const acc = sessionAccuracy(s);
                return (
                  <li key={s.id} className="practice-recent-item">
                    <div className="practice-recent-item__main">
                      <strong>{formatRecentSessionHeadline(s)}</strong>
                      <span className="practice-recent-item__meta">
                        {s.totalMarks}/{s.maxMarks} marks · {acc}%
                      </span>
                    </div>
                    {url ? (
                      <Link to={url} className="btn btn-sm primary practice-recent-item__cta">
                        Resume
                      </Link>
                    ) : resultUrl ? (
                      <Link to={resultUrl} className="btn btn-sm practice-recent-item__cta">
                        View results
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm practice-recent-item__cta"
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
            {sessions.length > 0 && (
              <Link to="/analytics" className="practice-recent__view-all">
                View all sessions →
              </Link>
            )}
          </>
        )}
      </section>
    </main>
  );
}
