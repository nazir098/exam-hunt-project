import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchExams, fetchLeaderboard, fetchPacks } from "../api";
import { useAuth } from "../auth/AuthContext";
import DashboardGuestView from "../components/DashboardGuestView";
import DashboardPerformanceSnapshot from "../components/DashboardPerformanceSnapshot";
import DashboardRecommendations from "../components/DashboardRecommendations";
import { STITCH_ANALYTICS_HERO } from "../design/stitchAssets";
import { buildDashboardStats, computeStreakDays } from "../utils/dashboardStats";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";
import { buildPlatformStats } from "../utils/platformStats";

const QUICK_ACTIONS = [
  { to: "/practice", icon: "bolt", title: "Practice", desc: "Scored adaptive sessions", primary: true },
  { to: "/bank?exam=NEET", icon: "menu_book", title: "Question Bank", desc: "PYQs with solutions" },
  { to: "/analytics", icon: "insights", title: "Analytics", desc: "Trends & heatmaps" },
  { to: "/leaderboard", icon: "emoji_events", title: "Leaderboard", desc: "Your rank vs peers" },
] as const;

export default function DashboardPage() {
  const { settings } = usePlatformSettings();
  const { user, progress, loading: authLoading, refreshProgress } = useAuth();
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof fetchExams>>>([]);
  const [packs, setPacks] = useState<Awaited<ReturnType<typeof fetchPacks>>>([]);

  useEffect(() => {
    Promise.allSettled([fetchExams(), fetchPacks()]).then(([e, p]) => {
      if (e.status === "fulfilled") setCatalog(e.value);
      if (p.status === "fulfilled") setPacks(p.value);
    });
  }, []);

  useEffect(() => {
    if (user) refreshProgress();
  }, [user, refreshProgress]);

  useEffect(() => {
    if (!user) {
      setLeaderboardRank(null);
      return;
    }
    fetchLeaderboard(100, "all")
      .then((data) => setLeaderboardRank(data.you?.rank ?? null))
      .catch(() => setLeaderboardRank(null));
  }, [user?.id, progress?.totalAttempts]);

  const stats = useMemo(() => buildDashboardStats(progress), [progress]);
  const platformStats = useMemo(
    () => buildPlatformStats(catalog, packs, settings),
    [catalog, packs, settings]
  );

  if (authLoading) {
    return (
      <main className="dashboard-page pt-4 lg:pt-8">
        <p className="text-body text-on-surface-variant">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="dashboard-page dashboard-page--guest pt-4 lg:pt-8">
        <DashboardGuestView stats={platformStats} />
      </main>
    );
  }

  const name = user.displayName?.split(" ")[0] || "Scholar";
  const accuracy = progress?.accuracyPercent ?? 0;
  const attempts = progress?.totalAttempts ?? 0;
  const streak = computeStreakDays(stats.sessions);
  const rankLabel =
    leaderboardRank != null ? `#${leaderboardRank}` : attempts > 0 ? "Unranked" : "—";
  const topTier = accuracy >= 80;

  const practiceCta = stats.activeSession?.currentQuestionId
    ? `/practice/${stats.activeSession.id}/${stats.activeSession.currentQuestionId}`
    : "/practice";
  const practiceLabel = stats.activeSession ? "Resume practice" : "Start practice";

  return (
    <main className="dashboard-page pt-4 lg:pt-8 space-y-lg lg:space-y-xl">
      <section className="dashboard-hero glass-card">
        <div className="dashboard-hero__body">
          <span className="dashboard-badge">Welcome back</span>
          <h1 className="dashboard-hero__title">
            {topTier ? (
              <>
                {name}, you&apos;re on fire — <span className="text-primary">top tier</span> accuracy.
              </>
            ) : (
              <>Hi {name}, let&apos;s sharpen your edge today.</>
            )}
          </h1>
          <p className="dashboard-hero__lead">
            Your marks, streak, and rank live here. Pick up a session or drill weak chapters.
          </p>
          <Link to={practiceCta} className="btn primary dashboard-hero__cta-inline">
            <span className="material-symbols-outlined">bolt</span>
            {practiceLabel}
          </Link>
        </div>
        <div className="dashboard-hero__visual dashboard-hero__visual--compact">
          <img alt="" className="dashboard-hero__image" src={STITCH_ANALYTICS_HERO} />
        </div>
      </section>

      <DashboardPerformanceSnapshot
        accuracy={accuracy}
        questionsSolved={attempts}
        streakDays={streak}
        rankLabel={rankLabel}
        progress={progress}
      />

      <DashboardRecommendations
        activeSession={stats.activeSession}
        practiceCta={practiceCta}
        progress={progress}
      />

      <section className="dashboard-quick-actions" aria-label="Quick actions">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`dashboard-action-card glass-card ${"primary" in action && action.primary ? "dashboard-action-card--primary" : ""}`}
          >
            <span className="material-symbols-outlined dashboard-action-card__icon">{action.icon}</span>
            <strong>{action.title}</strong>
            <span className="dashboard-action-card__desc">{action.desc}</span>
          </Link>
        ))}
      </section>

      {attempts > 0 && (
        <Link to="/analytics" className="dashboard-teaser glass-card">
          <div className="dashboard-teaser__icon">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <div className="dashboard-teaser__copy">
            <strong>
              Accuracy trend {stats.trend >= 0 ? "+" : ""}
              {stats.trend}%
            </strong>
            <span>Open Analytics for heatmaps and session history.</span>
          </div>
          <span className="material-symbols-outlined dashboard-teaser__arrow">arrow_forward</span>
        </Link>
      )}

      <section className="dashboard-ai-nudge glass-card">
        <span className="material-symbols-outlined text-primary">psychology</span>
        <div>
          <strong>AI Tutor is launching soon</strong>
          <p className="muted">Get notified when step-by-step AI explanations land on your PYQs.</p>
        </div>
        <Link to="/ai-tutor" className="btn">
          Preview
        </Link>
      </section>
    </main>
  );
}
