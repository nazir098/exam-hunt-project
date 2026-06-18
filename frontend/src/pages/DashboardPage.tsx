import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchExams, fetchLeaderboard, fetchPacks } from "../api";
import { useAuth } from "../auth/AuthContext";
import DashboardGuestView from "../components/DashboardGuestView";
import DashboardPerformanceSnapshot from "../components/DashboardPerformanceSnapshot";
import DashboardRecommendations from "../components/DashboardRecommendations";
import DashboardResumeHero from "../components/DashboardResumeHero";
import RevisionQueueCard from "../components/RevisionQueueCard";
import { buildDashboardStats, computeStreakDays } from "../utils/dashboardStats";
import { sessionResumeUrl } from "../utils/practiceHub";
import { usePlatformSettings } from "../settings/PlatformSettingsContext";
import { buildPlatformStats } from "../utils/platformStats";
import {
  BANK_MODE_HINT,
  LEADERBOARD_MODE_HINT,
  PRACTICE_MODE_HINT,
} from "../navigation/modeHints";

const QUICK_ACTIONS = [
  {
    to: "/practice",
    icon: "bolt",
    title: "Practice",
    desc: "Scored adaptive sessions",
    hint: PRACTICE_MODE_HINT,
    primary: true,
  },
  {
    to: "/bank?exam=NEET",
    icon: "menu_book",
    title: "Question Bank",
    desc: "PYQs with solutions",
    hint: BANK_MODE_HINT,
  },
  {
    to: "/analytics",
    icon: "insights",
    title: "Analytics",
    desc: "Trends & heatmaps",
    hint: "Accuracy trends, weak chapters, heatmaps, and AI coaching from your sessions.",
  },
  {
    to: "/leaderboard",
    icon: "emoji_events",
    title: "Leaderboard",
    desc: "Your rank vs peers",
    hint: LEADERBOARD_MODE_HINT,
  },
] as const;

export default function DashboardPage() {
  const { settings } = usePlatformSettings();
  const { user, progress, loading: authLoading } = useAuth();
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

  return (
    <main className="dashboard-page pt-4 lg:pt-8 space-y-lg lg:space-y-xl">
      <DashboardResumeHero
        name={name}
        topTier={topTier}
        session={stats.activeSession}
        packs={packs}
        progress={progress}
      />

      <DashboardPerformanceSnapshot
        accuracy={accuracy}
        questionsSolved={attempts}
        streakDays={streak}
        rankLabel={rankLabel}
        progress={progress}
      />

      <RevisionQueueCard />

      <DashboardRecommendations
        activeSession={stats.activeSession}
        practiceCta={
          stats.activeSession
            ? sessionResumeUrl(stats.activeSession) ?? "/practice"
            : "/practice"
        }
        progress={progress}
      />

      <section className="dashboard-quick-actions" aria-label="Quick actions">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`dashboard-action-card glass-card hover-hint ${"primary" in action && action.primary ? "dashboard-action-card--primary" : ""}`}
            data-tooltip={action.hint}
          >
            <span className="material-symbols-outlined dashboard-action-card__icon">{action.icon}</span>
            <strong>{action.title}</strong>
            <span className="dashboard-action-card__desc">{action.desc}</span>
          </Link>
        ))}
      </section>

      {attempts > 0 && (
        <Link
          to="/analytics"
          className="dashboard-teaser glass-card hover-hint"
          data-tooltip="See accuracy over time, subject breakdowns, practice heatmaps, and session history."
        >
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
          <strong>AI practice coach</strong>
          <p className="muted">
            Hints, wrong-answer breakdowns, weak-chapter analysis, and revision notes — on Practice &amp; Analytics.
          </p>
        </div>
        <Link to="/analytics" className="btn">
          Open AI tools
        </Link>
      </section>
    </main>
  );
}
